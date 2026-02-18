import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

export interface ColumnConfig {
  key: string
  width: number
  visible: boolean
}

export const allColumns = [
  { key: 'name', fixed: true },
  { key: 'totalSize' },
  { key: 'sizeWhenDone' },
  { key: 'leftUntilDone' },
  { key: 'haveValid' },
  { key: 'downloadedEver' },
  { key: 'uploadedEver' },
  { key: 'uploadedDownloaded' },
  { key: 'percentDone' },
  { key: 'rateDownload' },
  { key: 'rateUpload' },
  { key: 'status' },
  { key: 'addedDate' },
  { key: 'peersSendingToUs' },
  { key: 'peersGettingFromUs' },
  { key: 'eta' },
  { key: 'uploadRatio' },
  { key: 'cachedMainTracker' },
  { key: 'cachedTrackerStatus' },
  { key: 'doneDate' },
  { key: 'activityDate' },
  { key: 'downloadDir' },
  { key: 'bandwidthPriority' },
  { key: 'id' },
  { key: 'queuePosition' },
  { key: 'isPrivate' },
  { key: 'labels' },
  { key: 'secondsSeeding' },
  { key: 'group' },
  { key: 'file-count' },
  { key: 'pieceCount' },
  { key: 'metadataPercentComplete' }
]

export const defaultVisibleColumns = [
  'name',
  'totalSize',
  'haveValid',
  'downloadedEver',
  'uploadedEver',
  'percentDone',
  'rateDownload',
  'rateUpload',
  'status',
  'addedDate',
  'peersSendingToUs',
  'peersGettingFromUs',
  'uploadRatio',
  'bandwidthPriority',
  'labels',
  'secondsSeeding'
]

export function useColumns(storageKey = 'torrent-columns') {
  const { t } = useI18n()

  // 初始化 visibleColumns
  const columns = useStorage<ColumnConfig[]>(
    storageKey,
    allColumns.map((col) => {
      const isDefaultVisible = defaultVisibleColumns.includes(col.key)
      return {
        key: col.key,
        width: 100,
        visible: col.key === 'name' ? true : isDefaultVisible
      }
    })
  )

  // name 列默认显示
  function setVisibleColumns(cols: ColumnConfig[]) {
    columns.value = cols.map((col) => (col.key === 'name' ? { ...col, visible: true } : col))
  }

  function updateColumnWidth(key: string, width: number) {
    columns.value = columns.value.map((col) => (col.key === key ? { ...col, width } : col))
  }

  function toggleColumnVisible(key: string) {
    if (key === 'name') {
      return
    }
    columns.value = columns.value.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
  }

  function moveColumn(from: number, to: number) {
    const arr = [...columns.value]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    columns.value = arr
  }

  // 获取列的国际化标题
  function getColumnTitle(key: string): string {
    return t(`columns.${key}`)
  }

  const visibleColumns = computed(() => columns.value.filter((col) => col.visible))
  const tableMinWidth = computed(() => visibleColumns.value.reduce((sum, col) => sum + (col.width || 150), 0))
  const mapColumnWidth = computed(() => {
    return visibleColumns.value.reduce(
      (acc, col) => {
        acc[col.key] = col.width
        return acc
      },
      {} as Record<string, number>
    )
  })
  return {
    columns,
    setVisibleColumns,
    updateColumnWidth,
    toggleColumnVisible,
    moveColumn,
    getColumnTitle,
    visibleColumns,
    tableMinWidth,
    mapColumnWidth
  }
}
