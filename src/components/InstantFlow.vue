<template>
  <!-- 卡片/邀请两步共用一个根节点（virtualHost 让它在 mp 端直接作为 .page 的 flex 子项，
       与原先内联在页面里的布局行为一致）；聊天步是全屏 ChatView -->
  <view v-if="step !== 'chat'" class="push-flow" :class="step === 'card' ? 'push-flow--fill' : 'push-flow--center'">
    <!-- 心情小窗（add-instant-mood-fit）：可选一步，跳过与心情同层同权重；
         选择只存本组件 data，不落 storage、不进 analytics、卡片步之后无任何回显 -->
    <template v-if="step === 'mood'">
      <view class="mood-step">
        <view class="mood-step__q">你现在的心情是怎样的？</view>
        <view class="mood-step__chips">
          <view class="mood-step__chip" hover-class="u-press" @tap="chooseMood('down')">沮丧</view>
          <view class="mood-step__chip" hover-class="u-press" @tap="chooseMood('restless')">烦躁</view>
          <view class="mood-step__chip" hover-class="u-press" @tap="chooseMood('bored')">无聊</view>
          <view class="mood-step__chip" hover-class="u-press" @tap="chooseMood('energetic')">活力</view>
        </view>
        <view class="mood-step__chip mood-step__chip--wide" hover-class="u-press" @tap="chooseMood(null)">
          都不是，随便来一件
        </view>
        <view class="push-flow__back-link" hover-class="u-press" @tap="close">← 返回</view>
      </view>
    </template>

    <template v-else-if="step === 'card'">
      <view class="push-flow__stage">
        <!-- 胶带与卡片是兄弟节点：换卡时胶带先撕、卡片跟着翻走，各自独立动 -->
        <view
          v-if="task"
          class="push-flow__cardwrap"
          :class="{
            'push-flow__cardwrap--leaving': swapPhase === 'leaving',
            'push-flow__cardwrap--entering': swapPhase === 'entering',
          }"
        >
          <view class="push-flow__card push-flow__card--pinned">
            <view class="push-flow__card-title">{{ task.title }}</view>
            <view class="push-flow__card-time">{{ task.time }}</view>
            <view class="push-flow__card-instructions">{{ task.instructions }}</view>
          </view>
          <view class="push-flow__tape"></view>
        </view>
        <view v-else class="push-flow__card-empty">今天的都做过了，歇一歇也很好。</view>
      </view>

      <view class="push-flow__hint" v-if="exhausted">如果没有想做的可以深呼吸，喝点水，发发呆</view>

      <view class="push-flow__actions" v-if="task">
        <view
          class="push-flow__btn"
          :class="{ 'push-flow__btn--disabled': exhausted }"
          hover-class="u-press"
          @tap="refresh"
        >
          换一个
        </view>
      </view>

      <view v-if="task" class="push-flow__done-btn" hover-class="u-press" @tap="markDone">做完啦</view>
      <!-- 沮丧/烦躁的呼吸去向：卡内安静链接（2026-07-17 真机验收"二段式有打断感"，D6 降级方案） -->
      <view
        v-if="task && (mood === 'down' || mood === 'restless')"
        class="push-flow__back-link mood-breathe-link"
        hover-class="u-press"
        @tap="breathe"
      >
        或者，先静一下
      </view>
      <view class="push-flow__back-link" hover-class="u-press" @tap="close">← 返回</view>
    </template>

    <template v-else>
      <CompletionBeat v-if="!beatDone" @done="beatDone = true" />
      <template v-else>
        <FirstTimeHint
          hint-key="chat-invite"
          text="这里聊到的话、拍下的照片，都会留进你的手记。说得越具体、带上照片，之后的回忆和图鉴回顾就越详实。跳过也没关系，之后点开这件完成的小事还能补聊。"
        />
        <view class="ritual-seal">✦</view>
        <view class="push-flow__invite-text">{{ inviteText }}</view>
        <view class="push-flow__actions">
          <view class="push-flow__btn push-flow__btn--primary" hover-class="u-press" @tap="startChat">聊聊</view>
          <view class="push-flow__btn" hover-class="u-press" @tap="close">跳过</view>
        </view>
      </template>
    </template>
  </view>

  <ChatView
    v-else
    :conversation-id="conversationId"
    :content-title="task.title"
    :instructions="task.instructions"
    :content-hook="task.hook"
    :previous-summary="null"
    @close="close"
  />
