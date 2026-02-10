<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('addDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="width: 90vw; max-width: 600px; padding: 12px"
  >
    <n-el class="add-dialog-content">
      <n-form :model="form" :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120">
        <n-form-item :label="$t('addDialog.torrentFile')" required v-if="props.type === 'file'">
          <n-upload :max="50" multiple accept=".torrent" @change="onFileChange">
            <n-button>{{ $t('addDialog.selectFile') }}</n-button>
          </n-upload>
        </n-form-item>
        <n-form-item :label="$t('addDialog.magnetLink')" v-else>
          <n-input
            v-model:value="magnetLink"
            type="textarea"
            :placeholder="$t('addDialog.magnetPlaceholder')"
            :autosize="{
              minRows: 10
            }"
          />
        </n-form-item>

        <n-form-item :label="$t('addDialog.downloadDir')">
          <n-auto-complete
            v-model:value="form['download-dir']"
            :options="downloadDirOptions"
            :placeholder="$t('addDialog.downloadDirPlaceholder')"
            clearable
            :get-show="() => true"
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.labels')">
          <n-select
            v-model:value="form.labels"
            :options="labelsOptions"
            :placeholder="$t('addDialog.labelsPlaceholder')"
            multiple
            clearable
            filterable
            tag
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.startDirectly')">
          <n-switch v-model:value="form.paused" />
        </n-form-item>

        <n-form-item :label="$t('common.priority')">
          <n-select
            v-model:value="form.bandwidthPriority"
            :options="bandwidthPriorityOptions"
            :placeholder="$t('common.priority')"
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.sequentialDownload')" v-if="rpcVersion >= 18">
          <n-switch v-model:value="form.sequential_download" />
        </n-form-item>
      </n-form>
    </n-el>
    <template #action>
      <div class="flex gap-2 w-full justify-end">
        <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
        <n-button type="primary" @click="onConfirm" :loading="loading" :disabled="!canAdd">{{
          $t('common.add')
        }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import type { TorrentAddArgs } from '@/api/rpc'
import { trpc } from '@/api/trpc'
import { useSessionStore, useTorrentStore } from '@/store'
import { sleep } from '@/utils'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import type { UploadFileInfo } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile.value ? 'top' : 'left'))
const torrentStore = useTorrentStore()
const sessionStore = useSessionStore()
const { t: $t } = useI18n()
const rpcVersion = computed(() => sessionStore.rpcVersion)
const props = defineProps<{
  type: 'file' | 'magnet'
}>()
const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const loading = ref(false)
const magnetLink = ref('')
const form = reactive<TorrentAddArgs>({
  'download-dir': '',
  labels: [],
  metainfo: '',
  paused: true,
  bandwidthPriority: undefined,
  sequential_download: false
})

// 判断添加按钮是否可用
const canAdd = computed(() => {
  if (props.type === 'file') {
    // 文件模式：需要选择了文件且选择了下载目录
    return metainfoList.value.length > 0 && form['download-dir']
  } else {
    // 磁力链接模式：需要输入了磁力链接
    return magnetLink.value.trim().length > 0
  }
})

// 多文件上传的 metainfo 列表
const metainfoList = ref<string[]>([])

const bandwidthPriorityOptions = computed(() => [
  { label: $t('priority.low'), value: -1 },
  { label: $t('priority.normal'), value: 0 },
  { label: $t('priority.high'), value: 1 }
])

const downloadDirOptions = computed(() =>
  torrentStore.downloadDirOptions
    .filter((item: any) => item.key !== 'all')
    .map((item: any) => ({
      label: item.label.replace(/（.*?）/, ''),
      value: item.key
    }))
)
const labelsOptions = computed(() =>
  torrentStore.labelsOptions
    .filter((item: any) => item.key !== 'all' && item.key !== 'noLabels')
    .map((item: any) => ({
      label: item.label.replace(/（.*?）/, ''),
      value: item.key
    }))
)

async function onFileChange(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  // 支持多文件上传
  const files = data.fileList.map((f) => f.file).filter((f): f is File => f !== undefined)
  if (files.length === 0) {
    metainfoList.value = []
    return
  }
  try {
    metainfoList.value = await Promise.all(files.map((f) => readLocalTorrent(f)))
  } catch {
    message.error($t('addDialog.readFileFailed'))
    metainfoList.value = []
  }
}

async function readLocalTorrent(file: File): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const b64 = (reader.result as string).match(/data:[^/]*\/[^;]*;base64,(.*)/)?.[1]
      if (b64 === undefined) {
        throw Error('Error reading file')
      }
      resolve(b64)
    }
    reader.readAsDataURL(file)
  })
}

function onCancel() {
  show.value = false
}

async function addTask(metainfo: string, filename?: string) {
  try {
    const res = await trpc.torrentAdd({
      'download-dir': form['download-dir']?.trim(),
      filename: filename,
      labels: form.labels,
      metainfo: metainfo,
      paused: !form.paused,
      bandwidthPriority: form.bandwidthPriority,
      sequential_download: form.sequential_download
    })
    console.debug('添加种子', res)
    if (res.arguments['torrent-duplicate']) {
      return { success: false, duplicate: true }
    }
    return { success: true }
  } catch (error) {
    console.error('添加种子失败', error)
    return { success: false, error }
  }
}

async function onConfirm() {
  if (props.type === 'file') {
    if (!metainfoList.value || metainfoList.value.length === 0) {
      message.error($t('addDialog.pleaseSelectFile'))
      return
    }
    if (!form['download-dir']) {
      message.error($t('addDialog.pleaseSelectDir'))
      return
    }
    try {
      loading.value = true
      const results = await Promise.all(
        metainfoList.value.map(async (metainfo) => {
          return await addTask(metainfo)
        })
      )
      // 检查是否全部重复
      const allDuplicate = results.every((r) => r.duplicate)
      if (allDuplicate) {
        message.warning($t('addDialog.torrentExists'))
      } else {
        message.success($t('addDialog.addSuccess'))
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }
      show.value = false
    } catch {
    } finally {
      loading.value = false
    }
  } else {
    if (!magnetLink.value) {
      message.error($t('addDialog.pleaseInputMagnet'))
      return
    }
    // 解析磁力链接
    const magnetLinks = magnetLink.value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    try {
      loading.value = true
      const results = await Promise.all(
        magnetLinks.map(async (magnet) => {
          return await addTask('', magnet)
        })
      )
      const allDuplicate = results.every((r) => r.duplicate)
      if (allDuplicate) {
        message.warning($t('addDialog.torrentExists'))
      } else {
        message.success($t('addDialog.addSuccess'))
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }
      show.value = false
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }
}

watch(show, (v) => {
  if (v) {
    const dir = sessionStore.session?.['download-dir']
    Object.assign(form, {
      'download-dir': dir,
      labels: [],
      metainfo: '',
      paused: true,
      bandwidthPriority: undefined,
      sequential_download: false
    })
    metainfoList.value = []
    magnetLink.value = ''
  }
})
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';
.add-dialog-content {
  max-height: calc(100vh - 200px);
  overflow: auto;
  .scrollbar();
}
</style>
