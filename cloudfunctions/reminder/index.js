// 微信云开发·云函数：主动提醒（单函数双入口，见 openspec design D1）。
//
// 入口一（前端 wx.cloud.callFunction）：event.action = upsert | disable | topup | status
//   openid 一律取自 wxContext，前端不传、不接收、不存储（design D2：openid 全程不出服务端）。
// 入口二（定时触发器，config.json 每 5 分钟）：扫描到点用户并发送订阅消息。
//
// reminders 集合（_id = openid）：
//   reminder_time: "HH:MM"   用户自选的每日提醒时间（北京时间）
//   quota: number            剩余可发条数（一次授权=一条，服务端本地计数，43101 清零自愈，见 D3）
//   last_sent_date: "YYYY-MM-DD"  防同日重发
//   enabled: boolean
//
// 模板字段键名不写死：首次发送时经 getTemplateList 自动解析（date/thing 键从模板内容正则取出，
// 容器实例内缓存）——换模板只需改 TEMPLATE_ID 一处，无需人工核对键名。

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const COLLECTION = 'reminders'

const TEMPLATE_ID = '5iN18vOutpDx96b5DiVK00lZOF2uSgmXJFwUvviMC9Q' // 「日报提醒」：日期 + 摘要
const SUMMARY_TEXT = '给自己留几分钟' // 固定一句轻声（grill 定稿：第二人称、不催不劝、无感叹号）
const LANDING_PAGE = 'pages/index/index' // 落首页，不预设意图
// 体验版联调时在云函数控制台把环境变量 REMINDER_MP_STATE 设为 trial，正式版删掉即可
const MINIPROGRAM_STATE = process.env.REMINDER_MP_STATE || 'formal'
// 额度上限：完成动作可能一天攒多次（做完啦+存日记），封顶一周量，保证"用户不来，提醒最多
// 再响几天就安静"的衰减叙事不被长期囤票破坏
const QUOTA_CAP = 7
const SEND_WINDOW_MINUTES = 5 // 与触发器周期一致

// ---------- 北京时间（云函数时区是 UTC，统一 +8 处理，不做时区适配） ----------

function beijingNow() {
	return new Date(Date.now() + 8 * 3600 * 1000)
}

function beijingToday() {
	const d = beijingNow()
	const m = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	return `${d.getUTCFullYear()}-${m}-${day}`
}

function beijingNowMinutes() {
	const d = beijingNow()
	return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function beijingDateText() {
	const d = beijingNow()
	return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
}

// ---------- 模板字段键名自动解析（容器实例内缓存） ----------

let cachedKeys = null

async function resolveTemplateKeys() {
	if (cachedKeys) return cachedKeys
	const res = await cloud.openapi.subscribeMessage.getTemplateList()
	const tmpl = (res.data || []).find((t) => t.priTmplId === TEMPLATE_ID)
	if (!tmpl) throw new Error(`模板 ${TEMPLATE_ID} 不在已选用列表中`)
	// content 形如 "日期:{{date2.DATA}}\n摘要:{{thing3.DATA}}"
	const dateKey = (tmpl.content.match(/\{\{((?:date|time)\d+)\.DATA\}\}/) || [])[1]
	const thingKey = (tmpl.content.match(/\{\{(thing\d+)\.DATA\}\}/) || [])[1]
	if (!dateKey || !thingKey) throw new Error(`模板字段解析失败：${tmpl.content}`)
	cachedKeys = { dateKey, thingKey }
	return cachedKeys
}

// ---------- 前端入口 ----------

// 集合不存在时自建（-502005），免去控制台手动建集合的部署步骤
async function ensureCollection(err) {
	if (err && err.errCode === -502005) {
		await db.createCollection(COLLECTION)
		return true
	}
	return false
}

async function upsert(openid, time) {
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) {
		return { ok: false, error: 'bad_time' }
	}
	const doc = db.collection(COLLECTION).doc(openid)
	try {
		const existing = await doc.get().catch((e) => {
			if (e.errCode === -502005) throw e
			return null // 文档不存在
		})
		if (existing && existing.data) {
			await doc.update({ data: { reminder_time: time, enabled: true } })
		} else {
			await doc.set({ data: { reminder_time: time, quota: 0, last_sent_date: '', enabled: true } })
		}
	} catch (e) {
		if (await ensureCollection(e)) return upsert(openid, time)
		throw e
	}
	return { ok: true }
}

