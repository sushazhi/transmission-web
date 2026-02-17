<script setup lang="ts">
import { darkTheme, zhCN, enUS, dateZhCN, dateEnUS } from 'naive-ui'
import { useSettingStore } from './store'

const settingStore = useSettingStore()
const theme = computed(() => (settingStore.setting.theme === 'dark' ? darkTheme : null))
const locale = computed(() => (settingStore.setting.language === 'zh-CN' ? zhCN : enUS))
const dateLocale = computed(() => (settingStore.setting.language === 'zh-CN' ? dateZhCN : dateEnUS))

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', settingStore.setting.theme)
})
</script>

<template>
  <n-config-provider :theme="theme" :locale="locale" :date-locale="dateLocale">
    <n-global-style />
    <n-el :class="$style.container">
      <n-modal-provider>
        <n-dialog-provider>
          <n-message-provider placement="bottom-right">
            <LayoutView />
          </n-message-provider>
        </n-dialog-provider>
      </n-modal-provider>
    </n-el>
  </n-config-provider>
</template>

<style lang="less" module>
.container {
  height: 100vh;
  width: 100vw;
  height: 100dvh;
  width: 100dvw;
  box-sizing: border-box;
  padding-top: var(--top-inset);
  padding-bottom: var(--bottom-inset);
}
</style>
