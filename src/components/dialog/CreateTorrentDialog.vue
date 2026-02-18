<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('createTorrentDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="width: 90vw; max-width: 800px; padding: 12px"
  >
    <n-el class="create-torrent-content">
      <n-form :model="form" :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120">
        <!-- 文件/文件夹选择 -->
        <n-form-item :label="$t('createTorrentDialog.selectSource')" required>
          <div class="source-buttons">
            <n-button @click="triggerFileSelect">{{ $t('createTorrentDialog.selectFilesButton') }}</n-button>
            <n-button @click="triggerFolderSelect">{{ $t('createTorrentDialog.selectFolderButton') }}</n-button>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              style="display: none"
              @change="onFileInputChange"
            />
            <input
              ref="folderInputRef"
              type="file"
              webkitdirectory
              directory
              multiple
              style="display: none"
              @change="onFolderInputChange"
            />
          </div>
          <div v-if="selectedFiles.length > 0" class="selected-files-info">
            <span>{{ $t('createTorrentDialog.selectedFilesCount', { count: selectedFiles.length }) }}</span>
            <span class="total-size">{{ $t('createTorrentDialog.totalSize', { size: formatSize(totalSize) }) }}</span>
          </div>
        </n-form-item>

        <!-- 已选择的文件列表 -->
        <n-form-item :label="$t('createTorrentDialog.fileList')" v-if="selectedFiles.length > 0">
          <div class="file-list-container">
            <n-scrollbar style="max-height: 200px">
              <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <span class="file-size">{{ formatSize(file.size) }}</span>
                <n-button size="small" quaternary @click="removeFile(index)">
                  <template #icon>
                    <n-icon :component="Close" />
                  </template>
                </n-button>
              </div>
            </n-scrollbar>
          </div>
        </n-form-item>

        <!-- 种子名称 -->
        <n-form-item :label="$t('createTorrentDialog.torrentName')" required>
          <n-input
            v-model:value="form.name"
            :placeholder="$t('createTorrentDialog.torrentNamePlaceholder')"
          />
        </n-form-item>

        <!-- Tracker 列表 -->
        <n-form-item :label="$t('createTorrentDialog.trackers')">
          <n-input
            v-model:value="trackersText"
            type="textarea"
            :placeholder="$t('createTorrentDialog.trackersPlaceholder')"
            :autosize="{ minRows: 4, maxRows: 10 }"
          />
        </n-form-item>

        <!-- Web Seeds -->
        <n-form-item :label="$t('createTorrentDialog.webSeeds')">
          <n-input
            v-model:value="webSeedsText"
            type="textarea"
            :placeholder="$t('createTorrentDialog.webSeedsPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 6 }"
          />
        </n-form-item>

        <!-- 分片大小 -->
        <n-form-item :label="$t('createTorrentDialog.pieceSize')">
          <n-select
            v-model:value="form.pieceLength"
            :options="pieceSizeOptions"
            :placeholder="$t('createTorrentDialog.pieceSizePlaceholder')"
          />
          <div v-if="recommendedPieceSize && form.pieceLength === 0" class="piece-size-hint">
            {{ $t('createTorrentDialog.recommendedPieceSize', { size: formatPieceSize(recommendedPieceSize) }) }}
          </div>
        </n-form-item>

        <!-- 私有种子 -->
        <n-form-item :label="$t('createTorrentDialog.privateTorrent')">
          <n-switch v-model:value="form.private" />
        </n-form-item>

        <!-- 注释 -->
        <n-form-item :label="$t('createTorrentDialog.comment')">
          <n-input
            v-model:value="form.comment"
            type="textarea"
            :placeholder="$t('createTorrentDialog.commentPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 5 }"
          />
        </n-form-item>

        <!-- 创建者 -->
        <n-form-item :label="$t('createTorrentDialog.createdBy')">
          <n-input
            v-model:value="form.createdBy"
            :placeholder="$t('createTorrentDialog.createdByPlaceholder')"
          />
        </n-form-item>
      </n-form>
    </n-el>
    <template #action>
      <div class="flex gap-2 w-full justify-end">
        <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
        <n-button type="primary" @click="onCreate" :loading="loading" :disabled="!canCreate">
          {{ $t('createTorrentDialog.create') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { Close } from '@vicons/ionicons5'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { formatSize } from '@/utils'
import {
  createTorrent,
  downloadTorrent,
  PIECE_SIZES,
  recommendPieceSize,
  type FileInfo
} from '@/utils/bencode'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile.value ? 'top' : 'left'))
const { t: $t } = useI18n()
const message = useMessage()

const show = defineModel<boolean>('show', { required: true })
const loading = ref(false)

// 文件输入 ref
const fileInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)

// 表单数据
const form = reactive({
  name: '',
  pieceLength: 0, // 0 表示自动
  private: false,
  comment: '',
  createdBy: 'Transmission Web'
})

// Tracker 文本
const trackersText = ref('')

// Web Seeds 文本
const webSeedsText = ref('')

// 选中的文件
const selectedFiles = ref<FileInfo[]>([])

// 计算总大小
const totalSize = computed(() => {
  return selectedFiles.value.reduce((sum, f) => sum + f.size, 0)
})

// 推荐的分片大小
const recommendedPieceSize = computed(() => {
  if (totalSize.value === 0) return 0
  return recommendPieceSize(totalSize.value)
})

