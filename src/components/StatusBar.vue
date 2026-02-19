<template>
  <footer :class="[$style.footer, props.class]" @contextmenu.prevent="onContextMenu">
    <div class="flex items-start gap-1 overflow-hidden flex-1 flex-wrap h-full py-[5px]">
      <template v-if="isMobile">
        <n-tag v-for="(item, i) in mobileTags" :key="i" :type="item.type" size="small">{{ item.text }}</n-tag>
      </template>
      <template v-else>
        <n-tag v-for="(item, i) in allTags" :key="i" :type="item.type" size="small">{{ item.text }}</n-tag>
      </template>
    </div>
    
    <!-- 右键菜单 -->
    <n-dropdown
      placement="top-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="showContextMenu"
      @select="onMenuSelect"
      @clickoutside="showContextMenu = false"
    />
    <div class="flex items-center gap-1 h-full" :style="{ width: isMobile ? 'auto' : '96px' }">
      <n-button
        quaternary
        circle
        size="small"
        @click="onToggleFontSize"
        :title="$t('statusBar.toggleFontSize')"
        class="flex items-center justify-center"
      >
        <template #icon>
          <n-icon :component="TextIcon" />
        </template>
      </n-button>
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
import { InformationCircle as InfoIcon, Moon as MoonIcon, Sunny as SunIcon, Text as TextIcon } from '@vicons/ionicons5'
import { Checkmark as CheckIcon } from '@vicons/ionicons5'
import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'

const props = defineProps<{
  class?: string
}>()

const sessionStore = useSessionStore()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const isMobile = useIsSmallScreen()

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

const hasActiveFilter = computed(() => {
  return (
    torrentStore.statusFilter !== 'all' ||
    torrentStore.labelsFilter !== 'all' ||
    torrentStore.trackerFilter !== 'all' ||
    torrentStore.errorStringFilter !== 'all' ||
    torrentStore.downloadDirFilter !== 'all' ||
    torrentStore.search !== ''
  )
})

const groupSize = computed(() => {
  if (!hasActiveFilter.value) {
    return 0
  }
  const filterTorrents = torrentStore.filterTorrents
  return filterTorrents.reduce((sum, t) => sum + (t.sizeWhenDone || 0), 0)
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

// 字体大小切换
function onToggleFontSize() {
  const currentSize = settingStore.setting.fontSize
  const sizes = [12, 14, 16, 18, 20]
  const currentIndex = sizes.indexOf(currentSize)
  const nextIndex = (currentIndex + 1) % sizes.length
  settingStore.setFontSize(sizes[nextIndex])
}

// 关于弹窗（naive-ui n-dialog）
const showAbout = ref(false)
function onShowAbout() {
  showAbout.value = true
}

// 监听 Ctrl+= 快捷键
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      onToggleFontSize()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

// 格式化速度限制，负数表示无限制
const formatLimit = (limit: number) => {
  return limit > 0 ? formatSpeed(limit * 1024) : $t('common.unlimited')
}

// tag 数据
const allTags = computed(() => {
  const tags = []
  const visible = settingStore.setting.statusBarVisible
  const showGlobal = settingStore.setting.showGlobalSpeeds
  
  // 版本
  if (visible.version) {
    tags.push({ text: $t('statusBar.version', { version: session.value?.['version'] ?? '--' }), type: 'info' as const })
  }
  
  // 服务器
  if (visible.server) {
    tags.push({ text: $t('statusBar.server', { server: serverHost.value }), type: 'info' as const })
  }
  
  // 上传速度
  if (visible.uploadSpeed) {
    const rate = showGlobal ? computedFields.value.upRate : (torrentStore.filterTorrents.reduce((sum, t) => sum + (t.rateUpload || 0), 0))
    tags.push({
      text: $t('statusBar.upload', {
        rate: formatSpeed(rate),
        limit: formatLimit(limit.value.upRateLimit)
      }),
      type: 'success' as const
    })
  }
  
  // 下载速度
  if (visible.downloadSpeed) {
    const rate = showGlobal ? computedFields.value.downRate : (torrentStore.filterTorrents.reduce((sum, t) => sum + (t.rateDownload || 0), 0))
    tags.push({
      text: $t('statusBar.download', {
        rate: formatSpeed(rate),
        limit: formatLimit(limit.value.downRateLimit)
      }),
      type: 'info' as const
    })
  }
  
  // 总大小
  if (visible.totalSize) {
    tags.push({ 
      text: $t('statusBar.totalSize', { size: formatSize(hasActiveFilter.value ? groupSize.value : totalSize.value) }), 
      type: hasActiveFilter.value ? 'warning' as const : 'info' as const 
    })
  }
  
  // 选中大小
  if (visible.selectedSize && selectedSize.value > 0) {
    tags.push({ text: $t('statusBar.selectedSize', { size: formatSize(selectedSize.value) }), type: 'info' as const })
  }
  
  // 剩余空间
  if (visible.freeSpace) {
    tags.push({ text: $t('statusBar.freeSpace', { size: formatSize(limit.value.freeSpace) }), type: 'info' as const })
  }
  
  return tags
})

// 移动版精简显示 - 只显示上下传速度、种子大小、剩余空间
const mobileTags = computed(() => {
  const tags = []
  // 上传速度
  tags.push({
    text: `${$t('statusBar.uploadShort')}${formatSpeed(computedFields.value.upRate)}`,
    type: 'success' as const
  })
  // 下载速度
  tags.push({
    text: `${$t('statusBar.downloadShort')}${formatSpeed(computedFields.value.downRate)}`,
    type: 'info' as const
  })
  // 种子大小
  tags.push({ text: `${$t('statusBar.totalSizeShort')}${formatSize(totalSize.value)}`, type: 'info' as const })
  // 剩余空间
  tags.push({ text: `${$t('statusBar.freeSpaceShort')}${formatSize(limit.value.freeSpace)}`, type: 'info' as const })
  return tags
})

// 右键菜单
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const renderCheckIcon = (checked: boolean) => {
  return h('div', { 
    style: { 
      width: '16px', 
      height: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginRight: '8px'
    } 
  }, checked ? h(CheckIcon, { size: 16 }) : h('div'))
}

const contextMenuOptions = computed(() => [
  {
    label: $t('statusBar.showVersion'),
    key: 'version',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.version)
  },
  {
    label: $t('statusBar.showServer'),
    key: 'server',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.server)
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: $t('statusBar.showUploadSpeed'),
    key: 'uploadSpeed',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.uploadSpeed)
  },
  {
    label: $t('statusBar.showDownloadSpeed'),
    key: 'downloadSpeed',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.downloadSpeed)
  },
  {
    type: 'divider',
    key: 'd2'
  },
  {
    label: $t('statusBar.showTotalSize'),
    key: 'totalSize',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.totalSize)
  },
  {
    label: $t('statusBar.showSelectedSize'),
    key: 'selectedSize',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.selectedSize)
  },
  {
    label: $t('statusBar.showFreeSpace'),
    key: 'freeSpace',
    icon: () => renderCheckIcon(settingStore.setting.statusBarVisible.freeSpace)
  }
])

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  showContextMenu.value = true
}

function onMenuSelect(key: string) {
  settingStore.setting.statusBarVisible[key as keyof typeof settingStore.setting.statusBarVisible] = 
    !settingStore.setting.statusBarVisible[key as keyof typeof settingStore.setting.statusBarVisible]
}
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
