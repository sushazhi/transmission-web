<template>
  <div class="peers-tab">
    <!-- 移动端：卡片列表 -->
    <div v-if="isMobile" class="peer-cards">
      <div v-for="peer in peerData" :key="peer.key" class="peer-card">
        <div class="peer-card-header">
          <span class="peer-country" v-html="peer.countryDisplay || '🌐'"></span>
          <span class="peer-address">{{ peer.address }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.client') }}: {{ peer.clientName || '-' }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.progress') }}: {{ ((peer.progress || 0) * 100).toFixed(1) }}%</span>
          <span>{{ getPeerStatus(peer) }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.uploadSpeed') }}: {{ formatSpeed(peer.rateToPeer || 0) }}</span>
          <span>{{ t('torrentDetail.peers.downloadSpeed') }}: {{ formatSpeed(peer.rateToClient || 0) }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.port') }}: {{ peer.port || '-' }}</span>
          <span>{{ t('torrentDetail.peers.encryption') }}: {{ getEncryptionStatus(peer.flagStr) }}</span>
        </div>
      </div>
    </div>

    <!-- 桌面端：表格 -->
    <div v-else class="table-container">
      <n-data-table
        :columns="columns"
        :data="peerData"
        :pagination="pagination"
        size="small"
        :bordered="false"
        :paginate-single-page="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Torrent, Peer } from '@/api/rpc'
import type { DataTableColumns } from 'naive-ui'
import { formatSpeed } from '@/utils'
import { h, computed, ref, watch } from 'vue'
import { NProgress } from 'naive-ui'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useI18n } from 'vue-i18n'
import { getCountryDisplay, getCountryCodeAsync, getCachedCountryCode, hasCachedCountryCode } from '@/utils/ipLookup'

const { t } = useI18n()
const isMobile = useIsSmallScreen()

const props = defineProps<{ torrent: Torrent }>()

// 排序状态
const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

// 触发刷新的计数器
const refreshCounter = ref(0)

// 处理列点击排序
function handleSort(columnKey: string) {
  if (sortKey.value === columnKey) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = columnKey
    sortOrder.value = 'desc'
  }
}

// 计算 peer 数据（包含排序和国家显示）
const peerData = computed(() => {
  // 依赖 refreshCounter 来触发重新计算
  refreshCounter.value

  let peers = (props.torrent.peers || []).map((peer: Peer) => {
    const address = peer.address || ''

    // 获取国家显示
    const countryDisplay = getCountryDisplay(address)

    return {
      ...peer,
      key: `${address}:${peer.port || 0}`,
      countryDisplay,
      countryCode: getCachedCountryCode(address) || ''
    }
  })

  // 排序逻辑
  if (sortKey.value) {
    peers = [...peers].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      let aVal = a[sortKey.value!]
      let bVal = b[sortKey.value!]

      // 特殊处理
      if (sortKey.value === 'clientName') {
        aVal = aVal || ''
        bVal = bVal || ''
      } else if (sortKey.value === 'progress') {
        aVal = aVal || 0
        bVal = bVal || 0
      } else if (sortKey.value === 'rateToPeer' || sortKey.value === 'rateToClient') {
        aVal = aVal || 0
        bVal = bVal || 0
      } else if (sortKey.value === 'port') {
        aVal = Number(a.port) || 0
        bVal = Number(b.port) || 0
      } else if (sortKey.value === 'countryCode') {
        aVal = a.countryCode || ''
        bVal = b.countryCode || ''
      }

      if (typeof aVal === 'string') {
        return sortOrder.value === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      } else {
        return sortOrder.value === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
      }
    })
  }

  return peers
})

// 监听 peers 变化，触发国家代码查询
watch(
  () => props.torrent.peers,
  (peers) => {
    if (peers) {
      peers.forEach((peer) => {
        const address = peer.address || ''
        if (address && !hasCachedCountryCode(address)) {
          getCountryCodeAsync(address).then(() => {
            // 查询完成后触发刷新
            refreshCounter.value++
          })
        }
      })
    }
  },
  { immediate: true, deep: true }
)

// 分页配置
const pagination = {
  pageSize: 100,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
}

// 排序图标组件
function SortIcon({ columnKey }: { columnKey: string }) {
  if (sortKey.value === columnKey) {
    return h('span', { class: 'sort-icon' }, sortOrder.value === 'asc' ? '↑' : '↓')
  }
  return null
}

