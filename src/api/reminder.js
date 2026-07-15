// 主动提醒的云函数封装（cloudfunctions/reminder，控制台部署名 reminder）。
// 仅 mp-weixin 端使用；模块顶层不触碰 wx，被 H5 产物打包无副作用（同 cloudFn.js 约定）。
// openid 全程在服务端（云函数 wxContext），这里的调用不传也不接收任何用户标识。

const FN_NAME = 'reminder'

// 与云函数 TEMPLATE_ID、后台选用的「日报提醒」模板一致；getSetting 守卫与
// requestSubscribeMessage 都以它为键。
export const REMINDER_TEMPLATE_ID = '5iN18vOutpDx96b5DiVK00lZOF2uSgmXJFwUvviMC9Q'

function call(data) {
	return new Promise((resolve, reject) => {
		wx.cloud.callFunction({
			name: FN_NAME,
			data,
			success: (res) => resolve(res.result),
			fail: (err) => reject(new Error(`云函数 ${FN_NAME} 调用失败：${err.errMsg || err.message}`)),
		})
	})
}

export function upsertReminder(time) {
	return call({ action: 'upsert', time })
}

export function disableReminder() {
	return call({ action: 'disable' })
}

export function topupReminder() {
	return call({ action: 'topup' })
}

export function getReminderStatus() {
	return call({ action: 'status' })
}

// 查询本模板的订阅授权态，返回三态：
//   'silent-accept'  勾过"总是保持"且允许——此时 requestSubscribeMessage 保证静默（design D4）
//   'silent-reject'  勾过"总是保持"但拒收——弹窗永不再出现，只能引导去微信订阅消息设置（design D5）
//   'ask'            尚未保持选择——调用会弹窗
export function getSubscribeState() {
	return new Promise((resolve) => {
		wx.getSetting({
			withSubscriptions: true,
			success: (res) => {
				const sub = res.subscriptionsSetting || {}
				if (sub.mainSwitch === false) return resolve('silent-reject')
				const item = (sub.itemSettings || {})[REMINDER_TEMPLATE_ID]
				if (item === 'accept') return resolve('silent-accept')
				if (item === 'reject' || item === 'ban') return resolve('silent-reject')
				resolve('ask')
			},
			fail: () => resolve('ask'),
		})
	})
}

// 请求一次订阅授权（=攒一条额度的资格）。必须在用户 tap 的同步调用链里执行。
// 返回 true 表示本模板此次为 accept。
export function requestSubscribe() {
	return new Promise((resolve) => {
		wx.requestSubscribeMessage({
			tmplIds: [REMINDER_TEMPLATE_ID],
			success: (res) => resolve(res[REMINDER_TEMPLATE_ID] === 'accept'),
			fail: () => resolve(false),
		})
	})
}
