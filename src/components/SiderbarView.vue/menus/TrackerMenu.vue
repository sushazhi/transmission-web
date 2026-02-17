<template>
  <n-menu
    :indent="8"
    :options="menuOpts"
    v-model:value="torrentStore.trackerFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import StormTracker from '@/assets/icons/stormTracker.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const menuOpts = computed(() => {
  return [
    {
      label: $t('sidebar.tracker'),
      key: 'tracker',
      icon: renderIcon(StormTracker),
      children: torrentStore.trackerOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || StormTracker)
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
    // 双击：切换选中该 Tracker 的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'tracker', key)
    if (ids.length > 0) {
      // 检查当前选中的种子是否全部都是该 Tracker 的种子
      const allSelectedInType = torrentStore.selectedKeys.every((id) => ids.includes(id))
      // 如果当前选中的都是该 Tracker 的种子，则清除选中；否则选中该 Tracker 的种子
      if (allSelectedInType && torrentStore.selectedKeys.length > 0) {
        torrentStore.clearSelectedKeys()
      } else {
        torrentStore.setSelectedKeys(ids)
      }
    }
  }
}
</script>
