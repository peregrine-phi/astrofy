# 项目维护与结构说明书 (Project Maintenance Guide)

## 目录结构设计 (Directory Architecture)
为了解决原始模板难以维护（硬编码过多、组件堆砌）的问题，并原生支持多语言（i18n），我们对目录进行了如下梳理和重构：

```text
src/
├── components/         # 视图组件库 (细分为 layout 和 ui)
│   ├── layout/         # 全局布局组件 (Header, Footer, SideBar 等)
│   ├── ui/             # 可复用 UI 元素 (Cards, Buttons, ShopItem 等)
│   └── cv/             # 简历专属组件 (TimeLine 等)
├── config.ts           # 网站全局基础配置 (如站点名称、描述)
├── content/            # 动态内容集合 (Markdown/MDX 格式)
│   ├── blog/           # 博客文章 (可按语言分建目录，如 blog/en 和 blog/zh)
│   └── store/          # 商店商品页
├── data/               # 静态数据层 (新引入，用于解耦页面和数据)
│   └── cv.ts           # 简历数据 (包含中英双语数据结构)
├── i18n/               # 国际化配置目录
│   ├── ui.ts           # UI 界面翻译字典 (导航栏、固定文本等)
│   └── utils.ts        # 翻译辅助函数 (如 useTranslations)
├── layouts/            # 页面级别布局外壳 (如 BaseLayout)
└── pages/              # 路由页面 (Astro 的文件系统路由)
    ├── zh/             # 中文语言页面
    │   └── index.astro # 中文首页
    ├── index.astro     # 英文首页 (默认语言)
    └── cv.astro        ... (依此类推)
```

## 核心维护原则与最佳实践

### 1. 数据与视图分离 (Data Decoupling)
原有的 `.astro` 页面中充斥着大量的硬编码文本（如 `cv.astro` 里的几十行 HTML 列表）。为了便于翻译和维护：
* **最佳做法**：参考新增加的 `src/data/cv.ts`。你应该将你的经历、项目描述、技能列表提取到 `data` 目录下的 TypeScript / JSON 对象中。
* **页面调用**：在对应的 `.astro` 页面中，通过获取当前语言 `const lang = Astro.currentLocale || 'en'`，然后遍历渲染数据，例如：
  ```astro
  ---
  import { cvData } from '../data/cv';
  const lang = Astro.currentLocale || "en";
  const myCV = cvData[lang as keyof typeof cvData];
  ---
  <!-- 在 HTML 中直接映射 -->
  {myCV.experience.map(exp => <TimeLineElement title={exp.title} ... />)}
  ```

### 2. 多语言 (i18n) 维护指南
我们目前使用的是 Astro 4+ 的原生国际化机制。
* **修改导航词汇**：如果你要增加侧边栏菜单或者修改固定的提示语，请直接修改 `src/i18n/ui.ts`。
* **增加新页面**：
  1. 如果你要增加一个新的中文页面（例如项目页），请复制 `src/pages/projects.astro` 到 `src/pages/zh/projects.astro`。
  2. 在页面中使用 `getRelativeLocaleUrl` 来确保跳转链接携带正确的语言路径。
* **内容集合翻译 (Blog/Store)**：推荐在文章的 Markdown 前缀信息 (Frontmatter) 里增加一个 `lang: 'zh'` 或 `lang: 'en'` 字段，或者根据文件夹 (`blog/zh/post-1.md`) 进行组织。

### 3. 组件划分规则
* 只有特定页面使用，并且包含极多专属逻辑的，放入 `components/专属名字/`。
* 没有状态和布局依赖，只负责渲染外观（如卡片、标签）的纯组件，放入 `components/ui/`。
* 决定网站骨架的导航条、侧边栏，放入 `components/layout/`。

### 4. SEO 优化与 Bing 指南 (SEO & Bing Optimization)
为了解决 Bing 等搜索引擎“已抓取但未索引”的问题，并提升多语言站点的排名：
* **规范标签与多语言关联**：`BaseHead.astro` 中已集成自动化的 `canonical` 和 `hreflang` 标签。这些标签会根据当前路径自动映射对应的中英文版本，确保搜索引擎理解页面间的语言对应关系，避免重复内容惩罚。
* **结构化数据 (JSON-LD)**：网站头部包含 `Person` 和 `WebSite` 类型的 JSON-LD。这有助于搜索引擎识别个人档案站点的身份和职业信息，从而提供富摘要展示。
* **默认元数据本地化**：`BaseLayout.astro` 内部实现了语言感知的默认标题和描述逻辑。如果你在 `zh/` 目录下创建新页面，它将自动采用中文 SEO 信息，除非你在调用 `BaseLayout` 时显式传入参数。

