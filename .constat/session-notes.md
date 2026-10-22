# Session 2 — notes

## 需求 1：首页法语（efba0fe8-901e-4a54-b53e-71bd1f8de51b）

已完成。首页（`/chat` 新对话）可切换到法语，顶栏右侧有 EN / FR 切换器。

### 决定
- **语言类型分两层**：`Locale` 仍是拥有完整词典的 `'zh-CN' | 'en'`，新增 `DisplayLocale = Locale | 'fr'`。
  `useI18n()` 返回 `locale`（展示语言，可能是 `fr`）与 `baseLocale`（访客原本的中英文）。
  `src/previews/*` 的 `Record<Locale, …>` 合成演示内容、登录页介绍、`localizeSystemMessage` 都用 `baseLocale`/回退英文，
  这样加法语不需要给演示脚本造法语素材。再加第三种语言时沿用这个分层。
- **法语词典是子集**：`src/i18n/frenchHomeScreen.ts` 只列首页可见的键（`Partial<Record<MessageKey, string>>`，有类型检查），
  `translate()` 在 `fr` 下先查它，查不到回退英文。新增首页文案要同时补法语，否则该条在法语下是英文。
- **访问级存储**：法语存 `sessionStorage['cornagent.locale.visit'] = 'fr'`，绝不写 `localStorage['cornagent.locale']`，
  下次访问自动回默认语言（验收标准要求）。侧栏原有的中英文切换按钮会先清除这个访问选择再切 base 语言。
- **切换器位置**：按需求选定的样机放在顶栏。组件在 `src/app/HomeLanguageSwitcher.tsx`，
  通过新增的 `AgentChatPage` 可选参数 `headerActions` 传入，保持共享 Agent 组件不内置应用级设置。

### 半真的地方（下一个需求要知道）
- 左侧导航标签（首页 / 侧边栏示例 / Agent 渲染效果 / 统计 / 会话分组）在法语下也是法语，
  因为它们在首页上可见；于是在其他页面也会看到法语导航，而这些页面的正文仍是原语言。
  这是明知的取舍，PR 里写明了，检查 2 的截图就是这个状态。
- 运行时诊断与错误横幅（`systemMessages.ts`、`apiErrorMessage`）在法语下显示英文，没有翻译。
- `/chat/:id` 会话详情不显示切换器，但如果访客已在本次访问中选了法语，详情页的共享文案（导航、输入框等）也是法语。
- `tsconfig.app.json` 的 `types` 加了 `"node"`，因为截图 harness（`tests/harness/screenshot.ts`）用了 node 内置模块，
  而它被 `src` 下的测试导入，会进入 app 项目的类型检查。

### 检查与截图
- `src/app/FrenchHomeScreen.component.test.tsx`：六项检查按验收标准逐字命名，渲染真实首页
  （`Application` + `CornAgentProvider` + 假 transport），其中一项会扫描屏幕上所有文字与 aria 标签，
  只允许品牌名（CornAgent / GitHub / X）与语言入口本身不是法语——新增首页英文文案会让它变红。
- `tests/harness/screenshot.ts`：把 jsdom 的 DOM 串成独立 HTML（内联项目样式与 Inter 字体），
  用机器上已有的 Chrome 无头截图到 `.constat/pictures/<检查名>.png`。没有浏览器时只告警不失败。
- 先推只含检查的提交，CI 记录六项全红；再推实现。

### 检查命名
检查名与验收标准逐字相同，但不带句末句号：第一次（只含检查的）推送在 CI 记录的就是这组名字，
红→绿必须在同一个名字上对得起来。中间一次改名的提交没有被 CI 跑到，已改回。
