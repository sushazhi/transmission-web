<template>
  <n-menu
    :indent="8"
    :options="dirMenuOptions"
    v-model:value="torrentStore.downloadDirFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { FileTray, Folder } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const dirMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.directory'),
      key: 'dir',
      icon: renderIcon(FileTray),
      children: torrentStore.downloadDirOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || Folder)
      }))
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
    // 双击：选中该目录的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'dir', key)
    if (ids.length > 0) {
      torrentStore.setSelectedKeys(ids)
    }
  }
}
</script>