</template>

<script>
// 现在就来一件（instant-task）：即时抽取流程，mood → card → invite → chat 四步。
// mood 步可跳过（跳过 = 与无此步时行为完全一致），选了心情才在抽取上叠心情软优先
// （add-instant-mood-fit）。原内联在 index.vue（god component 拆分，2026-07-12）；
// 状态机与数据层调用整体搬入，页面只负责挂载/卸载与收尾（归档、刷新入口、呼吸直通）。
import ChatView from '@/components/ChatView.vue'
import CompletionBeat from '@/components/CompletionBeat.vue'
import FirstTimeHint from '@/components/FirstTimeHint.vue'
import { getUncompletedTasks, saveCompletedTask, getTodayCompleted } from '@/state/dailyTaskPool.js'
import { getDailyTaskCandidates } from '@/content/library.js'
import { getBasicInfo } from '@/state/basicInfo.js'
import { inferMomentScenes, preferMomentCandidates, preferMoodCandidates } from '@/state/momentInference.js'
import { createCompletionEvent, COMPLETION_INVITE_TEXT } from '@/state/completionEvent.js'
import { createConversation, getConversationByCompletionEventId } from '@/state/conversation.js'
import { maybeSilentTopup } from '@/utils/silentTopup.js'

export default {
  name: 'InstantFlow',
  components: { ChatView, CompletionBeat, FirstTimeHint },
  // mp-weixin：去掉组件自身的包裹节点，让 .push-flow--fill/--center 的 flex:1
  // 直接相对页面容器生效（与拆分前内联时的布局完全一致）
  options: { virtualHost: true },
  props: {
    // 当日卡片已取的天气文本（软优先的天气亲和用），没有就整层跳过，不发请求
    weatherText: { type: String, default: null },
  },
  emits: ['completed', 'close', 'breathe'],
  data() {
    return {
      step: 'mood', // 'mood' | 'card' | 'invite' | 'chat'
      // 心情只活在本次流程的组件 data 里：关闭即弃，无预选、无回显、无持久化、无上报
      mood: null, // null | 'down' | 'restless' | 'bored' | 'energetic'
      shownIds: [], // 本次流程内已展示过的条目 id——"换一个"不回头（关闭即弃）
      task: null,
      refreshCount: 0,
      exhausted: false,
      swapPhase: null, // null | 'leaving'(撕胶带+卡片翻走) | 'entering'(新胶带按上+新卡落定)
      completionEventId: null,
      conversationId: null,
      beatDone: false, // completion-beat：invite步骤里，先落一拍确认再露出聊聊邀请
      inviteText: COMPLETION_INVITE_TEXT,
    }
  },
  methods: {
    // mood 步一律直接抽卡；跳过（mood=null）= 与本变更前行为完全一致。
    // 沮丧/烦躁的呼吸去向在任务卡内以链接呈现（不再二段式分岔）。
    chooseMood(mood) {
      this.mood = mood
      this.enterCard()
    },
    enterCard() {
      this.task = this.pickTask()
      this.step = 'card'
    },
    // 先静一下：交给页面打开既有呼吸覆盖层（"静一下"同一通道），本流程关闭且不留任何记录
    breathe() {
      this.$emit('breathe')
    },
    // 抽一条，排除已领取、今日已完成、以及本次流程内已展示过的（"换一个"不回头）：
    // 时刻推断先缩小场景（深夜只出 home 等），交集/候选为空即回落档案标签，永不因推断空手；
    // 候选内先按时刻软优先排序，再叠心情软优先在外层（用户显式说出的信号 > 系统推断的信号）。
    // 「活力」跳过时刻收窄直接用档案标签——推断偏就地（深夜=home 等），会把真出门条目
    // 挡在候选窗外，软优先在排序层压不过获取层过滤（2026-07-17 真机验收修订）。
    pickTask() {
      const excludeIds = [
        ...getUncompletedTasks().map((t) => t.id),
        ...getTodayCompleted().map((t) => t.id),
        ...this.shownIds,
      ]
      const profileTags = getBasicInfo().scene_tags || []
      const now = new Date()
      const momentTags = this.mood === 'energetic' ? null : inferMomentScenes(now, profileTags)
      let candidates = getDailyTaskCandidates(momentTags ?? profileTags, excludeIds, 12)
      if (!candidates.length && momentTags) {
        candidates = getDailyTaskCandidates(profileTags, excludeIds, 12)
      }
      if (!candidates.length) return null
      const picked = preferMoodCandidates(preferMomentCandidates(candidates, now, this.weatherText), this.mood)[0]
      this.shownIds.push(picked.id)
      return picked
    },
    // "换一个"最多3次；第4次点击不再换，露出关怀小字——沿用旧推送层"把限制说成关心"的立场。
    // 换卡 = 撕胶带四拍编排：撕胶带(0-420ms) → 卡片翻走(100-620ms) → 620ms 换数据 →
    // 新胶带按上(620-940ms) → 新卡落定(780-1260ms)。时长刻意从容，贴合"不催促"。
    refresh() {
      if (!this.task || this.exhausted || this.swapPhase) return
      if (this.refreshCount >= 3) {
        this.exhausted = true
        return
      }
      this.refreshCount += 1
      this.swapPhase = 'leaving'
      setTimeout(() => {
        // 撕的途中用户可能已"← 返回"退出流程，退了就不再动数据
        if (this.step !== 'card' || !this.task) {
          this.swapPhase = null
          return
        }
        // 池子见底抽不出新卡时保留当前卡——视觉上等于"撕下来又贴了回去"
        this.task = this.pickTask() ?? this.task
        this.swapPhase = 'entering'
        setTimeout(() => {
          this.swapPhase = null
        }, 700)
      }, 620)
    },
    // 无"领取"概念：做完啦直接计入今日已完成（不经过 DailyTaskPool）
    // 撕卡动画进行中不响应——正在飞走的卡不该被"做完"
    markDone() {
      if (this.swapPhase) return
      maybeSilentTopup() // 静默攒提醒额度（有守卫，绝不弹窗；见 utils/silentTopup.js）
      const event = createCompletionEvent({
        contentId: this.task.id,
        contentType: 'daily_task',
        collectionId: null,
      })
      this.completionEventId = event.id
      saveCompletedTask(this.task, event.id)
      this.$emit('completed')
      this.beatDone = false
      this.step = 'invite'
    },
    startChat() {
      // 续用已有对话（比如上次"‹ 返回"退出、还没归档）而不是每次都新建——
      // 同一个 completionEventId 只能绑定一个 Conversation，重复 createConversation 会抛错。
      const existing = getConversationByCompletionEventId(this.completionEventId)
      const conv = existing ?? createConversation(this.completionEventId)
      this.conversationId = conv.id
      this.step = 'chat'
    },
    // 退出（返回/跳过/聊天关闭都走这里）：把归档所需上下文交给页面，收尾由页面负责
    close() {
      this.$emit('close', {
        conversationId: this.conversationId,
        title: this.task?.title ?? '',
        instructions: this.task?.instructions ?? '',
      })
    },
  },
}
</script>

<style>
@import '../styles/push-flow.css';

/* 心情小窗（add-instant-mood-fit）：只在即时流程用，不进共享 push-flow.css。
   跳过项与心情 chip 同款式同权重（一等公民）；布局用 margin 不用 flex gap（华为兼容）。 */
.mood-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.mood-step__q {
  font-size: 30rpx;
  color: var(--c-ink);
  margin-bottom: 28rpx;
}

.mood-step__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 520rpx;
}

.mood-step__chip {
  box-sizing: border-box;
  min-width: 200rpx;
  margin: 12rpx;
  padding: 20rpx 36rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--c-ink);
  background: var(--c-card);
  border: 1rpx solid var(--c-border-s);
  border-radius: 999rpx;
}

.mood-step__chip--wide {
  margin-top: 12rpx;
}
</style>
