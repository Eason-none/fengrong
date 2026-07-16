# settings Delta

## MODIFIED Requirements

### Requirement: 设置弹层列表项
设置弹层 SHALL 展示三个列表项（按显示顺序）：「基本信息」、「主动提醒」、「隐私政策」。点击「基本信息」进入基本信息编辑页（见 basic-info-settings spec）；点击「主动提醒」进入提醒配置（时间选择 / 已暂停呈现 / 重新开启 / 关闭，行为详见 subscribe-reminder spec）；点击「隐私政策」行为不变。「主动提醒」项 SHALL 仅在 mp-weixin 端渲染（H5 产物不显示该项）。

#### Scenario: 设置弹层展示三个列表项（mp-weixin）
- **WHEN** 用户在小程序端点击 ⚙ 打开设置弹层
- **THEN** 弹层显示三个列表项：「基本信息」排在最上方，下方依次为「主动提醒」和「隐私政策」

#### Scenario: 点击基本信息
- **WHEN** 用户在设置弹层点击「基本信息」
- **THEN** 关闭设置弹层，打开基本信息编辑页

#### Scenario: 点击主动提醒
- **WHEN** 用户在设置弹层点击「主动提醒」
- **THEN** 进入提醒配置视图，按服务端状态显示未开启 / 每天 HH:MM / 已暂停（详见 subscribe-reminder spec）

#### Scenario: 点击隐私政策（行为不变）
- **WHEN** 用户点击「隐私政策」
- **THEN** 行为与当前一致（弹层内切换为隐私政策文本，文本已含提醒相关的 openid 收集声明）

#### Scenario: H5 端不显示主动提醒
- **WHEN** 用户在 H5 产物中打开设置弹层
- **THEN** 仅显示「基本信息」和「隐私政策」两项