### 5. UI 一致性：SectionHeader 组件
为了保持页面章节风格高度统一，所有页面的二级标题（如“项目展示”、“教育背景”）必须使用 `SectionHeader` 组件，严禁直接手写 `div` 或 `h2` 标签。
* **用法示例**：
  ```astro
  import SectionHeader from "../components/ui/SectionHeader.astro";
  
  <SectionHeader title="我的项目" />
  <!-- 如需自定义间距（如顶部预留 10 个单位） -->
  <SectionHeader title="最新博客" class="mb-5 mt-10" />
  ```
* **维护建议**：`SectionHeader` 默认包含 `mb-5` (下边距)。如果需要调整全站章节标题的大小或样式，只需修改 `src/components/ui/SectionHeader.astro` 即可实现全局生效。

### 6. 评论系统与 UI 抽象化 (Comments & Styling Abstraction)
我们集成了 **Artalk** 作为评论系统。为了保持代码的灵活性和未来的可维护性：
* **组件化集成**：评论逻辑封装在 `src/components/ui/Comments.astro` 中。它自动处理多语言（i18n）路径隔离和深色模式适配。
* **颜色抽象化 (Color Tokens)**：
  * **禁止硬编码**：在 `Comments.astro` 的 `<style>` 块中，我们将 Artalk 的内部变量（如 `--at-color-main`）映射到了 Tailwind 的主题色（如 `theme('colors.primary')`）。
  * **未来扩展**：若需全站统一色值抽象，建议在 `src/styles/` 下定义 CSS Variables，并在组件中通过 `var(--your-variable)` 引用。
* **i18n 策略**：评论区根据 `Astro.currentLocale` 自动切换语言界面，并使用 `window.location.pathname` 确保中英文页面的评论相互独立。

### 7. 布局一致性与全局容器规则 (Layout Consistency)
在维护页面布局时，需注意 `BaseLayout` 提供的基础容器约束：
* **BaseLayout 容器行为**：`BaseLayout.astro` 的 `main` 标签定义了全局内容的最大宽度 `lg:max-w-[900px]`。
* **宽度补丁 (Width Patch)**：为了防止页面在内容较少（如只有标题或少量文字）时因 Flex 布局特性而收缩并导致非预期的居中（尤其是在宽屏下），`main` 标签已显式添加 `w-full`。这确保了内容始终在 900px 的逻辑范围内左对齐。
* **特殊宽度 (Individual Posts)**：博客正文（`PostLayout`）和教程正文（`TutorialLayout`）为了提升阅读体验，在 `BaseLayout` 内部又包裹了一层 `max-w-[750px] mx-auto` 的居中容器。在新增自定义展示页时，需明确选择是跟随“列表页（900px 左对齐）”还是“内容页（750px 居中）”的风格。

### 8. 板块演进：从商业向“数字花园”转型
网站已完成从传统简历/外包展示向“数字花园”风格的迁移：
* **隐藏 CV 入口**：CV 页面虽保留，但已通过移除导航栏入口、页面添加 `noindex: true` 属性以及在 `astro.config.mjs` 中配置 `sitemap` 过滤，实现了对普通访客和搜索引擎的“深度隐藏”。
* **自定义板块替换**：
    - **Gallery (画廊)**：取代了原有的 `Services`。
    - **Neighbors (邻居)**：取代了原有的 `Projects`。
* **同步维护**：修改此类核心板块时，必须同步更新 `src/i18n/ui.ts` 字典、`src/components/layout/SideBarMenu.astro` 链接，以及 `src/pages/` 与 `src/pages/zh/` 下的对应物理文件。

### 9. 边缘侧控制与地区可见性 (Edge Functions & Regional Visibility)
为了在静态站点上实现高级的动态拦截和安全控制，我们引入了 **Cloudflare Pages Functions** 机制：
*   **物理级拦截 (_middleware.ts)**：在项目根目录的 `functions/` 下，我们部署了一个边缘中间件。它通过检测 Cloudflare 提供的地理位置标头（`cf-ipcountry`），利用 `HTMLRewriter` 在响应发回前物理删除带有 `data-block-region="CN"` 属性的 HTML 元素。
    - **优点**：源码级过滤，无视觉闪烁，安全性极高（CN 用户源码中不含被屏蔽内容）。
