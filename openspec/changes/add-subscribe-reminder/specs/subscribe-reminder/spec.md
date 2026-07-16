# subscribe-reminder Delta

## ADDED Requirements

### Requirement: 提醒开启与授权
用户 SHALL 能在设置弹层「主动提醒」中选择时间（双列选择器：时 × 5 分钟档——颗粒度与发送侧 5 分钟扫描窗口对齐，避免"9:16 设定却 9:20 送达"的落差感）并开启每日提醒。开启动作的 tap 回调中 SHALL 同步调用 `requestSubscribeMessage`（模板「日报提醒」），这是全产品**唯一**允许出现订阅授权弹窗的位置；界面文案 SHALL 引导用户勾选"总是保持以上选择"。授权返回 `accept` 后 SHALL 调用云函数写入订阅记录并使额度 +1。

#### Scenario: 首次开启提醒
- **WHEN** 用户在设置中选择 21:00 并点击开启
- **THEN** 弹出微信订阅授权窗；用户允许后，服务端记录 `{openid, reminder_time: "21:00", quota: 1, enabled: true}`，界面显示「主动提醒 · 每天 21:00」

#### Scenario: 用户在授权弹窗中拒绝
- **WHEN** 授权弹窗返回 `reject`
- **THEN** 不写入服务端记录，界面保持未开启状态，不出现任何挽留文案

### Requirement: 静默攒额度
在「做完啦」与「存日记」的 tap 回调中，系统 SHALL 先经 `getSetting({withSubscriptions: true})` 检查：仅当 `mainSwitch === true` 且该模板 `itemSettings === 'accept'`（保证静默）且服务端存在 enabled 记录时，才调用 `requestSubscribeMessage` 并在返回 `accept` 后异步使额度 +1。整个过程 SHALL 无任何可见 UI；条件不满足时 SHALL 什么都不做——完成时刻绝不被弹窗打断。

#### Scenario: 已勾"总是保持"的用户完成一条丰容
- **WHEN** 用户点击「做完啦」且 getSetting 显示该模板为静默 accept 态
- **THEN** 静默攒得 1 条额度，完成一拍照常进行，用户无感知

#### Scenario: 未勾"总是保持"的用户完成一条丰容
- **WHEN** 用户点击「做完啦」但 getSetting 显示会弹窗
- **THEN** 不调用 requestSubscribeMessage，无弹窗，完成一拍照常进行

### Requirement: 定时发送
云函数定时触发器 SHALL 每 5 分钟扫描 `reminders` 集合，对满足 `enabled && quota > 0 && last_sent_date ≠ 今天（北京时间）` 且 `reminder_time` 落在 `(now-5min, now]` 窗口的记录发送订阅消息：日期字段填当天、摘要字段填固定文案「给自己留几分钟」、跳转页为小程序首页。发送成功 SHALL 使 `quota -1` 并记 `last_sent_date = 今天`。

#### Scenario: 到点发送
- **WHEN** 北京时间 21:03 触发器运行，某记录 reminder_time=21:00、quota=3、今天未发过
- **THEN** 该用户收到服务通知「日报提醒 / 日期：今天 / 摘要：给自己留几分钟」，记录变为 quota=2、last_sent_date=今天

#### Scenario: 同日不重发
- **WHEN** 某记录今天已发送过（last_sent_date = 今天）
- **THEN** 后续任何扫描窗口都不再向该用户发送

#### Scenario: 微信返回 43101（拒收/额度不足）
- **WHEN** 发送返回 errcode 43101
- **THEN** 该记录 quota 置 0（与微信侧失同步的自愈），不记 last_sent_date

#### Scenario: 其他发送错误
- **WHEN** 发送返回 43101 之外的错误
- **THEN** 不减额度、不记 last_sent_date，当日窗口已过则次日窗口自然重试

### Requirement: 额度耗尽与恢复
额度耗尽后提醒自然停止（衰减即特性）。设置弹层 SHALL 将该状态呈现为「主动提醒 · 已暂停」，点开显示一句轻说明与"重新开启"入口；重新开启的 tap 允许再次弹出授权窗。界面任何位置 SHALL NOT 出现"额度/次数/N 次"等机制字样。若检测到模板处于静默 reject 锁死态（勾了"总是保持"且拒收，弹窗永不再出现），SHALL 以轻声文案引导用户到 右上角 ⋯ → 设置 → 订阅消息 手动允许。

#### Scenario: 耗尽后进设置
- **WHEN** quota=0 且 enabled=true 的用户打开设置弹层
- **THEN** 显示「主动提醒 · 已暂停」；点开后一句轻说明 + 重新开启按钮，无任何次数信息

#### Scenario: 重新开启
- **WHEN** 用户在已暂停态点击重新开启且授权返回 accept
- **THEN** 额度 +1，状态回到「每天 HH:MM」

#### Scenario: reject 锁死态
- **WHEN** 用户点击重新开启但 getSetting 显示该模板为静默 reject
- **THEN** 不调用授权接口，显示引导文案：到微信的订阅消息设置中允许「日报提醒」

### Requirement: 数据最小化与关闭即删
服务端 SHALL 仅存储 openid、reminder_time、quota、last_sent_date、enabled 五个字段；openid 由云函数从 wxContext 获取，SHALL NOT 返回给前端或存入本地。用户关闭提醒时 SHALL 删除整条服务端记录。隐私政策文本与小程序后台"用户隐私保护指引" SHALL 包含开启提醒时收集微信标识（openid）与提醒时间的声明。

#### Scenario: 关闭提醒
- **WHEN** 用户在设置中关闭主动提醒
- **THEN** 云函数删除该 openid 的整条记录，界面回到未开启状态

#### Scenario: 隐私声明
- **WHEN** 用户查看隐私政策
- **THEN** 能看到"开启主动提醒时，我们在服务端保存你的微信标识与提醒时间，关闭提醒即删除"的如实描述

### Requirement: 平台边界
提醒全链路 SHALL 仅在 mp-weixin 端提供；相关代码不做 H5 适配（2026-07-15 决策：H5 停止维护）。点击提醒消息 SHALL 落在小程序首页，无任何特殊承接状态。

#### Scenario: 点击提醒消息
- **WHEN** 用户点击服务通知中的提醒
- **THEN** 打开小程序首页，与日常打开无异
