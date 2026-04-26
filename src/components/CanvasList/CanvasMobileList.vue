<template>
  <div class="canvas-mobile-list-wrapper" ref="canvasMobileListWrapperRef">
    <div class="canvas-mobile-list-container" ref="canvasMobileListContainerRef" @scroll="onScroll">
      <ToolbarView />
      <CanvasTableMobileBody ref="canvasTableMobileBodyRef" />
      <div
        tabindex="-1"
        ref="scrollHolderRef"
        :style="{ height: cardStore.scrollHeight + 'px', width: '100%' }"
        class="canvas-mobile-list-scroll-holder"
        @mousemove="canvasTableMobileBodyRef?.onMouseMove"
        @mouseleave="canvasTableMobileBodyRef?.onMouseLeave"
        @click="canvasTableMobileBodyRef?.onRowClick"
        v-touch="{ preventDefault: false }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CanvasTableMobileBody from './CanvasTableMobileBody.vue'
import { useCardStore } from './store/cardStore'
import { TOOLBAR_HEIGHT } from './store/utils'
import { useTorrentStore } from '@/store'

const props = defineProps<{
  listHeight: number
}>()

const cardStore = useCardStore()
const torrentStore = useTorrentStore()
const canvasTableMobileBodyRef = useTemplateRef<InstanceType<typeof CanvasTableMobileBody>>('canvasTableMobileBodyRef')
const scrollHolderRef = useTemplateRef<HTMLElement>('scrollHolderRef')
const canvasMobileListWrapperRef = useTemplateRef<HTMLElement>('canvasMobileListWrapperRef')
const canvasMobileListContainerRef = useTemplateRef<HTMLElement>('canvasMobileListContainerRef')
const bodyRef = ref(document.body)
const bodyHeight = ref(document.body.clientHeight || document.documentElement.clientHeight)

onMounted(() => {
  canvasMobileListContainerRef.value!.scrollTop = cardStore.scrollTop
})

watch(
  () => props.listHeight,
  (newHeight) => {
    if (canvasMobileListContainerRef.value) {
      canvasMobileListContainerRef.value.style.height = newHeight + 'px'
    } else {
      nextTick(() => {
        if (canvasMobileListContainerRef.value) {
          canvasMobileListContainerRef.value.style.height = newHeight + 'px'
        }
      })
    }
    cardStore.setClientHeight(newHeight - TOOLBAR_HEIGHT)
  },
  {
    immediate: true
  }
)

let rafId: number | null = null
let lastScrollEvent: Event | null = null

function onScrollRaw(e: Event) {
  const target = e.target as HTMLElement
  cardStore.setScroll(target.scrollTop, 0) // 移动端不需要水平滚动
}

// 优化的滚动事件处理，添加防抖
function onScroll(e: Event) {
  lastScrollEvent = e
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    if (lastScrollEvent) {
      onScrollRaw(lastScrollEvent)
      lastScrollEvent = null
    }
    rafId = null
  })
}

// 添加组件销毁时的清理逻辑
onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lastScrollEvent = null
})

watch(
  () => torrentStore.scrollToSelectedId,
  (id) => {
    if (id === null || !canvasMobileListContainerRef.value) return
    const idx = torrentStore.filterTorrents.findIndex((t) => t.id === id)
    if (idx < 0) return
    const heights = cardStore.cumulativeHeights.heights
    const rowTop = idx === 0 ? 0 : (heights[idx - 1] || 0)
    const containerHeight = cardStore.clientHeight
    const rowHeight = (heights[idx] || 0) - rowTop
    let targetScroll = rowTop + TOOLBAR_HEIGHT - (containerHeight - rowHeight) / 2
    targetScroll = Math.max(0, targetScroll)
    canvasMobileListContainerRef.value.scrollTop = targetScroll
    torrentStore.scrollToSelectedId = null
  }
)

useResizeObserver(bodyRef, () => {
  bodyHeight.value = bodyRef.value?.clientHeight!
})

useResizeObserver([canvasMobileListWrapperRef], () => {
  cardStore.setClientWidth(scrollHolderRef.value?.clientWidth!)
})

onMounted(() => {
  cardStore.setClientWidth(scrollHolderRef.value?.clientWidth!)
})
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';
.canvas-mobile-list-wrapper {
  position: relative;
  overflow: hidden;
  background-color: var(--body-color);
  width: 100vw;
}

.canvas-mobile-list-container {
  width: 100%;
  overflow: auto;
  position: relative;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  z-index: 2;
  .scrollbar();
}

.canvas-mobile-list-scroll-holder {
  position: absolute;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  top: 0;
  left: 0;
  cursor: pointer;
  z-index: 1;
}
</style>
