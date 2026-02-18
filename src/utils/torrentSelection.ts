import type { Torrent } from '@/api/rpc'
import { statusFilterFunMap } from '@/const/status'

/**
 * 根据过滤类型和过滤值获取匹配的种子 ID 数组
 * @param torrents - 所有种子列表
 * @param filterType - 过滤类型: 'status' | 'labels' | 'dir' | 'tracker' | 'error'
 * @param filterValue - 过滤值，如 'all', 'stopped', '标签名', '目录路径' 等
 * @returns 匹配的种子 ID 数组
 */
export function getMatchingTorrentIds(
  torrents: Torrent[],
  filterType: 'status' | 'labels' | 'dir' | 'tracker' | 'error',
  filterValue: string
): number[] {
  // 如果是 'all'，返回空数组（表示不进行筛选）
  if (filterValue === 'all' || !filterValue) {
    return []
  }

  return torrents.filter((t) => isMatchTorrent(t, filterType, filterValue)).map((t) => t.id)
}

/**
 * 判断单个种子是否匹配过滤条件
 */
function isMatchTorrent(
  t: Torrent,
  filterType: 'status' | 'labels' | 'dir' | 'tracker' | 'error',
  filterValue: string
): boolean {
  switch (filterType) {
    case 'status':
      // 状态过滤
      const statusFilter = statusFilterFunMap.get(filterValue)
      return statusFilter ? statusFilter(t) : false

    case 'labels':
      // 标签过滤
      if (filterValue === 'noLabels') {
        return !t.labels || t.labels.length === 0
      }
      return t.labels?.includes(filterValue) ?? false

    case 'dir':
      // 目录过滤（支持递归匹配子目录）
      return t.downloadDir === filterValue || t.downloadDir.startsWith(filterValue + '/')

    case 'tracker':
      // Tracker 过滤
      if (filterValue === 'noTracker') {
        return t.trackerStats.length === 0
      }
      return t.trackerStats.some((tracker) => tracker.host?.includes(filterValue))

    case 'error':
      // 错误过滤
      if (!t.cachedError) {
        return filterValue === 'noError' || filterValue === ''
      }
      return t.cachedError === filterValue

    default:
      return false
  }
}