async function disable(openid) {
	// 关闭即删：整条记录消失，服务端不留痕（spec：数据最小化与关闭即删）
	await db.collection(COLLECTION).doc(openid).remove().catch(() => {})
	return { ok: true }
}

async function topup(openid) {
	const doc = db.collection(COLLECTION).doc(openid)
	const existing = await doc.get().catch(() => null)
	if (!existing || !existing.data || !existing.data.enabled) return { ok: false, error: 'not_enabled' }
	if (existing.data.quota >= QUOTA_CAP) return { ok: true, capped: true }
	await doc.update({ data: { quota: _.inc(1) } })
	return { ok: true }
}

async function status(openid) {
	const existing = await db.collection(COLLECTION).doc(openid).get().catch(() => null)
	if (!existing || !existing.data || !existing.data.enabled) return { enabled: false }
	return {
		enabled: true,
		time: existing.data.reminder_time,
		paused: existing.data.quota <= 0, // 前端只需要"是否已暂停"，不暴露具体额度数
	}
}

// ---------- 定时触发器入口 ----------

async function runTimer() {
	const today = beijingToday()
	const nowMin = beijingNowMinutes()

	let candidates
	try {
		candidates = await db
			.collection(COLLECTION)
			.where({ enabled: true, quota: _.gt(0) })
			.limit(1000)
			.get()
	} catch (e) {
		if (e.errCode === -502005) return { sent: 0 } // 集合还没诞生（无人开过提醒）
		throw e
	}

	let sent = 0
	for (const rec of candidates.data) {
		if (rec.last_sent_date === today) continue
		const [h, m] = String(rec.reminder_time || '').split(':').map(Number)
		if (Number.isNaN(h) || Number.isNaN(m)) continue
		// (now-5, now] 窗口命中，跨午夜用模 1440 差值处理
		const diff = (nowMin - (h * 60 + m) + 1440) % 1440
		if (diff >= SEND_WINDOW_MINUTES) continue

		try {
			const { dateKey, thingKey } = await resolveTemplateKeys()
			await cloud.openapi.subscribeMessage.send({
				touser: rec._id,
				templateId: TEMPLATE_ID,
				page: LANDING_PAGE,
				miniprogramState: MINIPROGRAM_STATE,
				data: {
					[dateKey]: { value: beijingDateText() },
					[thingKey]: { value: SUMMARY_TEXT },
				},
			})
			await db
				.collection(COLLECTION)
				.doc(rec._id)
				.update({ data: { quota: _.inc(-1), last_sent_date: today } })
			sent++
		} catch (e) {
			const code = e.errCode || e.errcode
			if (code === 43101) {
				// 用户拒收或微信侧额度不足：本地计数清零自愈（design D3），不记 last_sent_date
				await db.collection(COLLECTION).doc(rec._id).update({ data: { quota: 0 } })
			} else {
				// 其他错误不减额度不记日期，当日窗口已过则次日自然重试；留日志可查
				console.error(`send failed for ${rec._id}:`, code, e.errMsg || e.message)
			}
		}
	}
	return { sent }
}

// ---------- 主入口 ----------

exports.main = async (event) => {
	// 定时触发器的 event 带 TriggerName / Type: 'Timer'，无 action
	if (event && (event.TriggerName || event.Type === 'Timer')) {
		return runTimer()
	}
	const { OPENID } = cloud.getWXContext()
	if (!OPENID) return { ok: false, error: 'no_openid' }
	switch (event.action) {
		case 'upsert':
			return upsert(OPENID, event.time)
		case 'disable':
			return disable(OPENID)
		case 'topup':
			return topup(OPENID)
		case 'status':
			return status(OPENID)
		default:
			return { ok: false, error: 'unknown_action' }
	}
}
