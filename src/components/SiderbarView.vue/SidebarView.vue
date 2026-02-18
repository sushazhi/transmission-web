<template>
  <aside :class="['h-full w-full sidebar-view', props.class]" @contextmenu.prevent="onContextMenu">
    <StatusMenu v-if="settingStore.setting.sidebarMenuVisible.status" />
    <LabelMenu v-if="settingStore.setting.sidebarMenuVisible.labels" />
    <DirMenu v-if="settingStore.setting.sidebarMenuVisible.dir" />
    <TrackerMenu v-if="settingStore.setting.sidebarMenuVisible.tracker" />
    <ErrMenu v-if="settingStore.setting.sidebarMenuVisible.error" />
    
    <!-- 右键菜单 -->
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="showContextMenu"
      @select="onMenuSelect"
      @clickoutside="showContextMenu = false"
    />
  </aside>
</template>
<script setup lang="ts">
import { useSettingStore } from '@/store'
import { useI18n } from 'vue-i18n'
import { Checkmark as CheckIcon } from '@vicons/ionicons5'
import { h } from 'vue'
import { statusFilters } from '@/const/status'
import useToolbarStore from '@/components/CanvasList/store/toolbarStore'

const props = defineProps<{
  class: string
}>()

const settingStore = useSettingStore()
const toolbarStore = useToolbarStore()
const { t: $t } = useI18n()

const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const renderCheckIcon = (checked: boolean) => {
  return checked ? h('div', { 
    style: { 
      width: '16px', 
      height: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginRight: '8px'
    } 
  }, [
    h(CheckIcon, { size: 16 })
  ]) : h('div', { style: { width: '16px', height: '16px', marginRight: '8px' } })
}

const contextMenuOptions = computed(() => [
  {
    label: $t('sidebar.status'),
    key: 'status',
    icon: () => renderCheckIcon(settingStore.setting.sidebarMenuVisible.status)
  },
  {
    label: $t('sidebar.statusFilterTitle'),
    key: 'statusFilterMenu',
    icon: () => h('div', { style: { width: '16px', height: '16px' } }),
    children: statusFilters.map(filter => ({
      label: filter.label($t),
      key: `statusFilter_${filter.key}`,
      icon: () => renderCheckIcon(settingStore.setting.statusFilterVisible[filter.key as keyof typeof settingStore.setting.statusFilterVisible])
    }))
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: $t('sidebar.labels'),
    key: 'labels',
    icon: () => renderCheckIcon(settingStore.setting.sidebarMenuVisible.labels)
  },
  {
    label: $t('sidebar.directory'),
    key: 'dir',
    icon: () => renderCheckIcon(settingStore.setting.sidebarMenuVisible.dir)
  },
  {
    label: $t('sidebar.tracker'),
    key: 'tracker',
    icon: () => renderCheckIcon(settingStore.setting.sidebarMenuVisible.tracker)
  },
  {
    label: $t('sidebar.error'),
    key: 'error',
    icon: () => renderCheckIcon(settingStore.setting.sidebarMenuVisible.error)
  },
  {
    type: 'divider',
    key: 'd2'
  },
  {
    label: $t('otherSettings.enableDoubleClickSelect'),
    key: 'enableDoubleClickSelect',
    icon: () => renderCheckIcon(settingStore.setting.enableDoubleClickSelect)
  },
  {
    label: $t('sidebar.showGroupSize'),
    key: 'showGroupSize',
    icon: () => renderCheckIcon(settingStore.setting.showGroupSize)
  },
  {
    label: $t('rowMenu.showCheckbox'),
    key: 'showCheckbox',
    icon: () => renderCheckIcon(toolbarStore.selectMode)
  }
])

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  showContextMenu.value = true
}

function onMenuSelect(key: string) {
  if (key.startsWith('statusFilter_')) {
    // 处理状态过滤器
    const filterKey = key.replace('statusFilter_', '')
    settingStore.setting.statusFilterVisible[filterKey as keyof typeof settingStore.setting.statusFilterVisible] = 
      !settingStore.setting.statusFilterVisible[filterKey as keyof typeof settingStore.setting.statusFilterVisible]
  } else if (key === 'enableDoubleClickSelect') {
    // 处理双击全选分组开关
    settingStore.setting.enableDoubleClickSelect = !settingStore.setting.enableDoubleClickSelect
  } else if (key === 'showGroupSize') {
    // 处理显示分组体积开关
    settingStore.setting.showGroupSize = !settingStore.setting.showGroupSize
  } else if (key === 'showCheckbox') {
    // 处理显示选择框开关
    toolbarStore.setSelectMode(!toolbarStore.selectMode)
  } else {
    // 处理侧边栏菜单
    settingStore.setting.sidebarMenuVisible[key as keyof typeof settingStore.setting.sidebarMenuVisible] = 
      !settingStore.setting.sidebarMenuVisible[key as keyof typeof settingStore.setting.sidebarMenuVisible]
  }
}
</script>

<style lang="less">
.sidebar-view {
  user-select: none;
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  .n-menu-item {
    height: 32px;
    .n-menu-item-content {
      height: 32px;
      .n-menu-item-content-header {
        height: 32px;
        font-size: 0.8rem;
        margin-top: 4px;
      }
    }
  }
}
</style>
