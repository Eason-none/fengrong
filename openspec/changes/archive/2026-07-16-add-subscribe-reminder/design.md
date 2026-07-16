# Design: add-subscribe-reminder

## Context

产品数据至今全部本地存储，唯一服务端组件是云函数 `llmProxy`（无状态代理）。本变更引入**第一个有状态服务端**：云数据库 `reminders` 集合 + 带定时触发器的云函数。微信一次性订阅消息的机制约束（一次授权=一条额度、授权调用必须锚定用户 tap、勾"总是保持"后调用保证静默）是整个设计的出发点，详见 proposal。

前端调云函数已有成熟模式（`src/api/cloudFn.js`，仅 mp-weixin 端走 `wx.cloud.callFunction`），本变更沿用。

## Goals / Non-Goals

**Goals:**

- 用户自选时间的每日提醒，全链路（授权→存储→定时发送→衰减→暂停/恢复/关闭）
- 完成时刻零打扰：静默攒额度有守卫，绝不弹窗
- 服务端数据最小化：openid / 提醒时间 / 额度 / last_sent_date 四个字段，关闭即删

**Non-Goals:**

- 多提醒时段、按时段变化的文案、语料池轮换（首版固定一句）
- H5 端（2026-07-15 起停止维护）
- 长期订阅、公众号联动、任何运营侧群发
- 额度概念的用户教育（UI 不出现"额度/次数"字样）

## Decisions

### D1. 单云函数双入口，而非两个函数

`cloudfunctions/reminder/` 一个函数处理两类调用：前端 `callFunction`（action: `upsert` 开启/改时间、`disable` 关闭、`topup` 攒额度、`status` 查状态）与定时触发器入口（event 无 action，按 `event.TriggerName` 识别）。省一份部署配置，逻辑共享同一数据访问层。

### D2. openid 全程不出服务端

云函数内取 `wxContext.OPENID` 作为记录主键，前端不接触、不存储 openid——隐私声明可以写得最小（"开启提醒时在服务端保存你的微信标识与提醒时间"）。

### D3. 额度计数以服务端本地为准，43101 兜底

微信不提供"剩余额度查询"接口，唯一反馈是发送时 errcode 43101（用户拒收/额度不足）。因此：前端 `requestSubscribeMessage` 返回 `accept` 后调 `topup` 使额度 +1；发送成功额度 -1；**收到 43101 时额度直接清零**（本地计数与微信侧失同步的自愈机制）。其他发送错误不减额度、不记 last_sent_date，当日窗口已过则自然次日重试。

**额度封顶 7（实施期补充）**：完成动作一天可能攒多次（做完啦 + 存日记），不封顶会让重度用户囤下数月的票，破坏"用户不来、提醒几天内自然安静"的衰减叙事。封顶一周量即最长安静缓冲 7 天。

### D4. 静默攒额度的守卫条件

"做完啦 / 存日记" tap 回调中同步执行：

```
getSetting({withSubscriptions: true})
  → subscriptionsSetting.mainSwitch === true
  且 itemSettings[TMPL_ID] === 'accept'      // 用户勾过"总是保持"且选的是允许
  ⇒ 才调 requestSubscribeMessage（保证静默），成功后异步 topup
  否则 ⇒ 什么都不做
```

注意 `itemSettings[TMPL_ID] === 'reject'`（勾了"总是保持"但选了拒收）同样静默，但结果是 reject——守卫用 `=== 'accept'` 一并排除。

### D5. reject 锁死态的恢复路径

用户若勾"总是保持"+拒收，之后 `requestSubscribeMessage` 永远静默返回 reject，**弹窗再也不会出现**。设置页"重新开启"检测到此态时，不能只是重调 API，需提示引导：右上角 ⋯ → 设置 → 订阅消息 中手动允许。这是唯一需要向用户解释微信设置的场景，文案保持轻声。

### D6. 定时扫描与发送窗口

触发器 cron 每 5 分钟；扫描条件：`enabled == true && quota > 0 && last_sent_date != 今天(北京时间)` 且 `reminder_time`（"HH:MM"）折算分钟数落在 `(now-5, now]` 窗口。发送成功后同事务更新 `quota -1, last_sent_date = 今天`。时间全按北京时间（云函数默认 UTC，代码内 +8 处理），不做时区适配。

### D7. 消息内容与落地

- 模板：「日报提醒」（日期 + 摘要），ID `5iN18vOutpDx96b5DiVK00lZOF2uSgmXJFwUvviMC9Q`
- 字段键名（`date01`/`thing02` 之类）**由云函数自动解析**（实施期改进）：首次发送时调 `getTemplateList`，从模板 content 正则提取 date/thing 键并在容器实例内缓存——免人工核对，换模板只改 TEMPLATE_ID 一处（config.json permissions 需含 `subscribeMessage.getTemplateList`）
- 摘要固定文案：「记得留一些时间探索世界哦~」（2026-07-16 用户定稿）；日期填当天
- `page: 'pages/index/index'`，`miniprogramState` 按环境（体验版 trial / 正式 formal）

### D8. 设置页状态来源

打开"主动提醒"配置页时调 `status` 查询服务端记录（enabled / 时间 / 额度是否为 0），据此渲染"每天 HH:MM"或"已暂停"。不做本地缓存镜像——提醒状态的唯一事实源在服务端，避免双源漂移。

## Risks / Trade-offs

- **[43101 之外的失败静默丢失当日提醒]** → 接受：提醒是轻承诺，次日窗口自愈；云函数日志留痕可查
- **[个人主体 openapi 权限]** `cloud.openapi.subscribeMessage.send` 需在 `config.json` 声明 permissions → 实现期首个验证点，与字段键名核对同批做
- **[模板被微信下架/字段变更]** → 模板 ID 与字段键名收在云函数配置常量一处，换模板只改一处
- **[额度本地计数与微信侧漂移]** → D3 的 43101 清零自愈；漂移期间最坏表现是"以为有票实际没有"，一次失败后归零，用户感知只是提醒停了（与耗尽同态）
- **[定时触发器空转成本]** 无人开提醒也每 5 分钟跑一次 → 288 次/天调用量级，费用可忽略，不做动态开关

## Migration Plan

纯新增，无迁移。回滚 = 删除设置入口 + 停用触发器（服务端记录可保留或清空，无下游依赖）。上线前置项（挂清单）：云数据库建集合、云函数部署 + 触发器、后台隐私保护指引补 openid 条目。

## Open Questions

（无——模板字段键名与 openapi 权限声明属实现期验证项，不阻塞设计。）
