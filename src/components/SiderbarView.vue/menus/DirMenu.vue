<template>
  <n-menu
    :indent="8"
    :options="dirMenuOptions"
    v-model:value="torrentStore.downloadDirFilter"
    v-model:expanded-keys="expandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { FileTray, Folder, FolderOpen } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'
import type { IDirMenuItem } from '@/store/torrentUtils'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const expandedKeys = ref<string[]>(['dir'])

const convertToMenuOptions = (items: IDirMenuItem[]) => {
  return items.map((item) => {
    const result: any = {
      key: item.key,
      label: `${item.label}（${item.count}）`,
      icon: renderIcon(item.children ? Folder : FolderOpen)
    }
    if (item.key === 'all') {
      result.icon = renderIcon(FileTray)
    }
    if (item.children && item.children.length > 0) {
      result.children = convertToMenuOptions(item.children)
    }
    return result
  })
}

const dirMenuOptions = computed(() => {
  const dirOptions = torrentStore.downloadDirOptions as IDirMenuItem[]
  return [
    {
      label: $t('sidebar.directory'),
      key: 'dir',
      icon: renderIcon(FileTray),
      children: convertToMenuOptions(dirOptions)
    }
  ]
})

// 处理菜单点击
function handleMenuClick(key: string) {
  // 检查开关是否开启
  if (!settingStore.setting.enableDoubleClickSelect) {
    return
  }

  // 判断是否为双击
  if (handleClick(key)) {
    // 双击：切换选中该目录的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'dir', key)
    if (ids.length > 0) {
      // 检查当前选中的种子是否全部都是该目录的种子
      const allSelectedInType = torrentStore.selectedKeys.every((id) => ids.includes(id))
      // 如果当前选中的都是该目录的种子，则清除选中；否则选中该目录的种子
      if (allSelectedInType && torrentStore.selectedKeys.length > 0) {
        torrentStore.clearSelectedKeys()
      } else {
        torrentStore.setSelectedKeys(ids)
      }
    }
  }
}
</script>
