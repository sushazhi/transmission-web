<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { Status } from '@/types/tr'
interface Column {
  key: string
  title: string
  cellComponent: string
  [key: string]: any
}
const props = defineProps<{ value: number; row: Torrent; col: Column }>()

const percentage = computed(() => {
  let percent = Math.round(props.value * 100)
  // 校验状态：使用校验进度
  if (props.row.status === Status.verifying || props.row.status === Status.queuedToVerify) {
    percent = Math.round((props.row.recheckProgress || 0) * 100)
  } else {
    // 下载状态：计算下载进度
    // 目前 返回的数据中percentDone在下载的时候一直是 0
    const sizeWhenDone = Number(props.row.sizeWhenDone)
    const downloadedEver = Number(props.row.downloadedEver)
    if (downloadedEver > 0) {
      percent = Math.max(percent, Math.min(Math.round((downloadedEver / sizeWhenDone) * 100), 100))
    }
  }
  return Math.min(Math.max(percent, 0), 100)
})
const active = computed(() => {
  return props.row.rateDownload > 0 || props.row.rateUpload > 0
})
</script>
<template>
  <div>
    <n-progress
      type="line"
      :height="22"
      :border-radius="4"
      :percentage="percentage"
      indicator-placement="inside"
      :processing="active"
    />
  </div>
</template>
