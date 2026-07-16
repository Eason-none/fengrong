<template>
  <view class="nav-badge" @tap="open">
    <text class="nav-badge__icon">⚙</text>
  </view>

  <view v-if="visible" class="nav-badge__overlay" @tap="close">
    <view class="nav-badge__sheet" @tap.stop>
      <template v-if="!showPrivacy && !showBasicInfo && !showReminder">
        <view class="nav-badge__item" hover-class="u-press" @tap="openBasicInfo">基本信息</view>
        <!-- #ifdef MP-WEIXIN -->
        <view class="nav-badge__item nav-badge__item--split" hover-class="u-press" @tap="openReminder">
          <text>主动提醒</text>
          <text class="nav-badge__item-state">{{ reminderStateText }}</text>
        </view>
        <!-- #endif -->
        <view class="nav-badge__item" hover-class="u-press" @tap="openPrivacy">隐私政策</view>
        <view class="nav-badge__close" hover-class="u-press" @tap="close">关闭</view>
      </template>
      <!-- #ifdef MP-WEIXIN -->
      <template v-else-if="showReminder">
        <view class="nav-badge__privacy-back" hover-class="u-press" @tap="closeReminder">‹ 返回</view>
        <view class="reminder-pane">
          <!-- 已开启且未暂停：不需要弹窗，reject 锁死也不影响本态 -->
          <template v-if="reminder.enabled && !reminder.paused">
            <text class="reminder-pane__note">每天这个时间，轻轻提一句。</text>
            <picker mode="multiSelector" :range="timeColumns" :value="pickerIndexes" @change="onTimeChange">
              <view class="reminder-pane__time">每天 {{ reminder.time }}<text class="reminder-pane__time-edit">改时间</text></view>
            </picker>
            <view class="reminder-pane__off" hover-class="u-press" @tap="turnOffReminder">关闭提醒</view>
          </template>
          <!-- reject 锁死：弹窗永不再出现，开启/续上都走不通，引导去微信订阅消息设置（design D5） -->
          <template v-else-if="subState === 'silent-reject'">
            <text class="reminder-pane__note">提醒被微信挡住了。到右上角 ⋯ → 设置 → 订阅消息 里允许「日报提醒」，再回来开启。</text>
            <view v-if="reminder.enabled" class="reminder-pane__off" hover-class="u-press" @tap="turnOffReminder">关闭提醒</view>
          </template>
          <!-- 已暂停：额度耗尽，如实但不谈机制 -->
          <template v-else-if="reminder.enabled && reminder.paused">
            <text class="reminder-pane__note">提醒暂停了，点一下就能续上。</text>
            <view class="reminder-pane__btn" hover-class="u-press" @tap="enableReminder">重新开启</view>
            <view class="reminder-pane__off" hover-class="u-press" @tap="turnOffReminder">关闭提醒</view>
          </template>
          <!-- 未开启 -->
          <template v-else>
            <text class="reminder-pane__note">选一个时间，每天这时候提一句：给自己留几分钟。</text>
            <picker mode="multiSelector" :range="timeColumns" :value="pickerIndexes" @change="onTimeChange">
              <view class="reminder-pane__time">{{ pickedTime }}<text class="reminder-pane__time-edit">改时间</text></view>
            </picker>
            <view class="reminder-pane__btn" hover-class="u-press" @tap="enableReminder">开启提醒</view>
            <text class="reminder-pane__hint">弹窗里勾选「总是保持以上选择」，之后就不会再问你了。</text>
          </template>
        </view>
      </template>
      <!-- #endif -->
      <template v-else-if="showBasicInfo">
        <view class="nav-badge__privacy-back" hover-class="u-press" @tap="closeBasicInfo">‹ 返回</view>
        <scroll-view class="nav-badge__basic-info-scroll" scroll-y>
          <BasicInfoSettings @close="closeBasicInfo" />
        </scroll-view>
      </template>
      <template v-else>
        <view class="nav-badge__privacy-back" @tap="closePrivacy">‹ 返回</view>
        <scroll-view class="nav-badge__privacy-text" scroll-y>{{ PRIVACY_POLICY_TEXT }}</scroll-view>
        <view class="nav-badge__close" @tap="close">关闭</view>
      </template>
    </view>
  </view>
</template>

<script>
import BasicInfoSettings from '@/components/BasicInfoSettings.vue'
// #ifdef MP-WEIXIN
import { upsertReminder, disableReminder, topupReminder, getReminderStatus, getSubscribeState, requestSubscribe } from '@/api/reminder'
import { refreshSubscribeState } from '@/utils/silentTopup'
// #endif

