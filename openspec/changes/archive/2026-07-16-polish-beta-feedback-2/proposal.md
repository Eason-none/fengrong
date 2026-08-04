# polish-beta-feedback-2：第二轮内测反馈修复批

## Why

第二轮内测反馈暴露了一批跨机型兼容与体验问题：华为机型上图鉴网格塌成单列、功能图标（⚙/📷）依赖系统字体渲染缺字或走形、呼吸引导误入后无法退出（被锁约 38 秒）、海浪声在真机上加载失败、分享卡照片仍有可见压缩痕迹、AI 回复等待过长（10~15s）。另有三项已拍板的体验增强：图鉴主题 emoji、叶子标语每次进页随机、（心情系统与社交空间两项反馈明确挂起，不在本批范围）。

## What Changes

- **图鉴网格跨机型双列**：`CollectionGrid` 布局去掉 `calc(50% - 10rpx)` 与 flex `gap`（华为/鸿蒙内核兼容性差），改为不依赖 calc/gap 的双列实现。
- **功能图标去 emoji 化**：NavBar 的 `⚙`（U+2699 文本字形）与 ChatView 的 `📷`（部分机型缺字形）改为 CSS/SVG 绘制，与手记册线条书图标同风格；不再有任何功能图标依赖系统 emoji 字体。
- **呼吸引导可退出**：引导进行中保留一个低调退出入口（"先不做了"），复用既有 skip 清理通道（定时器 + 音频一并收尾）。
- **呼吸节奏点匀速**：点亮由 setTimeout 链改为 CSS `animation-delay` 声明式驱动，不再受主线程卡顿影响。
- **海浪声迁云存储**：1.2MB mp3 移出主包，改为微信云存储 + `getTempFileURL`（结果缓存）；加载失败维持静默降级原则。主包体积随之瘦身约 1.2MB。
- **分享卡照片画质提档**：压缩参数由长边 900px / JPEG q60 提至约长边 1200px / q80（最终档位真机压测定）；存量旧照片无原图可回升，保持原样。
- **主对话延迟削减**：qwen 请求加 `enable_thinking: false`（llmProxy 云函数透传额外参数），模型保持 qwen3.7-plus 不换；deepseek 摘要链路不动。预期首响从 10~15s 降至 3~5s。
- **图鉴主题 emoji**：每本图鉴在 `content/library.js` 增加 emoji 字段（仅从第一代 Unicode 安全集选取，如 🍔🍃），展示在卡片标题旁；状态 pip 保留不动。
- **叶子标语进页随机**：由"每日固定种子句"改为每次首页 onShow 随机选一句；点叶子刮风轮换机制不变。

仅 mp-weixin 端（H5 已停维护，2026-07-15 起新功能不做 H5 适配）。

## Capabilities

### New Capabilities

（无——本批全部是既有能力的修复与参数调整。）

### Modified Capabilities

- `breathing-entry`：新增"引导进行中可退出"requirement；"呼吸环境音"requirement 的音频来源由"打包内置 static/audio/breathing-sea.mp3"改为"微信云存储（临时 URL，结果缓存）"。
- `diary-trace`：照片压缩 requirement 的参数由"长边约 900px、单张目标 ≤200KB"改为"长边约 1200px、JPEG 约 q80、单张目标 ≤450KB"（分享卡照片区消除可见压缩痕迹）。

> 依赖说明：以上两个 capability 的现行文本来自尚未归档的 `polish-beta-feedback` 变更 delta。本变更的 delta 以其归档后的 spec 状态为基线，**归档顺序须为 polish-beta-feedback 在前、本变更在后**。

其余各项（网格布局、图标绘制方式、节奏点驱动方式、enable_thinking、图鉴 emoji、叶子标语随机）不改变任何 spec 级行为承诺，属实现层与内容层调整，细节见 design.md。

## Impact

- **前端组件**：`CollectionGrid.vue`（布局）、`NavBar.vue`（⚙→绘制图标）、`ChatView.vue`（📷→绘制图标）、`BreathingGuide.vue`（退出入口 + 节奏点 + 音频源）、`pages/index/index.vue`（叶子标语随机）。
- **工具层**：`utils/imageCompress.js`（压缩参数提档，两端共用注意 H5 分支同步改常量）。
- **API 层**：`api/qwen.js`（请求体加 enable_thinking:false）、`cloudfunctions/llmProxy/index.js`（透传额外请求参数——当前只转发 model/messages，需扩展）。
- **内容**：`content/library.js`（8 本图鉴各加 emoji 字段）。
- **资源与部署**：`static/audio/breathing-sea.mp3` 移出主包；mp3 需手动上传微信云存储一次（部署步骤，写入 tasks）；llmProxy 云函数需重新部署。
- **存储预算**：照片单张 ~150KB→~400KB，10MB 本地预算容量从约 60 张降到约 25 张；接受（分享卡画质优先，超限时既有"静默裁图"降级仍兜底）。
- **不受影响**：deepseek 摘要链路、提醒系统、H5 端（不维护）、分享卡绘制与导出逻辑本身。