// 分片大小选项
const pieceSizeOptions = computed(() =>
  PIECE_SIZES.map((p) => ({
    label: p.value === 0 ? $t('createTorrentDialog.autoPieceSize') : p.label,
    value: p.value
  }))
)

// 格式化分片大小
function formatPieceSize(size: number): string {
  const option = PIECE_SIZES.find((p) => p.value === size)
  return option ? option.label : formatSize(size)
}

// 是否可以创建
const canCreate = computed(() => {
  return selectedFiles.value.length > 0 && form.name.trim().length > 0
})

// 触发文件选择
function triggerFileSelect() {
  fileInputRef.value?.click()
}

// 触发文件夹选择
function triggerFolderSelect() {
  folderInputRef.value?.click()
}

// 文件选择处理
async function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    // 检查是否已存在
    if (selectedFiles.value.some((f) => f.name === file.name)) {
      continue
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      selectedFiles.value.push({
        name: file.name,
        size: file.size,
        data: arrayBuffer
      })
    } catch (error) {
      console.error('读取文件失败', error)
      message.error($t('createTorrentDialog.readFileFailed', { name: file.name }))
    }
  }

  // 清空 input 以便可以再次选择
  input.value = ''

  // 自动设置种子名称
  if (selectedFiles.value.length === 1 && !form.name) {
    form.name = selectedFiles.value[0].name.replace(/\.[^.]+$/, '')
  } else if (selectedFiles.value.length > 1 && !form.name) {
    form.name = 'New Torrent'
  }
}

// 文件夹选择处理
async function onFolderInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  // 清空之前选择的文件
  selectedFiles.value = []

  // 获取文件夹名称（从第一个文件的路径中提取）
  const firstFile = files[0]
  const pathParts = firstFile.webkitRelativePath.split('/')
  const folderName = pathParts[0]

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const arrayBuffer = await file.arrayBuffer()
      // 移除文件夹名称前缀，保留相对路径
      const relativePath = file.webkitRelativePath.substring(folderName.length + 1)
      selectedFiles.value.push({
        name: relativePath,
        size: file.size,
        data: arrayBuffer
      })
    } catch (error) {
      console.error('读取文件失败', error)
      message.error($t('createTorrentDialog.readFileFailed', { name: file.name }))
    }
  }

  // 清空 input 以便可以再次选择
  input.value = ''

  // 设置种子名称为文件夹名称
  if (!form.name) {
    form.name = folderName
  }
}

// 移除文件
function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

// 解析 Tracker 列表
function parseTrackers(text: string): string[][] {
  // 每行一个 tracker，空行分隔不同的 tier
  const tiers: string[][] = []
  let currentTier: string[] = []

  const allLines = text.split('\n')
  for (const line of allLines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      if (currentTier.length > 0) {
        tiers.push(currentTier)
        currentTier = []
      }
    } else if (trimmed.startsWith('http') || trimmed.startsWith('udp')) {
      currentTier.push(trimmed)
    }
  }

  if (currentTier.length > 0) {
    tiers.push(currentTier)
  }

  return tiers
}

// 解析 Web Seeds 列表
function parseWebSeeds(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && (line.startsWith('http') || line.startsWith('ftp')))
}

// 取消
function onCancel() {
  show.value = false
}

// 创建种子
async function onCreate() {
  if (selectedFiles.value.length === 0) {
    message.error($t('createTorrentDialog.pleaseSelectFiles'))
    return
  }

  if (!form.name.trim()) {
    message.error($t('createTorrentDialog.pleaseInputName'))
    return
  }

  // 如果是自动，计算推荐分片大小
  const pieceLength = form.pieceLength === 0 ? recommendedPieceSize.value : form.pieceLength

  if (pieceLength === 0) {
    message.error($t('createTorrentDialog.invalidPieceSize'))
    return
  }

  try {
    loading.value = true

    const trackers = parseTrackers(trackersText.value)
    const webSeeds = parseWebSeeds(webSeedsText.value)

    const torrentData = await createTorrent({
      name: form.name.trim(),
      comment: form.comment.trim() || undefined,
      createdBy: form.createdBy.trim() || undefined,
      pieceLength,
      private: form.private,
      trackers,
      webSeeds: webSeeds.length > 0 ? webSeeds : undefined,
      files: selectedFiles.value
    })

    // 下载种子文件
    downloadTorrent(torrentData, form.name.trim())
    message.success($t('createTorrentDialog.createSuccess'))
    show.value = false
  } catch (error) {
    console.error('创建种子失败', error)
    message.error($t('createTorrentDialog.createFailed'))
  } finally {
    loading.value = false
  }
}

// 监听对话框显示
watch(show, (v) => {
  if (v) {
    // 重置表单
    form.name = ''
    form.pieceLength = 0 // 默认自动
    form.private = false
    form.comment = ''
    form.createdBy = 'Transmission Web'
    trackersText.value = ''
    webSeedsText.value = ''
    selectedFiles.value = []
  }
})
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';

.create-torrent-content {
  max-height: calc(100vh - 200px);
  overflow: auto;
  .scrollbar();
}

.source-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.selected-files-info {
  margin-left: 12px;
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--n-text-color-2);

  .total-size {
    color: var(--n-text-color-3);
  }
}

.piece-size-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.file-list-container {
  width: 100%;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--n-border-color);

  &:last-child {
    border-bottom: none;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 12px;
  }

  .file-size {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--n-text-color-3);
    margin-right: 8px;
  }
}
</style>
