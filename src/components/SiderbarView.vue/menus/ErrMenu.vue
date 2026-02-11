<template>
  <n-menu
    :indent="8"
    :options="errorMenuOptions"
    v-model:value="torrentStore.errorStringFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const errorMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.error'),
      key: 'error',
      icon: renderIcon(DismissSquareIcon, 'var(--error-color)'),
      children: torrentStore.errorStringOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || DismissSquareIcon, item.color)
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
    // 双击：选中该错误类型的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'error', key)
    if (ids.length > 0) {
      torrentStore.setSelectedKeys(ids)
    }
  }
}
</script>
