import { ref } from 'vue'

/**
 * 点击处理 composable
 * 用于判断单/双击
 */
export function useClickHandler() {
  const lastClickTime = ref<number>(0)
  const lastClickKey = ref<string>('')

  /**
   * 处理点击事件，返回是否为双击
   * @param key - 点击的菜单项 key
   * @param interval - 双击判定间隔（毫秒），默认 300ms
   * @returns 是否为双击
   */
  function handleClick(key: string, interval: number = 300): boolean {
    const now = Date.now()
    const isDoubleClick = lastClickKey.value === key && now - lastClickTime.value < interval

    lastClickTime.value = now
    lastClickKey.value = key

    return isDoubleClick
  }

  /**
   * 重置点击状态
   */
  function reset() {
    lastClickTime.value = 0
    lastClickKey.value = ''
  }

  return {
    lastClickTime,
    lastClickKey,
    handleClick,
    reset
  }
}
