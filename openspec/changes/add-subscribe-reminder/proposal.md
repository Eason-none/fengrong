# Proposal: add-subscribe-reminder

## Why

产品目前没有任何回访钩子，用户"想起来才打开"。2026-07-10 曾决策"提醒不做进产品，由公众号渠道承接"（见 `remove-reminder-entry`），但 2026-07-15 研究证伪了该替代路径：公众号（订阅号）群发只能全员同时同内容、折叠在订阅号消息栏，**无法实现"用户自选时刻的个体提醒"**。用户在完整理解一次性订阅"一次授权=一条额度"机制后，于 2026-07-15 正式推翻原决策：**产品内做小程序订阅消息提醒，公众号仅作宣传阵地**。额度耗尽提醒自然安静的衰减特性与"记忆不追人"红线一致——提醒只追得上仍在使用产品的人。

## What Changes

- 设置弹层重新加入「主动提醒」项：time picker 任意时间、每天重复；正常态显示"每天 HH:MM"，额度耗尽显示"已暂停"（不暴露额度/次数概念），点开轻说明 + 重新开启；关闭提醒删除整条服务端记录
- 授权与攒额度：**唯一弹窗点**在设置开启提醒时（引导勾"总是保持以上选择"）；之后"做完啦 / 存日记"的 tap 中经 `getSetting({withSubscriptions:true})` 确认保证静默后才调 `requestSubscribeMessage` 攒额度，完成时刻绝不被弹窗打断
- 新增云函数 `reminder`（含每 5 分钟定时触发器）+ 云数据库 `reminders` 集合（openid / 提醒时间 / 额度 / last_sent_date），北京时间，last_sent_date 防同日重发
- 订阅消息使用已选定模板：标题「日报提醒」，关键词 日期 + 摘要，模板 ID `5iN18vOutpDx96b5DiVK00lZOF2uSgmXJFwUvviMC9Q`；摘要固定文案「给自己留几分钟」（≤20 字、第二人称、不催不劝、无感叹号、不出现"打卡/坚持"）
- 点击提醒落小程序首页，不预设意图
- 隐私政策文本（NavBar.vue）与小程序后台"用户隐私保护指引"各补一条 openid 收集声明（挂上线前置清单）
- 仅 mp-weixin 端，不做 H5（2026-07-15 决策：H5 停止维护）
- 归档 `remove-reminder-entry`（其代码/文档任务已执行完毕，产品方向被本变更取代）

## Capabilities

### New Capabilities

- `subscribe-reminder`: 订阅消息提醒全链路——授权攒额度（静默守卫）、服务端订阅记录、定时扫描发送、额度自然衰减、暂停/恢复/关闭

### Modified Capabilities

- `settings`: 设置弹层重新包含「主动提醒」项，从占位行为升级为真实配置行为（时间选择 / 已暂停呈现 / 重新开启 / 关闭删记录）

## Impact

- **组件**: `src/components/NavBar.vue`（提醒配置 UI + 隐私政策文本补条目）；"做完啦/存日记"所在的完成流组件（`InstantFlow.vue` / `DailyTaskFlow.vue` / 日记保存处）加静默攒额度钩子
- **新增**: `cloudfunctions/reminder/`（订阅记录写入 + 定时发送，双入口一个函数）、云数据库 `reminders` 集合
- **平台配置**: 云函数定时触发器、订阅消息模板（已选用）、后台隐私保护指引更新
- **文档**: `manual_acceptance_checklist_v2.md` 恢复提醒验收项（按新行为重写）、`product_handoff.md` 上线前清单加回模板 ID 与新增配置项
- **关系**: 取代 `remove-reminder-entry`（2026-07-10 决策正式翻案，归档收编其 settings 两项状态后，本变更再改回三项）
