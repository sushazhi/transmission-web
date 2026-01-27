<template>
  <div
    class="canvas-mobile-body-wrapper"
    ref="bodyWrapper"
    :style="{ height: canvasHeight + 'px', width: '100%', top: top }"
  >
    <canvas class="canvas-mobile-body" ref="bodyCanvas"></canvas>
  </div>
  <RowMenu v-model:show="showDropdown" :x="rowMenuX" :y="rowMenuY" to="body" :id="rowMenuId" />
</template>

<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { useSettingStore, useTorrentStore } from '@/store'
import type { AnyTouchEvent } from 'any-touch'
import { useThemeVars } from 'naive-ui'
import { useCardStore } from './store/cardStore'
import useToolbarStore from './store/toolbarStore'
import RowMenu from '../TorrentList/RowMenu.vue'
import { MOBILE_CARD_MARGIN, MOBILE_CARD_MIN_HEIGHT, MOBILE_CARD_PADDING } from './store/mobileUtils'
import { DEFAULT_MOBILE_CELLS } from './MobileCells'
import { isClickInMenuButton } from './MobileCells/NameCell'
import { roundRect } from './cells/utils'
import { TOOLBAR_HEIGHT } from './store/utils'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'

// 扩展 colord 支持混合功能
extend([mixPlugin])

defineExpose({
  onMouseMove,
  onMouseLeave,
  onRowClick
})

const bodyWrapper = useTemplateRef<HTMLDivElement>('bodyWrapper')
const bodyCanvas = useTemplateRef<HTMLCanvasElement>('bodyCanvas')
const cardStore = useCardStore()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const toolbarStore = useToolbarStore()
const filteredTorrents = computed(() => torrentStore.filterTorrents)
const mapSelectedKeys = computed(() => torrentStore.mapSelectedKeys)
const canvasWidth = computed(() => cardStore.clientWidth) // 全屏宽度
const canvasHeight = computed(() => cardStore.clientHeight || 0)
const rowMenuX = ref(0)
const rowMenuY = ref(0)
const showDropdown = ref(false)
// 开始渲染的偏移
const startY = computed(() => cardStore.startY)
const hoverRowIndex = ref<number | null>(null)
const theme = useThemeVars()
let rafId: number | null = null
const rowMenuId = ref<number | undefined>()
const top = computed(() => TOOLBAR_HEIGHT + 'px')

const updateSize = () => {
  const dpr = window.devicePixelRatio || 1
  const height = canvasHeight.value
  const width = canvasWidth.value
  if (bodyCanvas.value) {
    bodyCanvas.value.width = width * dpr
    bodyCanvas.value.height = height * dpr
    bodyCanvas.value.style.width = width + 'px'
    bodyCanvas.value.style.height = height + 'px'
  }
}

