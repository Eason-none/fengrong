# 人类丰容指北 · 给生活做点丰容

> 城市里的生活太久没有新东西进来，真实感知的能力在流失——刷不完的手机不是堕落，是环境贫乏。这个产品做的事，是每天往你的生活里放一件小事：**不用坚持，不用做好，感受一下，就够了。**

「丰容」（enrichment）借自动物学：动物在贫乏的环境里会刻板踱步、咬栏杆，动物园的解法不是责怪它不自律，而是往它的世界里放进新的刺激。这个产品把同一件事搬给人类——**不修理人，改造环境。**

## 功能

- **每日任务 + 即时觉察**：一个内容池（每日任务 77 条）按场景与状态分发的小事，低门槛、随时可中断、零沉没成本
- **呼吸引导**：进入「丰容状态」的到场仪式
- **图鉴收集**：探索生活、收集觉察的收集系统
- **手记本**：日记、三件好事、心情记录，安静替用户收着这些时刻
- **重逢与回顾**：过去的觉察会以「重逢」的形式再次回到面前
- **分享卡**：把一次觉察做成一张卡片分享出去
- **AI 见证式回应**：Qwen / DeepSeek 在服务端持钥，客户端不持有真实 key
- **订阅消息提醒 + 天气定位**：提醒「记得留一些时间探索世界哦~」

## 设计原则

丰盈 · 活泼 · 不催促。不设绩效、不打卡、没有 streak、从不提醒你落后——把「做了多少」换成了「某个普通时刻是否因此真实了一点」。详见 [PRODUCT.md](./PRODUCT.md)。

## 技术栈

- **uni-app（Vue 3 + Vite）**，构建目标以微信小程序为主（H5 亦可构建）
- **状态机驱动的状态层**：`src/state/*.js` 各管一块业务状态
- **LLM 反向代理，三种形态任选**：
  - 本地开发：`scripts/api-proxy.js`（Node，读取 `.env.local`）
  - 微信云函数：`cloudfunctions/llmProxy`
  - Supabase Edge Functions：`supabase/functions/qwen-proxy`、`deepseek-proxy`
- **微信云函数定时提醒**：`cloudfunctions/reminder`（订阅消息）
- **Supabase**：分析事件表（匿名只写不读，见 `supabase/events_table.sql`）

## 目录结构

```text
src/                 # uni-app 前端（页面 / 组件 / 状态机 / API 封装）
cloudfunctions/      # 微信云函数（llmProxy、reminder）
supabase/            # Supabase：Edge Functions 代理 + 事件表 DDL
scripts/             # 本地 LLM 代理 + 状态机验证脚本
openspec/            # 行为规格与变更归档（openspec/specs 是行为权威）
docs/                # 归档文档
content_library_draft_v1.json   # 图鉴内容库草稿（运营历史档案，代码读取）
```

## 快速开始

```bash
npm install
```

创建 `.env.local`（真实 key 只在这里，不提交）：

```dotenv
# LLM 代理（不带 VITE_ 前缀，只被 scripts/api-proxy.js 读取，不会打进客户端产物）
QWEN_BASE_URL=https://.../compatible-mode/v1
QWEN_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://...
DEEPSEEK_API_KEY=sk-...

# 客户端变量（VITE_ 前缀；注意会打进客户端产物，不要放密钥）
VITE_WEATHER_API_KEY=...
VITE_WEATHER_HOST=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

启动本地 LLM 代理，然后跑前端：

```bash
npm run proxy            # 本地代理 http://localhost:5555
npm run dev:mp-weixin    # 微信小程序：微信开发者工具导入 dist/dev/mp-weixin
npm run dev:h5           # 或直接在浏览器跑 H5
```

构建：

```bash
npm run build:mp-weixin  # 产物在 dist/build/mp-weixin
```

## 部署

- **LLM 代理**：三种形态任选其一，真实 key 一律存服务端（云函数环境变量 / Supabase Secrets），客户端只请求代理地址
- **提醒**：`cloudfunctions/reminder` 部署为微信云函数，定时器每 5 分钟扫描并发送订阅消息（需 `subscribeMessage` 权限，见其 `config.json`）
- **指标**：在 Supabase Dashboard 执行 `supabase/events_table.sql` 建表（RLS：匿名只写不读，分析走 service role）

## 验证脚本

`scripts/verify-*.mjs` 覆盖各状态机与流程的本地验收（collection、diaryNotebook、shareCard、analytics、storage 等），`node` 直接运行即可。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| `openspec/specs/` | 14 个能力的行为规格（SHALL 级），功能行为的唯一权威 |
| `product_handoff.md` | 产品叙事、决策语境、已实现功能清单 |
| `content_principles.md` / `event_collection_principles.md` | 内容库写作规范（Gate 0 / Gate 1） |
| `manual_acceptance_checklist_v2.md` | 人工验收细则 |
| `metrics.md` | 指标口径与反指标清单 |
| `PRODUCT.md` | 品牌人格与视觉设计原则 |
| `docs/archive/spec_v1.md` | 首版实现 spec（已归档，仅作章节号回溯，勿按其实现） |

## 安全

- 真实 API key 只存在于 `.env.local` 与服务端环境变量 / Secrets，客户端产物不持有
- `.env*`、`临时/`、`node_modules/`、`dist/`、`.codegraph/` 已在 `.gitignore` 排除
- `src/manifest.json` 中的微信 appid 属于公开信息（小程序包内本就可见）
