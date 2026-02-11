<template>
  <n-menu
    :indent="8"
    :options="labelMenuOptions"
    v-model:value="torrentStore.labelsFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    @update:value="handleMenuClick"
  />
</template>
<script setup lang="ts">
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { Pricetag, Pricetags } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const labelMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.labels'),
      key: 'labels',
      icon: renderIcon(Pricetags),
      children: torrentStore.labelsOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || Pricetag)
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
    // 双击：选中该标签的所有种子
    const ids = getMatchingTorrentIds(torrentStore.torrents, 'labels', key)
    if (ids.length > 0) {
      torrentStore.setSelectedKeys(ids)
    }
  }
}
</script>