// 表格列配置
const columns: DataTableColumns<Peer & { key: string; countryDisplay: string; countryCode: string }> = [
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('countryCode')
        },
        [h('span', t('torrentDetail.peers.country')), h(SortIcon, { columnKey: 'countryCode' })]
      ),
    key: 'countryDisplay',
    width: 100,
    render: (row) =>
      h('span', {
        innerHTML: row.countryDisplay || '🌐',
        style: 'display: inline-flex; align-items: center; white-space: nowrap;'
      })
  },
  {
    title: t('torrentDetail.peers.ip'),
    key: 'address',
    width: 320,
    ellipsis: { tooltip: true }
  },
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('port')
        },
        [h('span', t('torrentDetail.peers.port')), h(SortIcon, { columnKey: 'port' })]
      ),
    key: 'port',
    width: 80,
    render: (row) => row.port || '-'
  },
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('clientName')
        },
        [h('span', t('torrentDetail.peers.client')), h(SortIcon, { columnKey: 'clientName' })]
      ),
    key: 'clientName',
    width: 140,
    render: (row) => row.clientName || '-'
  },
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('progress')
        },
        [h('span', t('torrentDetail.peers.progress')), h(SortIcon, { columnKey: 'progress' })]
      ),
    key: 'progress',
    width: 100,
    render: (row) => {
      const percentage = row.progress ? Number((row.progress * 100).toFixed(2)) : 0
      return h(NProgress, {
        type: 'line',
        size: 'small',
        percentage: percentage,
        'indicator-placement': 'inside',
        processing: !(row.progress === 1),
        'show-indicator': false
      })
    }
  },
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('rateToPeer')
        },
        [h('span', t('torrentDetail.peers.uploadSpeed')), h(SortIcon, { columnKey: 'rateToPeer' })]
      ),
    key: 'rateToPeer',
    width: 120,
    align: 'right',
    render: (row) => formatSpeed(row.rateToPeer || 0)
  },
  {
    title: () =>
      h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer',
          onClick: () => handleSort('rateToClient')
        },
        [h('span', t('torrentDetail.peers.downloadSpeed')), h(SortIcon, { columnKey: 'rateToClient' })]
      ),
    key: 'rateToClient',
    width: 120,
    align: 'right',
    render: (row) => formatSpeed(row.rateToClient || 0)
  },
  {
    title: t('torrentDetail.peers.encryption'),
    key: 'encryption',
    width: 60,
    render: (row) => getEncryptionStatus(row.flagStr)
  },
  {
    title: t('torrentDetail.peers.status'),
    key: 'status',
    width: 60,
    render: (row) => getPeerStatus(row)
  }
]

// 获取加密状态
const getEncryptionStatus = (flagStr?: string) => {
  if (!flagStr) {
    return t('torrentDetail.peers.no')
  }
  // 检查是否包含加密标志 'E' (Encrypted)
  // E: 表示连接已加密
  return flagStr.includes('E') ? t('torrentDetail.peers.yes') : t('torrentDetail.peers.no')
}

// Flag meanings: https://github.com/transmission/transmission/blob/main/docs/Peer-Status-Text.md

const statusFlagStrings = {
  O: 'O',
  D: 'D',
  d: 'd',
  U: 'U',
  u: 'u',
  K: 'K',
  '?': '?'
} as const

// 获取 Peer 状态
const getPeerStatus = (peer: Peer) => {
  const flags = peer.flagStr as string
  const status = [...flags.matchAll(/[ODdUuK?]/g)].map((s) => statusFlagStrings[s[0] as keyof typeof statusFlagStrings])

  return status.join('') || '-'
}
</script>

<style scoped lang="less">
.peers-tab {
  .peer-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .inline-flags {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .inline-flags img {
    width: 20px;
    height: 15px;
    vertical-align: middle;
  }
  .peer-flag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .table-container {
    width: 100%;
  }
  :deep(.n-data-table) {
    // 不要表格内的scroll
    .n-scrollbar {
      overflow: visible;
      .n-scrollbar-container {
        width: auto;
        height: auto;
        overflow: visible;
      }
    }
    .n-data-table-thead {
      position: sticky;
      top: calc(var(--spacing) * -3);
      background-color: var(--card-color);
      z-index: 1;
    }
  }

  // 移动端卡片布局
  .peer-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .peer-card {
    background: var(--card-color);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--border-color);
  }

  .peer-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .peer-flag {
    font-size: 18px;
  }

  .peer-country {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .peer-address {
    font-size: 13px;
    word-break: break-all;
    color: var(--primary-color);
  }

  .peer-card-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--text-color-secondary);
  }
}

.sort-icon {
  font-size: 12px;
  line-height: 1;
}

// 国旗图片样式
.country-flag {
  width: 20px;
  height: 15px;
  vertical-align: middle;
  margin-right: 4px;
  display: inline-block;
}

// 国家/地区单元格样式
:deep(.n-data-table-td[data-col-key='countryDisplay']) {
  white-space: nowrap;
}
</style>
