<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('settingsDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    :class="$style['settings-dialog']"
    display-directive="if"
  >
    <SettingsContent
      :is-dialog="true"
      @save-success="onSaveSuccess"
      @cancel="onCancel"
      :class="$style.settingsContentClass"
      :tab-wrapper-class="$style.settingsTabWrapperClass"
    />
  </n-modal>
</template>

<script setup lang="ts">
import SettingsContent from './SettingsContent.vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()
const show = defineModel<boolean>('show', { required: true })

// 保存成功
function onSaveSuccess() {
  show.value = false
}

// 取消
function onCancel() {
  show.value = false
}
</script>

<style lang="less" module>
@import '@/styles/mix.less';
.settings-dialog {
  width: 850px !important;
  max-width: 95vw !important;
  padding: 0 !important;
  box-sizing: border-box;
  .settingsContentClass {
    height: 600px;
    max-height: 80vh;
    width: 100%;
    max-width: 90vw;
    overflow: hidden;
  }
  :global {
    .n-dialog__title {
      padding-left: 16px;
      padding-top: 16px;
    }
    .settings-footer {
      background-color: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  }
}

.settingsTabWrapperClass {
  height: calc(100% - 56px);
  box-sizing: border-box;
  max-width: 100%;
  :global {
    .n-tabs-nav {
      padding-inline: 16px !important;
      border-bottom: 1px solid var(--border-color);
      .n-tabs-nav-scroll-content {
        border-bottom-width: 0px !important;
      }
      .n-tabs-pane-wrapper {
        flex: 0 0 auto;
        overflow: hidden;
      }
    }
    .n-tab-pane {
      height: 100%;
      overflow: auto;
      .scrollbar();
      padding-inline: 16px !important;
    }
  }
}
</style>
