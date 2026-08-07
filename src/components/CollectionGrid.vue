<template>
  <view class="collection-grid">
    <view
      v-for="(entry, index) in collections"
      :key="entry.collection.id"
      class="collection-grid__card"
      :class="`collection-grid__card--${entry.state.status}`"
      :style="{ animationDelay: Math.min(index, 7) * 45 + 'ms' }"
      hover-class="u-press"
      @tap="$emit('select', entry.collection.id)"
    >
      <view>
        <view class="collection-grid__top">
          <view class="collection-grid__type">{{ typeLabel(entry.collection.collection_type) }}</view>
          <!-- 主题徽标（2026-07-16 定稿）：Twemoji PNG 内置图片，替代原状态点——emoji 字符在
               华为等机型字体缺字/走形，图片是唯一跨机型一致的 emoji 呈现。状态三档：
               locked 降透明（mp 端 filter:grayscale 不可靠不用）、active 彩色、completed 金色圆底。 -->
          <view class="collection-grid__badge" :class="`collection-grid__badge--${entry.state.status}`">
            <image class="collection-grid__badge-img" :src="`/static/icons/tujian/${entry.collection.id}.png`" mode="aspectFit" />
          </view>
        </view>
        <view class="collection-grid__name">{{ entry.collection.name }}</view>
        <!-- 锁定卡也显示简介（降透明预览）：看不到里面是什么，用户没有理由点开 -->
        <view class="collection-grid__intro" :class="{ 'collection-grid__intro--locked': entry.state.status === 'locked' }">{{ entry.collection.intro }}</view>
      </view>
      <view>
        <view
          v-if="entry.state.status === 'completed'"
          class="collection-grid__status collection-grid__status--done"
          hover-class="u-press"
          @tap.stop="$emit('reviewTap', entry.collection.id)"
        >
          ✦ 已点亮  回顾 →
        </view>
        <view v-else-if="entry.state.status === 'active'" class="collection-grid__status collection-grid__status--active">进行中</view>
        <view v-else class="collection-grid__status">未激活 · 轻点看看</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getAllCollections } from '@/content/library.js'
import { getCollectionState } from '@/state/collectionMachine.js'

const TYPE_LABELS = { perception: '感知', event: '事件' }

// defer-review-to-first-view：completed 即有回顾入口（快照在首次点开时才生成），
// 卡片不再需要区分"快照是否已存在"。
function loadCollections() {
  return getAllCollections().map((collection) => ({
    collection,
    state: getCollectionState(collection.id),
  }))
}

export default {
  name: 'CollectionGrid',
  emits: ['select', 'reviewTap'],
  data() {
    return {
      collections: loadCollections(),
    }
  },
  methods: {
    typeLabel(type) {
      return TYPE_LABELS[type] ?? type
    },
    refresh() {
      this.collections = loadCollections()
    },
  },
}
</script>

<style>
/* 双列不用 flex gap、卡宽不用 calc(%±rpx)：华为/鸿蒙内核对两者支持不稳，
   calc 失效后卡片塌成内容宽的单列（2026-07-16 内测反馈①）。
   48% + space-between 的列距（~4%）与原 20rpx 视觉无差。 */
.collection-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 24rpx;
  width: 100%;
  box-sizing: border-box;
}

/* 状态权重与产品意图一致：
   locked   = 还没贴进册子的空位，退回纸面（无卡无影）
   active   = 贴上去的标本卡，绿色标记
   completed= 烫金的一页，全 app 唯一的金色时刻 */
.collection-grid__card {
  width: 48%;
  margin-bottom: 20rpx;
  min-height: 276rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  border: 1rpx solid var(--c-border-s);
  background: var(--c-card);
  box-shadow: var(--sh-card);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: rise-in 0.32s var(--ease-out) both;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

@media (prefers-reduced-motion: reduce) {
  .collection-grid__card {
    animation: fade-in 0.2s ease both;
  }
}

.collection-grid__card--locked {
  background: transparent;
  box-shadow: none;
  border: 1rpx solid var(--c-border);
}

.collection-grid__card--completed {
  border: 2rpx solid rgba(205, 145, 48, 0.45);
  background: var(--c-accent-soft);
}

.collection-grid__card--active {
  border: 1rpx solid rgba(18, 71, 3, 0.3);
}

.collection-grid__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.collection-grid__type {
  font-size: 22rpx;
  color: var(--c-subtle);
  letter-spacing: 0.12em;
}

.collection-grid__badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.collection-grid__badge-img {
  width: 36rpx;
  height: 36rpx;
}

.collection-grid__badge--locked {
  opacity: 0.4;
}

/* 点亮=金色圆底（用户定稿：不加金环），金只属于完成时刻的既有语义 */
.collection-grid__badge--completed {
  background: var(--c-accent);
}

.collection-grid__badge--completed .collection-grid__badge-img {
  width: 30rpx;
  height: 30rpx;
}

.collection-grid__name {
  font-size: 30rpx;
  color: var(--c-ink);
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 12rpx;
}

.collection-grid__card--locked .collection-grid__name {
  color: var(--c-subtle);
  font-weight: 400;
}

.collection-grid__intro {
  font-size: 22rpx;
  color: var(--c-subtle);
  line-height: 1.65;
}

/* 锁定卡简介：降透明的预览——暗示里面有内容，又不抢激活卡的焦点 */
.collection-grid__intro--locked {
  opacity: 0.65;
}

/* 烫金底上的灰绿小字会发灰，换更深的中性色保证对比 */
.collection-grid__card--completed .collection-grid__intro,
.collection-grid__card--completed .collection-grid__type {
  color: var(--c-muted);
}

.collection-grid__status {
  font-size: 24rpx;
  color: var(--c-subtle);
  margin-top: 20rpx;
}

.collection-grid__status--active {
  color: var(--c-primary);
  font-weight: 500;
}

.collection-grid__status--done {
  color: var(--c-accent-ink);
  font-weight: 500;
}
</style>
