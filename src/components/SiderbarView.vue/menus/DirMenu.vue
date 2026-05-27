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
import type { IDirMenuOption } from '@/store/torrentUtils'
import { renderIcon } from '@/utils'
import { FileTray, Folder, FolderOpen, ShuffleOutline } from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useClickHandler } from '@/composables/useClickHandler'
import { getMatchingTorrentIds } from '@/utils/torrentSelection'
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const { handleClick } = useClickHandler()

const expandedKeys = ref<string[]>(['dir'])

// 递归地把目录树节点转成 n-menu 选项
const decorate = (option: IDirMenuOption): MenuOption => {
  const menuOption: MenuOption = {
    key: option.key,
    label: option.label,
    icon: renderIcon(option.children ? FolderOpen : Folder)
  }
  if (option.children && option.children.length > 0) {
    menuOption.children = option.children.map(decorate)
  }
  return menuOption
}

const dirMenuOptions = computed<MenuOption[]>(() => {
  const total = torrentStore.torrents.length
  return [
    {
      label: $t('sidebar.directory'),
      key: 'dir',
      icon: renderIcon(FileTray),
      children: [
        {
          key: 'all',
          label: $t('common.all', { total }),
          icon: renderIcon(ShuffleOutline)
        },
        ...torrentStore.downloadDirMenuOptions.map(decorate)
      ]
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
