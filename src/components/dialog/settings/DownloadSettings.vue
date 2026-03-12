<template>
  <div>
    <div class="text-lg font-medium mb-2">{{ $t('downloadSettings.title') }}</div>
    <n-form :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 240" :model="form">
      <n-form-item :label="$t('downloadSettings.defaultSaveDir')">
        <n-input v-model:value="form['download-dir']" placeholder="/share/media2" class="w-80" />
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.addPartSuffix')" label-placement="left">
        <n-checkbox v-model:checked="form['rename-partial-files']"> </n-checkbox>
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.enableTempDir')" label-placement="left">
        <n-checkbox v-model:checked="form['incomplete-dir-enabled']"> </n-checkbox>
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.tempDir')" v-if="form['incomplete-dir-enabled']">
        <n-input v-model:value="form['incomplete-dir']" placeholder="/share/media2/incomplete" class="w-80" />
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.enableWatchDir')" label-placement="left">
        <n-checkbox v-model:checked="form['watch-dir-enabled']"> </n-checkbox>
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.watchDir')" v-if="form['watch-dir-enabled']">
        <n-input v-model:value="form['watch-dir']" :placeholder="$t('downloadSettings.watchDirPlaceholder')" class="w-80" />
      </n-form-item>

      <n-form-item :label="$t('downloadSettings.trashOriginalTorrentFiles')" label-placement="left">
        <n-checkbox v-model:checked="form['trash-original-torrent-files']"> </n-checkbox>
      </n-form-item>

      <div class="border-t pt-4 border-color-[var(--border-color)]">
        <div class="text-base font-medium mb-2">{{ $t('downloadSettings.seedingSettings') }}</div>
        <n-form-item>
          <template #label>
            <n-checkbox v-model:checked="form['seedRatioLimited']">{{
              $t('downloadSettings.defaultRatioLimit')
            }}</n-checkbox>
          </template>
          <n-input-number v-model:value="form['seedRatioLimit']" :min="0" :step="0.1" :precision="2" class="w-32" />
        </n-form-item>
        <n-form-item>
          <template #label>
            <n-checkbox v-model:checked="form['idle-seeding-limit-enabled']">{{
              $t('downloadSettings.defaultIdleLimit')
            }}</n-checkbox>
          </template>
          <n-input-number v-model:value="form['idle-seeding-limit']" :min="1" :step="1" class="w-32" />
          <span class="ml-2">{{ $t('common.minutes') }}</span>
        </n-form-item>
      </div>
      <div class="border-t pt-4 border-color-[var(--border-color)]">
        <div class="text-base font-medium mb-2">{{ $t('downloadSettings.cacheSettings') }}</div>
        <n-form-item :label="$t('downloadSettings.diskCacheSize')">
          <n-input-number v-model:value="form['cache-size-mb']" :min="1" :step="1" class="w-32" />
          <span class="ml-2">{{ $t('downloadSettings.mb') }}</span>
        </n-form-item>
      </div>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import type { SessionArguments } from '@/api/rpc'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useI18n } from 'vue-i18n'
const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile ? 'top' : 'left'))
const { t: $t } = useI18n()
const form = defineModel<SessionArguments>('form', { required: true })
</script>

<style scoped lang="less">
.space-y-6 > * + * {
  margin-top: 1.5rem;
}
</style>
