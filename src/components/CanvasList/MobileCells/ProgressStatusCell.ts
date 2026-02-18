import { getStatusString, Status } from '@/types/tr'
import type { ThemeCommonVars } from 'naive-ui'
import { fitText, getTextWidth, roundRect } from '../cells/utils'
import { MOBILE_LINE_MARGIN, MOBILE_PROGRESS_HEIGHT } from '../store/mobileUtils'
import type { MobileCellComponent, MobileCellHeightCalculator, MobileCellRenderer } from './types'

// 获取状态颜色和背景色
function getStatusColors(
  status: number,
  error: boolean,
  theme: any
): { bgColor: string; textColor: string; borderColor: string } {
  if (error) {
    return {
      bgColor: `color-mix(in srgb, ${theme.errorColor} 15%, transparent)`,
      textColor: theme.errorColor,
      borderColor: theme.errorColor
    }
  }
  switch (status) {
    case 0: // 已暂停
      return {
        bgColor: `color-mix(in srgb, #888 15%, transparent)`,
        textColor: '#888',
        borderColor: '#888'
      }
    case 1: // 等待验证
    case 2: // 验证中
    case 3: // 等待下载
    case 5: // 等待做种
      return {
        bgColor: `color-mix(in srgb, #3bc9db 15%, transparent)`,
        textColor: '#3bc9db',
        borderColor: '#3bc9db'
      }
    case 4: // 下载中
      return {
        bgColor: `color-mix(in srgb, #748ffc 15%, transparent)`,
        textColor: '#748ffc',
        borderColor: '#748ffc'
      }
    case 6: // 做种中
      return {
        bgColor: `color-mix(in srgb, #10b981 15%, transparent)`,
        textColor: '#10b981',
        borderColor: '#10b981'
      }
    default:
      return {
        bgColor: `color-mix(in srgb, ${theme.textColor2} 15%, transparent)`,
        textColor: theme.textColor2,
        borderColor: theme.textColor2
      }
  }
}

// 绘制进度条
function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  progress: number,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: any
) {
  ctx.fillStyle = theme.borderColor
  roundRect(ctx, x, y, width, height, height / 2)
  ctx.fill()
  if (progress > 0) {
    ctx.fillStyle = theme.primaryColor
    roundRect(ctx, x, y, width * progress, height, height / 2)
    ctx.fill()
  }
}

