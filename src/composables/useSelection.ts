import { ref } from 'vue'

// 通用 选中逻辑，负责选中行
export function useSelection<T extends { id: number }>(items: () => T[]) {
  const selectedKeys = ref<number[]>([])
  const lastSelectedKey = ref<number | null>(null)
  const mapSelectedKeys = computed(() =>
    selectedKeys.value.reduce(
      (acc, id) => {
        acc[id] = true
        return acc
      },
      {} as Record<number, boolean>
    )
  )
  // 设置选中
  function setSelectedKeys(keys: number[]) {
    selectedKeys.value = [...keys]
    lastSelectedKey.value = keys[keys.length - 1]
  }
  // 切换选中
  function toggleSelectedKey(key: number) {
    if (selectedKeys.value.includes(key)) {
      selectedKeys.value = selectedKeys.value.filter((k) => k !== key)
      lastSelectedKey.value = selectedKeys.value[selectedKeys.value.length - 1]
    } else {
      selectedKeys.value = [...selectedKeys.value, key]
      lastSelectedKey.value = key
    }
  }
  // 清空选中
  function clearSelectedKeys() {
    selectedKeys.value = []
    lastSelectedKey.value = null
  }
  // 选中范围
  function selectRange(currentIndex: number) {
    let latestIndex = -1
    const currentItems = items()
    if (lastSelectedKey.value) {
      latestIndex = currentItems.findIndex((t) => t.id === lastSelectedKey.value)
    }
    if (latestIndex == -1) {
      selectedKeys.value = [currentItems[currentIndex]?.id]
      latestIndex = currentIndex
      return
    }
    const start = Math.min(latestIndex, currentIndex)
    const end = Math.max(latestIndex, currentIndex)
    const rangeIds = currentItems.slice(start, end + 1).map((t) => t.id)
    selectedKeys.value = rangeIds
    lastSelectedKey.value = rangeIds[rangeIds.length - 1]
  }

  function setLastSelectedKey(idx: number) {
    lastSelectedKey.value = idx
  }

  return {
    mapSelectedKeys,
    selectedKeys,
    setSelectedKeys,
    toggleSelectedKey,
    clearSelectedKeys,
    selectRange,
    lastSelectedKey,
    setLastSelectedKey
  }
}
