<template>
  <n-modal :show="show" @update:show="onUpdateShow" preset="dialog">
    <template #header>
      <div class="font-bold text-lg">{{ $t('aboutDialog.title') }}</div>
    </template>
    <div class="about-content">
      <div>{{ $t('aboutDialog.webClient') }}</div>
      <div>{{ $t('aboutDialog.version', { version: session?.['version'] ?? '--' }) }}</div>
      <div class="flex items-center gap-2">
        <span>{{ $t('aboutDialog.clientVersion', { version: clientVersion }) }}</span>
        <n-button size="tiny" quaternary circle @click="checkUpdate" :loading="checkingUpdate">
          <template #icon>
            <n-icon><RefreshIcon /></n-icon>
          </template>
        </n-button>
      </div>
      <div>{{ $t('aboutDialog.server', { server: serverHost }) }}</div>
      <a class="mt-2 block" href="https://github.com/jianxcao/transmission-web"
        >{{ $t('aboutDialog.author') }}: jianxcao@126.com</a
      >
    </div>
    <template #action>
      <n-button type="primary" @click="onUpdateShow(false)">{{ $t('common.close') }}</n-button>
    </template>
  </n-modal>
</template>
<script setup lang="ts">
import { useSessionStore } from '@/store'
import { useSettingStore } from '@/store'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { Refresh as RefreshIcon } from '@vicons/ionicons5'

const settingStore = useSettingStore()
const { t: $t } = useI18n()
const message = useMessage()
const { show } = defineProps<{ show: boolean }>()
const emit = defineEmits(['update:show'])
const checkingUpdate = ref(false)

function onUpdateShow(v: boolean) {
  emit('update:show', v)
}

async function checkUpdate() {
  checkingUpdate.value = true
  try {
    const res = await fetch('https://api.github.com/repos/jianxcao/transmission-web/releases/latest')
    const data = await res.json()
    const latestVersion = data.tag_name?.replace('v', '')
    const currentVersion = clientVersion.value

    if (latestVersion && currentVersion) {
      // 简单的版本比较
      const latestParts = latestVersion.split('.').map(Number)
      const currentParts = currentVersion.split('.').map(Number)
      let isNewer = false
      for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const l = latestParts[i] || 0
        const c = currentParts[i] || 0
        if (l > c) {
          isNewer = true
          break
        } else if (l < c) {
          break
        }
      }

      if (isNewer) {
        message.info($t('aboutDialog.updateAvailable', { version: latestVersion }))
      } else {
        message.success($t('aboutDialog.updateNoNew'))
      }
    }
  } catch {
    message.error($t('aboutDialog.updateFailed'))
  } finally {
    checkingUpdate.value = false
  }
}

const sessionStore = useSessionStore()
const session = computed(() => sessionStore.session)
const serverHost = settingStore.serverHost

// 从 package.json 获取客户端版本号
const clientVersion = computed(() => {
  // 通过 Vite 注入的全局变量获取版本号
  return __APP_VERSION__
})
</script>

<style scoped>
.about-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
