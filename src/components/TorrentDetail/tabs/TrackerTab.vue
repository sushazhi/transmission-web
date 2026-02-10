<template>
  <div class="tracker-tab">
    <div class="tracker-header">
      <n-button @click="handleChangeTracker" size="small">{{ t('torrentDetail.tracker.modifyTracker') }}</n-button>
    </div>

    <!-- 移动端：卡片列表 -->
    <div v-if="isMobile" class="tracker-cards">
      <div v-for="tracker in torrent.trackerStats || []" :key="tracker.id" class="tracker-card">
        <div class="tracker-card-row">
          <span class="tracker-card-label">{{ t('torrentDetail.tracker.url') }}:</span>
          <span class="tracker-card-value tracker-url">{{ tracker.announce }}</span>
        </div>
        <div class="tracker-card-row">
          <span class="tracker-card-label">{{ t('torrentDetail.tracker.status') }}:</span>
          <span class="tracker-card-value">{{ getTrackerAnnounceState(tracker) }}</span>
        </div>
        <div class="tracker-card-row">
          <span class="tracker-card-label">{{ t('torrentDetail.tracker.nextAnnounce') }}:</span>
          <span class="tracker-card-value">{{ formatNextAnnounce(tracker) }}</span>
        </div>
        <div class="tracker-card-stats">
          <span>{{ t('torrentDetail.tracker.seederCount') }}: {{ tracker.seederCount || 0 }}</span>
          <span>{{ t('torrentDetail.tracker.leecherCount') }}: {{ tracker.leecherCount || 0 }}</span>
          <span>{{ t('torrentDetail.tracker.downloadCount') }}: {{ tracker.downloadCount || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 桌面端：表格 -->
    <div v-else class="table-container">
      <n-data-table
        :columns="columns"
        :data="torrent.trackerStats || []"
        :row-key="(row: any) => row.id"
        size="small"
        :pagination="false"
        :bordered="false"
      />
    </div>
  </div>
  <ChangeTracker v-model:show="showChangeTrackerDialog" :ids="[torrent.id]" />
</template>

<script setup lang="ts">
import type { Torrent, TrackerStat } from '@/api/rpc'
import { getTrackerAnnounceState } from '@/store/torrentUtils'
import { timeToStr } from '@/utils'
import type { DataTableColumns } from 'naive-ui'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isMobile = useIsSmallScreen()

defineProps<{ torrent: Torrent }>()
const showChangeTrackerDialog = ref(false)

function handleChangeTracker() {
  showChangeTrackerDialog.value = true
}

// 格式化下次汇报时间
function formatNextAnnounce(row: TrackerStat): string {
  if (!row.nextAnnounceTime || row.announceState !== 1) {
    return '-'
  }
  const timestamp = row.nextAnnounceTime

  const now = Math.floor(Date.now() / 1000)
  const remaining = timestamp - now

  if (remaining <= 0) {
    return '0s'
  }

  return timeToStr(remaining)
}

// 表格列配置
const columns: DataTableColumns<TrackerStat> = [
  {
    title: t('torrentDetail.tracker.url'),
    key: 'announce',
    width: 300,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: t('torrentDetail.tracker.status'),
    key: 'status',
    width: 80,
    render: (row) => getTrackerAnnounceState(row)
  },
  {
    title: t('torrentDetail.tracker.nextAnnounce'),
    key: 'nextAnnounceTime',
    width: 120,
    render: (row) => formatNextAnnounce(row)
  },
  {
    title: t('torrentDetail.tracker.seederCount'),
    key: 'seederCount',
    width: 80,
    align: 'right',
    render: (row) => row.seederCount?.toString() || '0'
  },
  {
    title: t('torrentDetail.tracker.leecherCount'),
    key: 'leecherCount',
    width: 80,
    align: 'right',
    render: (row) => row.leecherCount?.toString() || '0'
  },
  {
    title: t('torrentDetail.tracker.downloadCount'),
    key: 'downloadCount',
    width: 80,
    align: 'right',
    render: (row) => row.downloadCount?.toString() || '0'
  }
]
</script>

<style scoped lang="less">
.tracker-tab {
  .tracker-header {
    margin-bottom: 8px;
  }
  .table-container {
    width: 100%;
  }
  :deep(.n-data-table) {
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
  .tracker-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tracker-card {
    background: var(--card-color);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--border-color);
  }

  .tracker-card-row {
    display: flex;
    margin-bottom: 6px;
    align-items: baseline;
  }

  .tracker-card-label {
    color: var(--text-color-secondary);
    font-size: 12px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .tracker-card-value {
    font-size: 13px;
    word-break: break-all;

    &.tracker-url {
      font-size: 12px;
      color: var(--primary-color);
    }
  }

  .tracker-card-stats {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
    font-size: 12px;
    color: var(--text-color-secondary);
  }
}
</style>