// 绘制移动端卡片样式的行
function drawMobileCard(
  ctx: CanvasRenderingContext2D,
  row: Torrent,
  index: number,
  // 0 normal, 1 selected, 2 hovered
  status: number = 0,
  isEmpty: boolean = false,
  isClean: boolean = false
) {
  const canvas = bodyCanvas.value
  if (!canvas) {
    return
  }

  const heights = cardStore.cumulativeHeights.heights
  const mapRowHeights = cardStore.cumulativeHeights.mapRowHeights
  const currentRowHeight = cardStore.cumulativeHeights.mapRowHeights.get(row.id) || MOBILE_CARD_MIN_HEIGHT
  const startRow = filteredTorrents.value[cardStore.visibleStart]
  const y =
    heights[index] -
    heights[cardStore.visibleStart] +
    startY.value +
    (mapRowHeights.get(startRow.id) || 0) -
    currentRowHeight +
    MOBILE_CARD_MARGIN
  ctx.save()
  const dpr = window.devicePixelRatio || 1
  ctx.scale(dpr, dpr)

  // 计算动态高度
  const cardHeight = currentRowHeight - MOBILE_CARD_MARGIN * 2
  const cardWidth = canvasWidth.value - MOBILE_CARD_MARGIN * 2

  if (isClean) {
    ctx.strokeRect(0, y, canvasWidth.value, currentRowHeight)
  }

  // 绘制卡片背景和边框
  let bgColor = theme.value.cardColor
  let borderColor = theme.value.borderColor

  if (status === 1) {
    // bgColor = `color-mix(in srgb, ${theme.value.primaryColor} 10%, ${theme.value.cardColor})`
    bgColor = colord(theme.value.primaryColor).mix(theme.value.cardColor, 0.1).alpha(0.05).toRgbString()
    borderColor = theme.value.primaryColor
  } else if (status === 2) {
    bgColor = theme.value.tableColorHover
  }

  // 多重阴影效果 - 类似 CSS box-shadow
  const shadows = [
    // 内阴影效果 - 柔和的内部阴影
    { color: 'rgba(0, 0, 0, 0.08)', blur: 2, offsetX: 0, offsetY: 1 },
    // 主阴影 - 主要的投影效果
    { color: 'rgba(0, 0, 0, 0.12)', blur: 6, offsetX: 0, offsetY: 3 },
    // 外阴影 - 更大范围的柔和阴影
    { color: 'rgba(0, 0, 0, 0.08)', blur: 16, offsetX: 0, offsetY: 6 }
  ]

  // 绘制多重阴影
  shadows.forEach((shadow) => {
    ctx.shadowColor = shadow.color
    ctx.shadowBlur = shadow.blur
    ctx.shadowOffsetX = shadow.offsetX
    ctx.shadowOffsetY = shadow.offsetY

    // 设置填充样式
    ctx.fillStyle = bgColor
    roundRect(ctx, MOBILE_CARD_MARGIN, y, cardWidth, cardHeight, 8)
    ctx.fill()
  })

  // 清除阴影后绘制边框（避免边框也有阴影）
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // 绘制卡片边框
  ctx.strokeStyle = borderColor
  ctx.lineWidth = status === 1 ? 2 : 1
  roundRect(ctx, MOBILE_CARD_MARGIN, y, cardWidth, cardHeight, 8)
  ctx.stroke()
  if (!isEmpty) {
    // 绘制卡片内容
    drawMobileCardContent(
      ctx,
      row,
      MOBILE_CARD_MARGIN + MOBILE_CARD_PADDING,
      y + MOBILE_CARD_PADDING,
      cardWidth - MOBILE_CARD_PADDING * 2
    )
  }

  ctx.restore()
}

// 绘制移动端卡片内容 - 使用预计算的高度
function drawMobileCardContent(ctx: CanvasRenderingContext2D, row: Torrent, x: number, y: number, width: number) {
  // 从 store 中获取预计算的 Cell 高度
  const cellHeights = cardStore.getMobileRowCellHeights(row.id)
  let currentY = y

  // 按顺序渲染每个 Cell
  DEFAULT_MOBILE_CELLS.forEach((cellComponent, index) => {
    const cellHeight = cellHeights[index] || 0

    if (cellHeight > 0) {
      const state = {
        x,
        y: currentY,
        width,
        height: cellHeight
      }

      cellComponent.render({ ctx, row, state, theme: theme.value })
    }

    currentY += cellHeight
  })
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  index: number,
  status: number = 0,
  isEmpty: boolean = false,
  isClean: boolean = false
) {
  const row = filteredTorrents.value[index]
  if (!row) {
    return
  }
  drawMobileCard(ctx, row, index, status, isEmpty, isClean)
}

function drawBody() {
  const canvas = bodyCanvas.value
  if (!canvas) {
    return
  }
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')!

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value * dpr, canvasHeight.value * dpr)

  const visibleStart = cardStore.visibleStart
  const visibleEnd = cardStore.visibleEnd
  const startIdx = cardStore.renderStartIdx
  const endIdx = cardStore.renderEndIdx
  for (let i = startIdx; i <= endIdx; i++) {
    const row = filteredTorrents.value[i]
    if (!row) {
      break
    }
    let status = 0
    if (mapSelectedKeys.value[row.id]) {
      status = 1
    } else if (hoverRowIndex.value === i) {
      status = 2
    }

    drawRow(ctx, i, status, i < visibleStart || i > visibleEnd, false)
  }
}

function getRowIndex(e: MouseEvent | AnyTouchEvent) {
  const wrapper = e.target as HTMLElement
  const rect = wrapper.getBoundingClientRect()
  const clickY = 'clientY' in e ? e.clientY : e.y
  const offsetY = clickY - rect.top - TOOLBAR_HEIGHT
  // 使用累积高度查找点击的行
  const heights = cardStore.cumulativeHeights.heights
  for (let i = 0; i < heights.length; i++) {
    if (offsetY < heights[i]) {
      return i
    }
  }
  return null
}

