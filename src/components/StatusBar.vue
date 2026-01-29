<template>
  <footer :class="[$style.footer, props.class]">
    <div class="flex items-start gap-1 overflow-hidden flex-1 flex-wrap h-full py-[5px]">
      <n-tag v-for="(item, i) in allTags" :key="i" :type="item.type" size="small">{{ item.text }}</n-tag>
    </div>
    <div class="flex items-center gap-1 flex-shrink-0 h-full" style="width: 64px">
      <n-button
        quaternary
        circle
        size="small"
        @click="onToggleTheme"
        :title="$t('statusBar.toggleTheme')"
        class="flex items-center justify-center"
      >
        <template #icon>
          <n-icon :component="isDark ? MoonIcon : SunIcon" />
        </template>
      </n-button>
      <n-button
        quaternary
        circle
        size="small"
        @click="onShowAbout"
        :title="$t('statusBar.about')"
        class="flex items-center justify-center"
      >
        <template #icon>
          <n-icon :component="InfoIcon" />
        </template>
      </n-button>
    </div>
  </footer>
  <AboutDialog v-model:show="showAbout" :version="session?.['version']" :server="serverHost" author="..." />
</template>
<script setup lang="ts">
import { useSessionStore, useSettingStore, useTorrentStore } from '@/store'
import { formatSize, formatSpeed } from '@/utils'
import { InformationCircle as InfoIcon, Moon as MoonIcon, Sunny as SunIcon } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  class?: string
}>()

const sessionStore = useSessionStore()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()

const session = computed(() => sessionStore.session)
const torrents = computed(() => torrentStore.torrents)
const totalSize = computed(() => torrents.value.reduce((sum, t) => sum + (t.sizeWhenDone || 0), 0))

const computedFields = computed(() => {
  return torrents.value.reduce(
    (prev, t) => {
      prev.totalSize += t.sizeWhenDone || 0
      prev.downRate += t.rateDownload || 0
      prev.upRate += t.rateUpload || 0
      return prev
    },
    {
      totalSize: 0,
      downRate: 0,
      upRate: 0
    }
  )
})
const selectedKeys = computed(() => torrentStore.selectedKeys || [])
const selectedSize = computed(() => {
  if (!selectedKeys.value.length) {
    return 0
  }
  return torrents.value
    .filter((t) => selectedKeys.value.includes(t.id))
    .reduce((sum, t) => sum + (t.sizeWhenDone || 0), 0)
})

const limit = computed(() => {
  // 提前判断 session，不存在则返回默认值
  if (!session.value) {
    return {
      downRateLimit: -1,
      upRateLimit: -1,
      freeSpace: 0
    }
  }

  // session 存在，进行实际的逻辑判断
  const downRateLimit = session.value['alt-speed-enabled']
    ? (session.value['alt-speed-down'] as number)
    : session.value['speed-limit-down-enabled']
      ? (session.value['speed-limit-down'] as number)
      : -1

  const upRateLimit = session.value['alt-speed-enabled']
    ? (session.value['alt-speed-up'] as number)
    : session.value['speed-limit-up-enabled']
      ? (session.value['speed-limit-up'] as number)
      : -1

  const freeSpace = session.value['download-dir-free-space'] || 0

  return {
    downRateLimit,
    upRateLimit,
    freeSpace
  }
})

const serverHost = computed(() => settingStore.serverHost)

// 主题切换（naive-ui）
const isDark = computed(() => settingStore.setting.theme === 'dark')
function onToggleTheme() {
  settingStore.setTheme(isDark.value ? 'light' : 'dark')
}

// 关于弹窗（naive-ui n-dialog）
const showAbout = ref(false)
function onShowAbout() {
  showAbout.value = true
}

// tag 数据
const allTags = computed(() => [
  { text: $t('statusBar.version', { version: session.value?.['version'] ?? '--' }), type: 'info' as const },
  { text: $t('statusBar.server', { server: serverHost.value }), type: 'info' as const },
  {
    text: $t('statusBar.upload', {
      rate: formatSpeed(computedFields.value.upRate),
      limit: formatSpeed(limit.value.upRateLimit * 1024)
    }),
    type: 'success' as const
  },
  {
    text: $t('statusBar.download', {
      rate: formatSpeed(computedFields.value.downRate),
      limit: formatSpeed(limit.value.downRateLimit * 1024)
    }),
    type: 'info' as const
  },
  { text: $t('statusBar.totalSize', { size: formatSize(totalSize.value) }), type: 'info' as const },
  ...(selectedSize.value > 0
    ? [{ text: $t('statusBar.selectedSize', { size: formatSize(selectedSize.value) }), type: 'info' as const }]
    : []),
  { text: $t('statusBar.freeSpace', { size: formatSize(limit.value.freeSpace) }), type: 'info' as const }
])
</script>

<style module lang="less">
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
  height: 100%;
  padding: 0 8px;
  border-top: 1px solid var(--border-color);
  gap: 16px;
}
</style>
