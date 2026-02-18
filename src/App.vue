<script setup lang="ts">
import { darkTheme, zhCN, enUS, dateZhCN, dateEnUS } from 'naive-ui'
import { useSettingStore } from './store'

const settingStore = useSettingStore()
const theme = computed(() => (settingStore.setting.theme === 'dark' ? darkTheme : null))
const locale = computed(() => (settingStore.setting.language === 'zh-CN' ? zhCN : enUS))
const dateLocale = computed(() => (settingStore.setting.language === 'zh-CN' ? dateZhCN : dateEnUS))

// 主题覆盖配置,用于设置字体大小
const themeOverrides = computed(() => ({
  common: {
    fontSize: `${settingStore.setting.fontSize}px`,
    fontSizeMini: `${settingStore.setting.fontSize - 2}px`,
    fontSizeTiny: `${settingStore.setting.fontSize - 1}px`,
    fontSizeSmall: `${settingStore.setting.fontSize}px`,
    fontSizeMedium: `${settingStore.setting.fontSize + 2}px`,
    fontSizeLarge: `${settingStore.setting.fontSize + 4}px`,
    fontSizeHuge: `${settingStore.setting.fontSize + 6}px`
  }
}))

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', settingStore.setting.theme)
})
</script>

<template>
  <n-config-provider :theme="theme" :locale="locale" :date-locale="dateLocale" :theme-overrides="themeOverrides">
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
