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

# Session 4 — notes

## 需求 1：流式列表检查不再偶发失败（8f903a38-afa0-433d-b42e-b38cafc15d10）

已完成。`frontend/src/agent/AgentMessageList.streaming.component.test.tsx` 的
「updates only the current row for five {delta,reasoning_delta} events with 100 historical messages」
两项检查各连跑 20 轮，共 40 项，全部通过。

### 偶发的真正原因（下一个需求最该知道的）
`reasoning_delta` 的推理内容渲染在可折叠面板里，面板的展开状态由
`useInterleavedReasoningExpansion` / `useToolCallExpansion` / `useStandaloneReasoningExpansion`
推迟到 `requestAnimationFrame`，展开后再由 `AnimatedMessageBody` 以 `initial='enter'`
（`opacity: 0`）淡入 0.25s。`toBeVisible()` 在 `opacity` 离开 0 之前为假，实测这条
`waitFor` 要等 **400–670ms**，而默认超时只有 1000ms。余量不足两倍，CI 一拥挤就越线。
**凡是对 `MarkdownMessageContent` 子树里的内容写 `toBeVisible()` 的组件测试，都有同一个坑。**

### 这个文件里新增的两件工具（可照搬）
- **自管动画帧**：`beforeEach` 用 `vi.stubGlobal` 把 `requestAnimationFrame` 换成一个队列，
  `settleAnimationFrames()` 在 `act()` 里把队列（以及队列里又排的帧）跑干净。
  关键细节：`motion` 在模块加载时就捕获了真实的 `requestAnimationFrame`
  （`motion-dom` 的 `createRenderBatcher(requestAnimationFrame, true)`），
  所以这个 stub 只影响应用代码排的帧，不会把 motion 的帧循环拖进死循环。
- **按 reduced-motion 渲染**：`vi.mock('motion/react', … useReducedMotion: () => true)`，
  与 `src/components/TextSwap.component.test.tsx` 既有写法一致。
  `AnimatedMessageBody` 于是走 `initial={false}`，内容进入 DOM 即可见。

### 断言「不靠运气」
每次等待都数 `waitFor` 读屏的次数并断言 `reads === 1`。这条让红/绿是确定的：
不加 reduced-motion 时 `reasoning_delta` 20 轮红 18 轮（另 2 轮侥幸通过，正是偶发的样子），
加上之后 40/40 绿。改动这个文件时请保留这条断言，它是唯一能在本机就抓住回归的东西。

### 半真的地方
- 截图里的中文是方块：本机与 CI runner 都没有中文字体（`fc-list :lang=zh` 为空），
  `tests/harness/screenshot.ts` 只内联了 `@fontsource/inter`。与被测界面无关。
- 截图取的是列表尾部三个 exchange 的克隆（`lastScreenful()`），因为静态图没法滚动，
  而真实应用会跟随最新回答。第一条历史消息因此不在图里，它由断言覆盖。
- 这个文件的另外 4 项检查也一并受 rAF stub 与 reduced-motion 影响，均已通过。
- 文件从 6 项检查涨到 44 项，运行时间约 14s（原约 2s）。这是验收标准要求的 20 轮重复的代价。
