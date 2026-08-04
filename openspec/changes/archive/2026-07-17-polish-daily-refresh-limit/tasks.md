## 1. 文案定稿（Gate 0）

- [x] 1.1 疲惫态关怀文案 + 两个出口按钮文案定稿，过 Gate 0（content_principles.md），语气为接纳+邀请（"可以"而非"快去"）
- [x] 1.2 池子见底态文案定稿，过 Gate 0；不得使用"没找到想做的"类推断语气，与疲惫态文案区分

## 2. DailyCard 组件改造

- [x] 2.1 计数语义改造：`claim()` 中将 `refreshCount` 归零（连续空手计数）
- [x] 2.2 见底分支：`doRefresh()` 中 `next.length === 0` 时置 `poolExhausted = true`，不递增计数、保留当前批
- [x] 2.3 渲染三态（优先级：见底态 > 疲惫态 > "换一批"按钮）：见底态为纯文案；疲惫态为关怀文案 + "丰容探索"/"记幸福小事"两个轻出口
- [x] 2.4 新增 emit：`go-explore`、`open-three-good-things`

## 3. index 页承接

- [x] 3.1 `go-explore`：关闭日推卡片后 `uni.switchTab('/pages/explore/explore')`
- [x] 3.2 `open-three-good-things`：关闭日推卡片后调用现有 `openThreeGoodThings()`（复用会话续用/新建机制，不新建逻辑）

## 4. 验收

- [x] 4.1 真机走查 spec 全场景：空手 3 次进疲惫态；领取重置计数；每批都领可换到见底；见底不扣计数且文案区分；见底优先于疲惫态；两个出口跳转正常；重开卡片计数归零（用户确认验收通过）
- [x] 4.2 更新 `manual_acceptance_checklist_v2.md` 对应条目
- [x] 4.3 归档时同步更新 `product_handoff.md` §5.1.1"刷新次数限制"一节（计数语义、见底态、软引导）
