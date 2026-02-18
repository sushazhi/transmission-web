import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { isSupportTouch } from '@/utils/evt'
import { defineStore } from 'pinia'

const useToolbarStore = defineStore('ListToolbar', () => {
  const selectMode = ref<boolean>(false)
  const isMobile = useIsSmallScreen()
  const listType = ref<string>(isMobile ? 'card' : 'table')

  watch(isMobile, (newVal) => {
    if (!newVal) {
      listType.value = 'table'
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