// product_handoff.md §6.2.1：如实披露版（非律师审定，但需与真实数据流一致）。覆盖四条数据流：
// ①本地存储 ②对话→第三方大模型 ③位置→第三方天气服务 ④匿名统计。联系方式已填真实邮箱；
// 微信小程序后台"用户隐私保护指引"已另行配置（内容需与本文案保持一致）。
const PRIVACY_POLICY_TEXT = `隐私政策

感谢你使用本产品。这里用直白的话，说明我们如何处理你的信息。

一、保存在你设备本地的信息
你的图鉴解锁状态、完成记录、对话内容、日记与回顾等，默认只保存在你当前设备的本地存储中，不会同步到云端账号。更换设备或清除小程序数据后，这些内容会一并丢失。

二、生成对话与文字时用到的第三方大模型
当你与"见证者"聊天、归档生成日记摘要、或生成图鉴回顾时，你在对话中输入的文字与图片，会经由我们的服务器转发给第三方大模型服务（阿里云通义千问、DeepSeek）用于即时生成回应。这些内容仅用于本次生成，不会被用于训练模型或其他用途。请不要在对话中填写身份证号、银行卡号等敏感个人信息。

三、位置与天气
如果你授权位置权限，我们会把你的大致经纬度发送给第三方天气服务（和风天气）以获取所在城市与天气，用于在首页展示天气、并让每日推荐更贴合当天情境。你可以拒绝授权，拒绝后仅影响天气展示，不影响其他功能；我们不会保存或上传你的位置轨迹。

四、匿名使用统计
为了了解功能是否被使用，我们会收集少量匿名统计：一个与你身份无关的本地随机标识、发生的事件类型、涉及的内容编号和时间。其中不包含你的昵称、生日、对话文字，也不含任何微信身份信息，我们无法凭这些数据识别到你本人。

五、主动提醒
如果你在设置中开启主动提醒，我们会在服务端保存你的微信用户标识（openid）和你选择的提醒时间，仅用于在你选定的时间发送提醒消息。关闭提醒后，这些信息会立即从服务端删除。不开启提醒则完全不涉及这项收集。

六、我们不会做的事
不收集你的通讯录、不追踪你的位置轨迹、不将你的信息出售给第三方。

七、政策更新与联系方式
本政策可能随功能调整而更新。如对隐私有疑问，可发送邮件至 yixin20011010@163.com 与我们联系。`

