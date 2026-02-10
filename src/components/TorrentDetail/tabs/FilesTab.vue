<template>
  <div class="files-tab" :class="{ 'mobile-view': isMobile }">
    <div class="title">
      <div class="file-info">
        <n-text class="text-xs">
          {{ t('torrentDetail.files.fileCount') }}: {{ totalFiles }} | {{ t('torrentDetail.files.selectedDownload') }}:
          {{ selectedFiles }} | {{ t('torrentDetail.files.totalSize') }}: {{ formatSize(totalSize) }}
        </n-text>
      </div>
      <div class="action-bar">
        <n-input
          v-model:value="fileSearch"
          :placeholder="t('common.searchPlaceholder')"
          clearable
          :size="isMobile ? 'medium' : 'small'"
          :style="{ width: isMobile ? '100%' : '200px' }"
        >
          <template #prefix>
            <n-icon><SearchIcon /></n-icon>
          </template>
        </n-input>
        <n-button size="small" @click="selectAll">{{ t('torrentDetail.files.selectAll') }}</n-button>
        <n-dropdown :options="priorityOptions" @select="handleBatchPriority" placement="bottom-end">
          <n-button size="small">{{ t('torrentDetail.files.batchSetPriority') }}</n-button>
        </n-dropdown>
      </div>
    </div>
    <div class="content">
      <n-tree
        ref="treeRef"
        :data="treeData"
        :checked-keys="checkedKeys"
        :render-label="renderLabel"
        :render-prefix="renderPrefix"
        :render-suffix="renderSuffix"
        checkable
        cascade
        check-strategy="child"
        @update:checked-keys="onCheckedKeysChange"
        expand-on-click
        :default-expanded-keys="defaultExpandedKeys"
        key-field="key"
        children-field="children"
        default-expand-all
        virtual-scroll
        style="height: 100%"
        class="file-tree"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { rpc } from '@/api/rpc'
import { formatSize } from '@/utils'
import { getPriorityString, type PriorityNumberType } from '@/types/tr'
import type { TreeOption } from 'naive-ui'
import { h, computed, ref, watch } from 'vue'
import { NProgress, NTag, NDropdown, NButton, useMessage, NText, NTree } from 'naive-ui'
import { FolderOutline, DocumentOutline, Search as SearchIcon } from '@vicons/ionicons5'
import { priorityOptions, priorityTagColorConfig } from '@/components/AppHeader/priority'
import { useTorrentStore } from '@/store'
import { useI18n } from 'vue-i18n'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'

const { t } = useI18n()
const isMobile = useIsSmallScreen()

interface FileTreeNode extends TreeOption {
  key: string
  label: string
  fileIndex?: number
  isDirectory: boolean
  size: number
  progress: number
  priority: number
  wanted: boolean
  children?: FileTreeNode[]
  path: string
}

const props = defineProps<{ torrent: Torrent }>()
const message = useMessage()
const treeRef = ref()
const torrentStore = useTorrentStore()
const fileSearch = ref('')

// 响应式数据
const checkedKeys = ref<string[]>([])

// 构建文件树结构
const treeData = computed(() => {
  if (!props.torrent.files || !props.torrent.fileStats) {
    return []
  }

  const files = props.torrent.files
  const fileStats = props.torrent.fileStats
  const searchTerm = fileSearch.value.toLowerCase()

  const root: FileTreeNode[] = []
  const pathMap = new Map<string, FileTreeNode>()

  files.forEach((file, index) => {
    const stat = fileStats[index]
    if (!stat) {
      return
    }

    // 过滤：如果搜索词不为空，只显示匹配的文件/目录
    if (searchTerm && !file.name.toLowerCase().includes(searchTerm)) {
      return
    }

    const parts = file.name.split('/')
    let currentPath = ''
    let currentLevel = root

    // 构建目录结构
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLastPart = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      let existingNode = pathMap.get(currentPath)

      if (!existingNode) {
        const node: FileTreeNode = {
          key: currentPath,
          label: part,
          isDirectory: !isLastPart,
          size: isLastPart ? file.length : 0,
          progress: isLastPart ? (file.length > 0 ? file.bytesCompleted / file.length : 0) : 0,
          priority: isLastPart ? stat.priority : 0,
          wanted: isLastPart ? stat.wanted : true,
          children: isLastPart ? undefined : [],
          path: currentPath,
          fileIndex: isLastPart ? index : undefined
        }

        pathMap.set(currentPath, node)
        currentLevel.push(node)
        existingNode = node
      }

      if (!isLastPart && existingNode.children) {
        currentLevel = existingNode.children
      }
    }
  })

  // 更新目录的统计信息
  const updateDirectoryStats = (nodes: FileTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.isDirectory && node.children) {
        updateDirectoryStats(node.children)

        // 计算目录的总大小和进度
        let totalSize = 0
        let totalCompleted = 0
        let allWanted = true
        let hasWanted = false

        node.children.forEach((child) => {
          totalSize += child.size
          totalCompleted += child.size * child.progress
          if (child.wanted) {
            hasWanted = true
          } else {
            allWanted = false
          }
        })

        node.size = totalSize
        node.progress = totalSize > 0 ? totalCompleted / totalSize : 0
        node.wanted = allWanted || hasWanted // 如果有子文件需要下载，则目录也标记为需要
      }
    })
  }

  updateDirectoryStats(root)
  return root
})

