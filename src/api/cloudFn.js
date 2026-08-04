// 小程序端统一走微信云开发云函数 llmProxy（wx.cloud.callFunction）。
// 真实 key 藏在云函数环境变量里，微信天然鉴权——只有本小程序能调，无需域名/备案/合法域名白名单。
// 仅在 mp-weixin 端被调用；H5 端仍走 VITE_API_PROXY_URL 指向的 HTTP 代理（见各 api 文件的 #ifndef 分支）。
//
// 本模块只在函数体内引用 wx.cloud，模块顶层不触碰 wx，所以被 H5 产物一起打包也无副作用。
//
// 返回 res.result，形如 { statusCode, data }（见 cloudfunctions/llmProxy/index.js），
// 与原 uni.request 的 { res.statusCode, res.data } 同形，调用方解析逻辑不变。
// 云函数在控制台里的实际名字（不是文件名）。改了这里就是改了实际调用的函数。
const FN_NAME = "fengrong"

// 呼吸环境音临时 URL：云存储 ACL 是默认"仅创建者可读写"（免费套餐不可改），客户端直连
// getTempFileURL 被拒——由云函数以管理端权限签发（fileID 收在云函数侧，客户端零参数）。
// 任何失败 resolve null，调用方静默降级为无声引导。
export function getBreathingAudioUrl() {
	return new Promise((resolve) => {
		wx.cloud.callFunction({
			name: FN_NAME,
			data: { target: "breathing-audio" },
			success: (res) => {
				const r = res.result
				if (r?.statusCode !== 200 || !r?.data?.url) {
					console.error("[breathing-audio] 云函数签发失败:", r?.statusCode, r?.data?.error)
					resolve(null)
					return
				}
				resolve(r.data.url)
			},
			fail: (err) => {
				console.error("[breathing-audio] 云函数调用失败:", err && (err.errMsg || err.errmsg))
				resolve(null)
			},
		})
	})
}

// enable_thinking 可选：显式传 false 时透传给云函数→上游（qwen 思考型模型关思考直答）。
// 白名单式逐字段列出，不整包透传——云函数侧同样只认白名单字段（见 llmProxy/index.js）。
export function callLlmCloud({ target, model, messages, enable_thinking }) {
	return new Promise((resolve, reject) => {
		wx.cloud.callFunction({
			name: FN_NAME,
			data: { target, model, messages, ...(enable_thinking !== undefined ? { enable_thinking } : {}) },
			success: (res) => resolve(res.result),
			fail: (err) => reject(new Error(`云函数 ${FN_NAME} 调用失败：${err.errMsg || err.errmsg || err.message}`)),
		})
	})
}