export default {
  name: 'NavBar',
  components: { BasicInfoSettings },
  data() {
    return {
      visible: false,
      showPrivacy: false,
      showBasicInfo: false,
      showReminder: false,
      // 提醒状态唯一事实源在服务端（design D8），这里只是打开弹层时的查询快照
      reminder: { enabled: false, time: '', paused: false },
      pickedTime: '21:00',
      subState: 'ask', // getSubscribeState 三态缓存，进提醒页时刷新
      PRIVACY_POLICY_TEXT,
    }
  },
  computed: {
    reminderStateText() {
      if (!this.reminder.enabled) return ''
      return this.reminder.paused ? '已暂停' : `每天 ${this.reminder.time}`
    },
    // 时间选择用双列自定义选择器（时 × 5分钟档）：微信 picker mode="time" 固定 1 分钟颗粒度，
    // 与发送侧 5 分钟窗口不匹配，会让用户以为 9:16 就该 9:16 整送达
    timeColumns() {
      const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ' 时')
      const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0') + ' 分')
      return [hours, minutes]
    },
    pickerIndexes() {
      const [h, m] = this.pickedTime.split(':').map(Number)
      return [h, Math.min(Math.round(m / 5), 11)]
    },
  },
  mounted() {
    // #ifdef MP-WEIXIN
    refreshSubscribeState() // 为完成时刻的静默攒额度钩子打底缓存
    // #endif
  },
  methods: {
    open() {
      this.visible = true
      this.refreshReminder()
    },
    close() {
      this.visible = false
      this.showPrivacy = false
      this.showBasicInfo = false
      this.showReminder = false
    },
    refreshReminder() {
      // #ifdef MP-WEIXIN
      getReminderStatus()
        .then((res) => {
          this.reminder = { enabled: !!res.enabled, time: res.time || '', paused: !!res.paused }
          if (res.enabled && res.time) this.pickedTime = res.time
        })
        .catch(() => {}) // 查询失败按未开启渲染，不打扰
      getSubscribeState().then((s) => {
        this.subState = s
      })
      // #endif
    },
    openReminder() {
      this.showReminder = true
    },
    closeReminder() {
      this.showReminder = false
    },
    enableReminder() {
      // #ifdef MP-WEIXIN
      // requestSubscribeMessage 必须留在 tap 同步调用链里（不能先 await 任何东西）
      requestSubscribe().then((accepted) => {
        if (!accepted) {
          // 拒绝不挽留；顺手刷新守卫态（可能刚变成 reject 锁死）
          this.refreshReminder()
          return
        }
        upsertReminder(this.pickedTime)
          .then(() => topupReminder())
          .then(() => {
            this.refreshReminder()
            refreshSubscribeState()
          })
          .catch(() => {
            uni.showToast({ title: '没连上，稍后再试试', icon: 'none' })
          })
      })
      // #endif
    },
    turnOffReminder() {
      // #ifdef MP-WEIXIN
      disableReminder()
        .then(() => {
          this.reminder = { enabled: false, time: '', paused: false }
        })
        .catch(() => {
          uni.showToast({ title: '没连上，稍后再试试', icon: 'none' })
        })
      // #endif
    },
    onTimeChange(e) {
      const [hi, mi] = e.detail.value
      const time = `${String(hi).padStart(2, '0')}:${String(mi * 5).padStart(2, '0')}`
      this.pickedTime = time
      // #ifdef MP-WEIXIN
      // 已开启时改时间直接落服务端（不需要新弹窗，额度与时间解耦）
      if (this.reminder.enabled) {
        upsertReminder(time)
          .then(() => this.refreshReminder())
          .catch(() => {
            uni.showToast({ title: '没连上，稍后再试试', icon: 'none' })
          })
      }
      // #endif
    },
    openPrivacy() {
      this.showPrivacy = true
    },
    closePrivacy() {
      this.showPrivacy = false
    },
    openBasicInfo() {
      this.showBasicInfo = true
    },
    closeBasicInfo() {
      this.showBasicInfo = false
      this.visible = false
    },
  },
}
</script>

<style>
.nav-badge {
  position: fixed;
  top: 20rpx;
  right: 20rpx;
  z-index: 10;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-badge__icon {
  font-size: 36rpx;
  color: var(--c-subtle);
}

.nav-badge__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(8, 16, 6, 0.4);
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fade-in 0.2s ease both;
}

.nav-badge__sheet {
  width: 100%;
  background: var(--c-card);
  border-radius: 36rpx 36rpx 0 0;
  padding: 40rpx 40rpx 60rpx;
  animation: sheet-up 0.3s var(--ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  .nav-badge__overlay,
  .nav-badge__sheet {
    animation: fade-in 0.2s ease both;
  }
}

.nav-badge__item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--c-border);
  font-size: 30rpx;
  color: var(--c-ink);
}

.nav-badge__close {
  padding: 30rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: var(--c-subtle);
}

.nav-badge__privacy-back {
  font-size: 30rpx;
  color: var(--c-primary);
  padding: 12rpx 24rpx 12rpx 0;
  margin: -12rpx 0 12rpx;
}

.nav-badge__privacy-text {
  height: 600rpx;
  font-size: 26rpx;
  color: var(--c-muted);
  line-height: 1.8;
  white-space: pre-wrap;
}

.nav-badge__basic-info-scroll {
  height: 700rpx;
}

.nav-badge__item--split {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-badge__item-state {
  font-size: 26rpx;
  color: var(--c-subtle);
}

.reminder-pane {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  padding: 12rpx 0 8rpx;
}

.reminder-pane__note {
  font-size: 28rpx;
  color: var(--c-muted);
  line-height: 1.8;
}

.reminder-pane__time {
  padding: 26rpx 30rpx;
  border: 1rpx solid var(--c-border);
  border-radius: 20rpx;
  font-size: 30rpx;
  color: var(--c-ink);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reminder-pane__time-edit {
  font-size: 26rpx;
  color: var(--c-primary);
}

.reminder-pane__btn {
  padding: 26rpx 0;
  border-radius: 20rpx;
  background: var(--c-primary);
  color: #fff;
  font-size: 30rpx;
  text-align: center;
}

.reminder-pane__off {
  padding: 20rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--c-subtle);
}

.reminder-pane__hint {
  font-size: 24rpx;
  color: var(--c-subtle);
  line-height: 1.7;
  text-align: center;
}
</style>
