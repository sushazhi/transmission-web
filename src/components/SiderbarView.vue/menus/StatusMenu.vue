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
      children: torrentStore.statusOptions
        .filter((item) => {
          // "all" 选项始终显示
          if (item.key === 'all') return true
          // 其他选项根据 statusFilterVisible 配置显示
          return settingStore.setting.statusFilterVisible[item.key as keyof typeof settingStore.setting.statusFilterVisible] !== false
        })
        .map((item) => ({
          ...item,
          icon: renderIcon(item.icon || ShuffleOutline, (item as any).color)
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
    // 双击：切换选中该状态的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'status', key)
    if (ids.length > 0) {
      // 检查当前选中的种子是否全部都是该状态的种子
      const allSelectedInType = torrentStore.selectedKeys.every((id) => ids.includes(id))
      // 如果当前选中的都是该状态的种子，则清除选中；否则选中该状态的种子
      if (allSelectedInType && torrentStore.selectedKeys.length > 0) {
        torrentStore.clearSelectedKeys()
      } else {
        torrentStore.setSelectedKeys(ids)
      }
    }
  }
}
</script>
