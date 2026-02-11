# 侧边栏双击选择功能实现计划

## 需求

双击侧边栏菜单项（种子状态、用户标签、目录、服务器、错误分布）时，选中该类型所有种子。

## 关键发现

### 现状

- 5 个菜单组件都使用 Naive UI `n-menu` 组件
- `v-model:value` 绑定过滤条件
- 选择逻辑在 `useSelection` composable 中
- `torrentStore.setSelectedKeys(ids)` 设置选中

### 问题

Naive UI `n-menu` 不直接支持 `@dblclick` 事件

## 解决方案

### 方案：时间戳判断单/双击

## 实现步骤

### Step 1: 创建点击处理 composable

**文件**: `src/composables/useClickHandler.ts`

- 管理最近点击的时间和 key
- 判断单/双击

### Step 2: 创建工具函数获取匹配种子 ID

**文件**: `src/utils/torrentSelection.ts`

- 根据过滤条件获取匹配的种子 ID 数组

### Step 3: 修改 5 个菜单组件

- `StatusMenu.vue`
- `LabelMenu.vue`
- `DirMenu.vue`
- `TrackerMenu.vue`
- `ErrMenu.vue`

每个组件添加 `@update:value` 事件处理双击逻辑

## 关键代码

### useClickHandler.ts

```typescript
export function useClickHandler() {
  const lastClickTime = ref<number>(0)
  const lastClickKey = ref<string>('')

  function handleClick(key: string): boolean {
    const now = Date.now()
    const isDoubleClick = lastClickKey.value === key && now - lastClickTime.value < 300

    lastClickTime.value = now
    lastClickKey.value = key

    return isDoubleClick
  }

  return { lastClickTime, lastClickKey, handleClick }
}
```

### torrentSelection.ts

```typescript
export function getMatchingTorrentIds(torrents: Torrent[], filterType: string, filterValue: string): number[] {
  // 根据 filterType 和 filterValue 筛选种子
}
```

## 测试用例

1. 单击状态项 → 切换过滤
2. 双击状态项 → 选中该状态所有种子
3. 双击"全部" → 全选
4. 切换过滤后双击 → 只选中当前过滤后的

## 待办

- [x] 创建 useClickHandler composable (已完成)
- [x] 创建 torrentSelection 工具函数
- [x] 在 setting store 添加开关设置
- [x] 在 OtherSettings.vue 添加开关 UI
- [x] 添加国际化文本
- [x] 修改 StatusMenu.vue
- [x] 修改 LabelMenu.vue
- [x] 修改 DirMenu.vue
- [x] 修改 TrackerMenu.vue
- [x] 修改 ErrMenu.vue
- [ ] 测试验证

## 设置开关位置

### 1. Setting Store 修改

**文件**: `src/store/setting.ts`

在 `setting` 对象中添加新属性：

```typescript
setting: useStorage('setting', {
  // ... 现有属性 ...
  enableDoubleClickSelect: true // 新增：双击选中功能开关
})
```

### 2. 设置 UI 修改

**文件**: `src/components/dialog/settings/OtherSettings.vue`

在表单中添加开关：

```vue
<n-form-item :label="$t('otherSettings.enableDoubleClickSelect')">
  <n-switch v-model:value="settingStore.setting.enableDoubleClickSelect" />
</n-form-item>
```

### 3. 国际化文本

**文件**: `src/i18n/locales/zh-CN.json`

```json
{
  "otherSettings": {
    "enableDoubleClickSelect": "双击侧边栏选中该类型所有种子"
  }
}
```

**文件**: `src/i18n/locales/en-US.json`

```json
{
  "otherSettings": {
    "enableDoubleClickSelect": "Double-click sidebar to select all torrents of that type"
  }
}
```

### 4. 菜单组件使用开关

**文件**: 各菜单组件

```typescript
const settingStore = useSettingStore()

const handleMenuClick = (key: string) => {
  // 检查开关是否开启
  if (!settingStore.setting.enableDoubleClickSelect) {
    return // 开关关闭，不处理双击
  }
  // ... 双击逻辑 ...
}
```