*   **智能重定向与分流**：
    - **逻辑**：当检测到 CN 用户访问根路径 `/`（英文首页）时，中间件会自动执行 302 重定向至 `/zh/`。
    - **异常处理**：我们在中文首页（`zh/index.astro`）显式移除了屏蔽标签，确保国内用户依然能访问中文核心内容（如历史上的今天）。
*   **全局安全加固**：中间件会自动为所有页面注入安全响应头（如 `X-Content-Type-Options` 和 `X-Frame-Options`），提升站点安全评级。

### 10. 动态历史小组件 (History Ticker)
`src/components/ui/HistoryOnThisDay.astro` 实现了一个高定制化的历史事件轮播器：
*   **多源 API 适配**：根据页面语言自动切换数据源（中文：xxapi 聚合接口；英文：byabbe REST API）。
*   **View Transitions 兼容**：脚本使用 `astro:page-load` 或 `astro:after-swap` 监听器，确保在页面切换后依然能正确重新初始化定时器，避免内存泄漏或逻辑停滞。
*   **容器自适应**：轮播轨道的高度会根据当前显示的事件字数动态伸缩，确保布局紧凑且不遮挡下方内容。

### 11. 评论系统鲁棒性与超时处理 (Comment System Robustness)
针对第三方评论系统（Artalk）加载不稳定的情况，我们实施了主动防御：
*   **10 秒超时熔断**：在 `Comments.astro` 中内置了定时器。若 Artalk 服务器在 10 秒内未响应 `list-loaded` 事件，前端将自动停止加载动画。
*   **维护模式切换**：超时后会自动展示预定义的维护提示信息（`ArtalkMaintenance` 层），并引导用户通过邮件联系站长。
*   **前端埋点警告**：在控制台会同步输出 `load timeout` 警告，便于通过浏览器日志排查服务端状态。
### 12. 内容与代码分离架构 (Content & Code Decoupling)
为了实现“内容创作”与“代码逻辑”的解耦，并支持使用独立工具（如 Obsidian）管理文章，我们采用了 **“本地嵌套 + 云端动态组装”** 的架构。

#### 核心设计逻辑：
*   **主仓库 (Code Repo)**：仅存放展示逻辑、组件和页面路由。通过 `.gitignore` 彻底忽略 `src/content` 目录。
*   **内容仓库 (Content Repo)**：存放所有 Markdown/MDX 文章以及内容校验配置文件 `src/content/config.ts`。
*   **解耦点**：主仓库在 GitHub 上不含任何文章数据，保证了代码历史的纯净。

#### 本地开发维护：
*   **物理嵌套**：在本地开发环境下，你可以直接在主项目的 `src/content` 目录下 `git clone` 内容仓库。
*   **双重忽略**：主仓库的 `.gitignore` 必须包含 `/src/content`。这样即使你在 `src/content` 下进行独立的 Git 操作，主仓库也不会受到干扰。
*   **实时预览**：由于文件在物理上处于 Astro 预期的路径下，本地 `pnpm run dev` 时可以实时捕捉到文章的修改。

#### 云端构建与同步 (Cloudflare Pages)：
*   **触发机制**：在 Cloudflare Pages 后台配置 **Deploy Hook**，并在 GitHub 内容仓库中配置对应的 Webhook。每当你推送新文章，Cloudflare 会自动启动构建。
*   **动态组装脚本**：在 Cloudflare 的构建命令中，我们不再直接运行 `astro build`，而是使用以下复合命令：
    ```bash
    rm -rf src/content && git clone --depth 1 https://$GITHUB_TOKEN@github.com/your-name/your-content-repo.git src/content && pnpm run build
    ```
*   **健壮性保证**：`rm -rf` 确保了每次构建的环境都是“绝对新鲜”的，彻底杜绝了因缓存导致的“文章不更新”问题。

#### 关于 config.ts 的归属：
*   **决策**：`src/content/config.ts` 被定义为内容仓库的一部分。
*   **依据**：该文件定义了数据的“形状（Schema）”。数据（文章）与它的形状描述符（config.ts）在逻辑上属于同一生命周期。当内容结构发生变化时，只需在文章仓库内完成闭环修改即可。

> 提示：执行 `pnpm run build` 前，请确保你已经使用 Astro 的 `getRelativeLocaleUrl` 修复了新添加的链接路径，防止语言互相跳转出现 404。