// 计算统计信息
const totalFiles = computed(() => props.torrent.files?.length || 0)
const selectedFiles = computed(() => {
  return props.torrent.fileStats?.filter((stat) => stat.wanted).length || 0
})
const totalSize = computed(() => {
  return props.torrent.files?.reduce((sum, file) => sum + file.length, 0) || 0
})

// 默认展开的节点
const defaultExpandedKeys = computed(() => {
  const keys: string[] = []
  const collectDirectoryKeys = (nodes: FileTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.isDirectory) {
        keys.push(node.key)
        if (node.children) {
          collectDirectoryKeys(node.children)
        }
      }
    })
  }
  collectDirectoryKeys(treeData.value)
  return keys
})

// 更新选中状态
watch(
  () => props.torrent.fileStats,
  (newStats) => {
    if (newStats) {
      const newCheckedKeys: string[] = []
      props.torrent.files?.forEach((file, index) => {
        if (newStats[index]?.wanted) {
          newCheckedKeys.push(file.name)
        }
      })
      checkedKeys.value = newCheckedKeys
    }
  },
  { immediate: true }
)

// 渲染文件/目录标签
const renderLabel = (props: any) => {
  const option = props.option as FileTreeNode
  return h('span', { class: 'truncate flex-1' }, option.label)
}

// 渲染前缀图标
const renderPrefix = (props: any) => {
  const option = props.option as FileTreeNode
  const IconComponent = option.isDirectory ? FolderOutline : DocumentOutline
  return h('div', { class: 'flex items-center' }, [h(IconComponent, { size: 16, class: 'w-[16px] h-[16px]' })])
}

// 渲染后缀信息
const renderSuffix = (props: any) => {
  const option = props.option as FileTreeNode
  return h('div', { class: 'flex items-center gap-1 text-xs' }, [
    // 大小
    h('span', { class: 'text-gray-500 min-w-[80px] text-right' }, formatSize(option.size)),
    // 进度条
    h(NProgress, {
      type: 'line',
      size: 'small',
      percentage: Math.round(option.progress * 100),
      'show-indicator': false,
      style: { width: '100px' }
    }),
    // 进度百分比
    h('span', { class: 'text-gray-500 min-w-[40px] text-right' }, `${Math.round(option.progress * 100)}%`),
    // 优先级下拉选择
    !option.isDirectory
      ? h(
          NDropdown,
          {
            options: priorityOptions,
            size: 'small',
            trigger: 'click',
            onSelect: (key: number) => handleFilePriority(option.fileIndex!, key)
          },
          () =>
            h(
              NTag,
              {
                size: 'small',
                color: priorityTagColorConfig[option.priority],
                round: true,
                bordered: false,
                style: { cursor: 'pointer', minWidth: '48px', justifyContent: 'center' }
              },
              () => getPriorityString(option.priority as PriorityNumberType) || t('torrentDetail.files.normal')
            )
        )
      : null
  ])
}

