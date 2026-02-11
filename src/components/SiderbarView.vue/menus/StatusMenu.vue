<template>
  <n-menu
    :indent="8"
    :options="statusMenuOptions"
    v-model:value="torrentStore.statusFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import MagnetIcon from '@/assets/icons/magnet.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { ShuffleOutline } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const statusMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.status'),
      key: 'status',
      icon: renderIcon(MagnetIcon),
      children: torrentStore.statusOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || ShuffleOutline, item.color)
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
    // 双击：选中该状态的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'status', key)
    if (ids.length > 0) {
      torrentStore.setSelectedKeys(ids)
    }
  }
}
</script>
