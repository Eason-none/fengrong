# Tasks: add-subscribe-reminder

## 1. 前置核对与旧变更收编

- [x] 1.1 归档 `remove-reminder-entry`（其 3.1 验收按"mp-weixin 弹层两项"现状确认，H5 项因停止维护作废），使 settings spec 落到两项基线（已归档为 2026-07-15-remove-reminder-entry）
- [x] 1.2 ~~小程序后台核对模板字段键名~~ 实施改进：云函数经 `getTemplateList` **自动解析**字段键名（正则提取 date/thing 键，容器内缓存），免人工核对；模板 ID 常量已写入（design D7 已同步）
- [ ] 1.3 验证个人主体云调用 `cloud.openapi.subscribeMessage.send` 权限（config.json permissions 已声明；**待部署后云端测试一次发送**）

## 2. 云函数与数据层

- [x] 2.1 ~~控制台手建集合~~ 实施改进：云函数遇 -502005 **自动建集合**（ensureCollection）；客户端从不直连数据库，云函数天然绕过权限规则，无需控制台配置
- [x] 2.2 `cloudfunctions/reminder/`：前端入口 action `upsert` / `disable`（删除整条记录）/ `topup`（封顶 7，见 design D3 补充）/ `status`，openid 取自 wxContext、不返回前端
- [x] 2.3 同函数定时触发器入口：每 5 分钟扫描（enabled && quota>0 && 今日未发 && 时间落窗，模 1440 处理跨午夜），发送订阅消息，成功 quota-1 并记 last_sent_date；43101 清零额度；其他错误不减不记（北京时间 +8 处理）
- [x] 2.4 config.json 定时触发器已写（cron `0 */5 * * * * *`）；2026-07-15 用户经开发者工具"上传并部署：云端安装依赖"+"上传触发器"部署成功（体验版联调记得设环境变量 REMINDER_MP_STATE=trial）

## 3. 前端：设置里的主动提醒

- [x] 3.1 `NavBar.vue` 设置弹层新增「主动提醒」项（仅 mp-weixin 渲染，`#ifdef MP-WEIXIN`），打开弹层即查 `status`，右侧显示 空 / 每天 HH:MM / 已暂停
- [x] 3.2 提醒配置视图：time picker 选时间 + 开启 tap（requestSubscribeMessage 留在 tap 同步链，界面小字引导勾"总是保持"）→ accept 后 upsert + topup
- [x] 3.3 已暂停态：一句轻说明（"提醒暂停了，点一下就能续上"）+ 重新开启（允许弹窗）；reject 锁死态引导文案（⋯ → 设置 → 订阅消息），已开启非暂停态不受锁死态遮挡
- [x] 3.4 关闭提醒：调 `disable` 删除服务端记录，界面回未开启态

## 4. 前端：静默攒额度钩子

- [x] 4.1 `src/utils/silentTopup.js`：守卫态提前缓存（refreshSubscribeState，NavBar mounted 打底）+ tap 内同步判缓存再调 requestSubscribeMessage（异步 gap 会触发 iOS gesture fail，故不能 tap 内现查 getSetting）+ 异步 topup，全程无 UI
- [x] 4.2 挂到四个完成 tap：DailyTaskFlow.markDone / InstantFlow.markDone（swapPhase 守卫后）/ CollectionDetail.markDone / ChatView.done（"说完了"，覆盖三件幸福小事与日记类对话），完成一拍不受影响
- [x] 4.3 （2026-07-16 用户拍板"来过就续"）追加四个高频进入 tap：index.openThreeGoodThings（幸福小事入口）/ DailyCard.claim（领取）/ BreathingGuide.start（我准备好了）/ index.startInstant（现在就来一件）；同日文案定稿「记得留一些时间探索世界哦~」（云函数 SUMMARY_TEXT，**需重新部署云函数生效**）

## 5. 隐私与文档同步

- [x] 5.1 `NavBar.vue` 隐私政策文本新增第五条"主动提醒"（openid+提醒时间、关闭即删、不开启不收集），原五/六顺延为六/七
- [ ] 5.2 小程序后台"用户隐私保护指引"补 openid 收集声明——**用户后台操作**，已挂 product_handoff 上线清单
- [x] 5.3 `manual_acceptance_checklist_v2.md` §6 恢复为三项 + 新增 6.4~6.8 提醒验收项；`product_handoff.md` 上线清单第 9 条加回主动提醒三项（含翻案记录）

## 6. 端到端验证（真机）

- [ ] 6.1 开启提醒 → 云数据库出现记录 → 到点收到服务通知 → 点击落首页
- [ ] 6.2 做完一条丰容（已勾"总是保持"）→ 无任何弹窗 → 数据库 quota +1
- [ ] 6.3 额度耗尽后设置显示"已暂停"→ 重新开启恢复；关闭提醒 → 数据库记录消失