// 检测点击是否在菜单按钮上
function isMenuButtonClicked(e: MouseEvent, rowIndex: number): boolean {
  const clickX = e.clientX
  const clickY = e.clientY
  const react = bodyWrapper.value?.getBoundingClientRect()
  // console.debug('isMenuButtonClicked', react?.top)
  // 计算NameCell的位置和尺寸
  const heights = cardStore.cumulativeHeights.heights
  const mapRowHeights = cardStore.cumulativeHeights.mapRowHeights
  const row = filteredTorrents.value[rowIndex]
  if (!row) {
    return false
  }
  const currentRowHeight = mapRowHeights.get(row.id) || MOBILE_CARD_MIN_HEIGHT
  const startRow = filteredTorrents.value[cardStore.visibleStart]
  const cardY =
    heights[rowIndex] -
    heights[cardStore.visibleStart] +
    startY.value +
    (mapRowHeights.get(startRow.id) || 0) -
    currentRowHeight +
    MOBILE_CARD_MARGIN
  const y = clickY - cardY - (react?.top || 0)
  return isClickInMenuButton(clickX, y, canvasWidth.value)
}

// 显示行菜单
function showRowMenu(e: MouseEvent, row: Torrent) {
  rowMenuId.value = row.id
  // 显示菜单
  showDropdown.value = true
  rowMenuX.value = e.clientX
  rowMenuY.value = e.clientY
}

function onMouseMove(e: MouseEvent) {
  const rowIndex = getRowIndex(e)
  if (rowIndex === null) {
    return
  }
  if (cardStore.visibleStart <= rowIndex && rowIndex <= cardStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (row) {
      hoverRowIndex.value = rowIndex
      scheduleDraw(false)
    }
  }
}

function onMouseLeave() {
  hoverRowIndex.value = null
  scheduleDraw(false)
}

function onRowClick(e: MouseEvent) {
  const rowIndex = getRowIndex(e)
  e.preventDefault()
  e.stopPropagation()
  if (showDropdown.value || rowIndex === null) {
    showDropdown.value = false
    return
  }
  if (cardStore.visibleStart <= rowIndex && rowIndex <= cardStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (!row) {
      return
    }

    // 检查是否点击了菜单按钮
    if (isMenuButtonClicked(e, rowIndex)) {
      // 显示菜单
      showRowMenu(e, row)
      return
    }
    if (toolbarStore.selectMode) {
      torrentStore.toggleSelectedKey(row.id)
      torrentStore.setLastSelectedIndex(rowIndex)
      return
    } else {
      torrentStore.setSelectedKeys([row.id])
      torrentStore.setLastSelectedIndex(rowIndex)
    }
  }
}

onMounted(() => {
  nextTick(() => {
    updateSize()
    drawBody()
  })
})

function scheduleDraw(isResize: boolean = false) {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    if (isResize) {
      updateSize()
    }
    drawBody()
    rafId = null
  })
}

// 合并渲染触发器
const renderTriggers = computed(() => ({
  clientHeight: cardStore.clientHeight,
  clientWidth: cardStore.clientWidth,
  torrentCount: torrentStore.filterTorrents.length,
  selectedCount: torrentStore.selectedKeys.length,
  visibleStart: cardStore.visibleStart,
  scrollTop: cardStore.scrollTop,
  themeId: settingStore.setting.theme
}))

// 监听渲染触发器
watch(
  renderTriggers,
  (newVal, oldVal) => {
    let needsResize = false

    if (newVal.clientHeight !== oldVal?.clientHeight || newVal.clientWidth !== oldVal?.clientWidth) {
      needsResize = true
    }
    scheduleDraw(needsResize)
  },
  { flush: 'post' }
)

watch([() => cardStore.clientHeight, () => cardStore.clientWidth, () => cardStore.scrollTop], () => {
  showDropdown.value = false
})
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';
.canvas-mobile-body-wrapper {
  display: flex;
  flex-direction: column;
  z-index: 1;
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
}

.canvas-mobile-body {
  transform: translateZ(0);
  will-change: transform;
  width: 100%;
}
</style>
