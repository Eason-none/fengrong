## 1. 跨机型显示（图鉴网格 + 功能图标）

- [x] 1.1 CollectionGrid.vue：容器改 `justify-content: space-between`，卡片 `width: 48%` + `margin-bottom: 20rpx`，删除 `calc(50% - 10rpx)` 与 `gap`（D1）
- [x] 1.2 NavBar.vue：`⚙` 字符替换为 CSS 绘制的设置图标（与 .dn-book 线条风格一致，容器盒尺寸不变）（D2）
- [x] 1.3 ChatView.vue：`📷` 字符替换为 CSS 绘制的线条相机图标（容器盒尺寸不变，验证与输入框布局无错位）（D2）

## 2. 呼吸引导（退出 + 节奏点 + 海浪声）

- [x] 2.1 BreathingGuide.vue：started 后显示「先不做了」退出入口，点击走 skip() 同一清理通道（specs/breathing-entry「引导进行中可退出」）（D3）
- [x] 2.2 BreathingGuide.vue：节奏点改 CSS `animation-delay` 声明式点亮，移除 startBeats 的 setTimeout 链；确认阶段切换重置与跳过清理仍满足既有「呼吸阶段节奏可感」requirement（D4）
- [x] 2.3 BreathingGuide.vue：音频源改云存储 + storage 缓存（含过期提前量），任一失败静默降级；挂载时预取 URL（specs/breathing-entry「呼吸环境音」）（D5）
- [x] 2.3.1 临时 URL 改由云函数签发（2026-07-16 真机排障：存储 ACL"仅创建者可读写"挡客户端直连且免费套餐不可改；fileID 移入 llmProxy，客户端零参数调 target='breathing-audio'）
- [x] 2.4 删除 `src/static/audio/breathing-sea.mp3`，构建确认主包体积下降约 1.2MB

## 3. 分享卡照片画质

- [x] 3.1 imageCompress.js：`THUMB_MAX_EDGE` 900→1200；mp 端 quality 60→80；H5 分支 toDataURL 0.7→0.8 同步（specs/diary-trace）（D6）
- [x] 3.2 更新 imageCompress.js 头部注释的参数演进说明（300→900→1200 的因由链）

## 3.5 分享卡旧照片回放（真机验收中新报 bug，2026-07-16）

- [x] 3.5.1 ShareCardPreview.vue：照片临时文件名固定（sharecard_photo_N.png）导致微信按路径缓存回放上次分享的旧位图——改为会话戳唯一命名 + 打开时清扫历史残留

## 4. 主对话延迟

- [x] 4.1 qwen.js：streamMainChatWeixin 请求加 `enable_thinking: false`（D7）
- [x] 4.2 llmProxy/index.js：入参白名单式透传额外参数（enable_thinking），不盲传整个 event（D7）

## 5. 体验增强（图鉴 emoji + 叶子标语）

- [x] 5.1 ~~emoji 字符字段~~ 已废弃回滚（真机二验：字符方案全机型不可靠）→ 改为 Twemoji PNG 内置 static/icons/tujian/（D8 修订）
- [x] 5.2 CollectionGrid.vue：右上角状态点替换为 Twemoji 徽标 image（locked 降透明/active 彩色/completed 金色圆底）；标题旁 emoji 回滚（D8 修订）
- [x] 5.2.1 人文空间图鉴徽标定稿：🏛 古典建筑（2026-07-16 用户拍板，PNG 已替换）
- [x] 5.3 index.vue：叶子标语改 onShow 随机选句，blowWind 轮换与动效不动（D9）
- [x] 5.4 scripts/verify-library.mjs：若校验图鉴字段结构，补 emoji 字段断言

## 6. 部署与真机验收

- [x] 6.1 mp3 上传微信云存储，fileID 回填常量（2026-07-16 用户已上传，fileID 已回填 BreathingGuide.vue）
- [x] 6.2 llmProxy 云函数重新部署（2026-07-16 用户经 dist 副本+cloudfunctionRoot 部署成功；automator 模拟器实测 breathing-audio 签发+播放 PLAYING、enable_thinking 已随包生效）
- [x] 6.3 真机压测照片档位：卡面照片近看无块状伪影（2026-07-16 用户真机确认 OK；单张体积未逐张实测，10MB 预算按 ~25 张预估，超限有既有静默裁图兜底）
- [x] 6.4 真机回归（2026-07-16 小米真机：呼吸退出/节奏点/海浪声/徽标/分享照片/对话首响与质感全过；**华为双列网格+两个绘制图标未回收**——用户无华为机，登记 manual_acceptance_checklist 待华为内测用户下轮反馈确认）
