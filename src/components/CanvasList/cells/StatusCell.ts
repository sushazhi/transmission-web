import type { Torrent } from '@/api/rpc'
import type { ColumnConfig } from '@/composables/useColumns'
import i18n from '@/i18n'
import { getStatusString, Status } from '@/types/tr'
import { drawText, fitText } from './utils'
import { useSettingStore } from '@/store'
import { PADDING_X } from '../store/utils'

const getEllipsisTxt = (function () {
  const cache = new Map<string, string>()
  return function (txt: string, maxWidth: number, maxHeight: number) {
    const ctx = document.createElement('canvas').getContext('2d')!
    const settingStore = useSettingStore()
    const theme = settingStore.themeVars
    ctx.font = `${theme.fontSize} ${theme.fontFamily}`
    if (cache.has(txt)) {
      return cache.get(txt) as string
    }
    const text = fitText(ctx, txt, maxWidth, maxHeight, false) as string
    cache.set(txt, text)
    return text
  }
})()

export default function render(
  ctx: CanvasRenderingContext2D,
  row: Torrent,
  col: ColumnConfig,
  state: { x: number; y: number; rowHeight: number }
) {
  ctx.save()
  const t = i18n.global.t
  let statusStr = ''

  // 校验状态 - 只显示文字，不显示进度百分比（进度由进度条显示）
  if (row.status === Status.verifying || row.status === Status.queuedToVerify) {
    statusStr = t('status.verifying')
  } else if (row.status === Status.downloading && row.pieceCount === 0) {
    statusStr = t('status.getMeta')
  } else if (row.status === Status.downloading && row.sequentialDownload === true) {
    statusStr = t('status.sequential')
  } else {
    statusStr = getStatusString(row.status)
  }

  const fitTxt = getEllipsisTxt(statusStr, col.width, state.rowHeight)
  drawText(ctx, fitTxt, state.x + col.width / 2, state.y, col.width, state.rowHeight, 'center')
  ctx.restore()
}
