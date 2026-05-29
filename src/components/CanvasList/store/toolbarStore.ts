import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { defineStore } from 'pinia'

const useToolbarStore = defineStore('ListToolbar', () => {

  const isMobile = useIsSmallScreen()
  const listType = ref<string>(isMobile.value ? 'card' : 'table')
  // 选择模式（复选框列显示），默认关闭
  // 用户可通过 ToolbarView 上的按钮手动切换
  const selectMode = ref<boolean>(false)

  watch(isMobile, (newVal) => {
    if (!newVal) {
      listType.value = 'table'
    }
  })

  // 切换为卡片视图时关闭选择模式
  watch(listType, (newType) => {
    if (newType === 'card') {
      selectMode.value = false
    }
  })

  function setSelectMode(mode: boolean) {
    selectMode.value = mode
  }
  function setListType(type: string) {
    listType.value = type
  }
  return {
    selectMode,
    setSelectMode,
    listType,
    setListType
  }
})

export default useToolbarStore