// 处理选中状态变化
const onCheckedKeysChange = async (keys: string[]) => {
  checkedKeys.value = keys

  // 获取需要下载和不需要下载的文件索引
  const wantedIndices: number[] = []
  const unwantedIndices: number[] = []

  props.torrent.files?.forEach((file, index) => {
    if (keys.includes(file.name)) {
      wantedIndices.push(index)
    } else {
      unwantedIndices.push(index)
    }
  })

  try {
    await rpc.torrentSet({
      ids: props.torrent.id,
      'files-wanted': wantedIndices,
      'files-unwanted': unwantedIndices
    })
    message.success(t('torrentDetail.files.fileSelectionUpdated'))
  } catch (error) {
    console.error('更新文件选择失败:', error)
    message.error(t('torrentDetail.files.updateFileSelectionFailed'))
  }
}

// 全选
const selectAll = async () => {
  const allKeys = props.torrent.files?.map((file) => file.name) || []
  checkedKeys.value = allKeys

  const wantedIndices = props.torrent.files?.map((_, index) => index) || []

  try {
    await rpc.torrentSet({
      ids: props.torrent.id,
      'files-wanted': wantedIndices,
      'files-unwanted': []
    })
    message.success(t('torrentDetail.files.allFilesSelected'))
  } catch (error) {
    console.error('全选失败:', error)
    message.error(t('torrentDetail.files.selectAllFailed'))
  }
}

// 批量设置优先级
const handleBatchPriority = async (priority: number) => {
  const selectedIndices: number[] = []

  props.torrent.files?.forEach((file, index) => {
    if (checkedKeys.value.includes(file.name)) {
      selectedIndices.push(index)
    }
  })

  if (selectedIndices.length === 0) {
    message.warning(t('torrentDetail.files.pleaseSelectFiles'))
    return
  }

  try {
    const priorityArgs: Record<string, number[]> = {}

    if (priority === 1) {
      priorityArgs['priority-high'] = selectedIndices
    } else if (priority === -1) {
      priorityArgs['priority-low'] = selectedIndices
    } else {
      priorityArgs['priority-normal'] = selectedIndices
    }

    await rpc.torrentSet({
      ids: props.torrent.id,
      ...priorityArgs
    })
    torrentStore.fetchDetails()
    message.success(
      t('torrentDetail.files.prioritySet', {
        count: selectedIndices.length,
        priority: getPriorityString(priority as PriorityNumberType)
      })
    )
  } catch (error) {
    console.error('设置优先级失败:', error)
    message.error(t('torrentDetail.files.setPriorityFailed'))
  }
}

// 单个文件优先级设置
const handleFilePriority = async (fileIndex: number, priority: number) => {
  try {
    const priorityArgs: Record<string, number[]> = {}

    if (priority === 1) {
      priorityArgs['priority-high'] = [fileIndex]
    } else if (priority === -1) {
      priorityArgs['priority-low'] = [fileIndex]
    } else {
      priorityArgs['priority-normal'] = [fileIndex]
    }

    await rpc.torrentSet({
      ids: props.torrent.id,
      ...priorityArgs
    })
    torrentStore.fetchDetails()

    message.success(
      t('torrentDetail.files.filePrioritySet', { priority: getPriorityString(priority as PriorityNumberType) })
    )
  } catch (error) {
    console.error('设置文件优先级失败:', error)
    message.error(t('torrentDetail.files.setFilePriorityFailed'))
  }
}
</script>

<style scoped lang="less">
.files-tab {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  .title {
    flex-shrink: 0;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;

    .file-info {
      flex-shrink: 0;
    }

    .action-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
      justify-content: flex-end;
    }
  }

  .content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  // 移动端布局
  &.mobile-view {
    .title {
      flex-direction: column;
      align-items: stretch;
      padding: 8px;

      .file-info {
        margin-bottom: 4px;
      }

      .action-bar {
        justify-content: flex-start;
        gap: 8px;

        > .n-input {
          flex: 2;
          min-width: 0;
        }

        > .n-button {
          flex: 0 0 auto;
          min-width: 0;
          padding: 0 8px;
        }
      }
    }

    .content {
      padding: 0 8px 8px;
    }
  }

  :deep(.n-tree) {
    .n-tree-node-content {
      height: 32px;

      .n-tree-node-content__text {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
      }
    }

    .n-tree-node-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.file-tree {
  :deep(.n-tree-node-wrapper) {
    .n-tree-node-content {
      padding-right: 8px;
    }
  }
}
</style>