// 绘制进度百分比文字
function drawProgressText(
  ctx: CanvasRenderingContext2D,
  progress: number,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: ThemeCommonVars
) {
  const progressText = `${(progress * 100).toFixed(1)}%`
  // 使用较小的字体大小,确保不会与进度条重叠
  const fontSize = Math.min(parseInt(theme.fontSizeMedium), height)
  ctx.font = `${fontSize}px ${theme.fontFamily}`
  ctx.fillStyle = theme.textColorBase
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(progressText, x + width - 4, y + height / 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'top'
}

// 绘制状态标签
function drawStatusTag(
  ctx: CanvasRenderingContext2D,
  status: number,
  error: boolean,
  x: number,
  y: number,
  width: number,
  tagHeight: number,
  theme: any,
  labels?: string[]
) {
  let statusText = getStatusString(status) || '-'
  const colors = getStatusColors(status, error, theme)
  const hasLabels = labels && labels.length > 0

  const tagPadding = 5
  const fontSize = 10

  // 如果有标签，绘制两个胶囊：标签在左，状态在右，中间间隔2字符
  if (hasLabels) {
    const labelsStr = labels.join(', ')
    const spacingWidth = getTextWidth(ctx, '  ') // 2字符间距
    ctx.font = `${fontSize}px ${theme.fontFamily}`
    const labelsWidth = getTextWidth(ctx, labelsStr)
    const statusTextWidth = getTextWidth(ctx, statusText)

    // 标签胶囊宽度
    const labelsTagWidth = labelsWidth + tagPadding * 2
    // 状态胶囊宽度
    const statusTagWidth = statusTextWidth + tagPadding * 2

    // 从右向左计算位置
    // 状态胶囊在右边缘
    const statusX = x + width - statusTagWidth

    // 标签胶囊在状态胶囊左边
    const labelsX = statusX - spacingWidth - labelsTagWidth

    // 绘制标签胶囊（主题色边框和文字）
    ctx.fillStyle = `color-mix(in srgb, ${theme.primaryColorHover} 20%, transparent)`
    roundRect(ctx, labelsX, y, labelsTagWidth, tagHeight, tagHeight / 2)
    ctx.fill()

    ctx.strokeStyle = theme.primaryColor
    ctx.lineWidth = 1
    roundRect(ctx, labelsX, y, labelsTagWidth, tagHeight, tagHeight / 2)
    ctx.stroke()

    // 绘制标签文字
    ctx.fillStyle = theme.primaryColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const fitLabels = fitText(ctx, labelsStr, labelsWidth, tagHeight, false) as string
    ctx.fillText(fitLabels, labelsX + tagPadding, y + tagHeight / 2)

    // 绘制状态胶囊
    ctx.fillStyle = colors.bgColor
    roundRect(ctx, statusX, y, statusTagWidth, tagHeight, tagHeight / 2)
    ctx.fill()

    ctx.strokeStyle = colors.borderColor
    ctx.lineWidth = 1
    roundRect(ctx, statusX, y, statusTagWidth, tagHeight, tagHeight / 2)
    ctx.stroke()

    // 绘制状态文字
    ctx.fillStyle = colors.textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(statusText, statusX + statusTagWidth / 2, y + tagHeight / 2)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'top'

    return
  }

  // 没有标签时的原始逻辑
  const textWidth = getTextWidth(ctx, statusText)
  const tagWidth = Math.min(textWidth + tagPadding * 2, width - 8)
  if (tagWidth > width) {
    statusText = fitText(ctx, statusText, width - 8, tagHeight, false) as string
  }
  const tagX = x + width - tagWidth - 4

  ctx.fillStyle = colors.bgColor
  roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight / 2)
  ctx.fill()

  ctx.strokeStyle = colors.borderColor
  ctx.lineWidth = 1
  roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight / 2)
  ctx.stroke()

  ctx.fillStyle = colors.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(statusText, tagX + tagWidth / 2, y + tagHeight / 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'top'
}

// 高度计算函数
const calculateHeight: MobileCellHeightCalculator = ({ theme }) => {
  // 根据字体大小动态计算高度,确保文字不会重叠
  const fontSize = parseInt(theme.fontSizeMedium)
  const dynamicHeight = Math.max(MOBILE_PROGRESS_HEIGHT, fontSize + 4)
  return dynamicHeight + MOBILE_LINE_MARGIN * 2
}

// 渲染函数
const render: MobileCellRenderer = ({ ctx, row, state, theme }) => {
  // 根据字体大小动态计算高度
  const fontSize = parseInt(theme.fontSizeMedium)
  const dynamicHeight = Math.max(MOBILE_PROGRESS_HEIGHT, fontSize + 4)
  
  // 布局：进度条50%，百分比文字15%，标签区域35%
  const progressBarWidth = state.width * 0.5
  const progressTextWidth = state.width * 0.15
  const statusTagX = state.x + progressTextWidth + progressBarWidth
  const statusTagWidth = state.width - progressTextWidth - progressBarWidth

  const progressBarX = state.x
  const progressTextX = state.x + progressBarWidth

  // 计算进度值
  let percentDone = Math.min(Math.max(row.percentDone, 0), 1)
  // 校验状态：使用校验进度
  if (row.status === Status.verifying || row.status === Status.queuedToVerify) {
    percentDone = Math.min(Math.max(row.recheckProgress || 0, 0), 1)
  }

  // 绘制进度条
  drawProgressBar(
    ctx,
    percentDone,
    progressBarX,
    state.y + (dynamicHeight - 3) / 2,
    progressBarWidth,
    3,
    theme
  )

  // 绘制百分比文字
  drawProgressText(ctx, percentDone, progressTextX, state.y, progressTextWidth, dynamicHeight, theme)

  // 绘制状态标签（所有状态都显示标签）
  const tagY = state.y + (dynamicHeight - 18) / 2
  drawStatusTag(
    ctx,
    row.status,
    !!row.error || !!row.cachedError,
    statusTagX,
    tagY,
    statusTagWidth,
    18,
    theme,
    row.labels
  )
}

// 第四行：进度条和状态
export const ProgressStatusCell: MobileCellComponent = {
  name: 'ProgressStatusCell',
  calculateHeight,
  render
}
