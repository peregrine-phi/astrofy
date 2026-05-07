# 项目维护与结构说明书 (Project Maintenance Guide)

## 目录结构设计 (Directory Architecture)
为了解决原始模板难以维护（硬编码过多、组件堆砌）的问题，并原生支持多语言（i18n），我们对目录进行了如下梳理和重构：

```text
src/
├── components/         # 视图组件库 (细分为 layout 和 ui)
│   ├── layout/         # 全局布局组件 (Header, Footer, SideBar, SideBarMenu, SideBarFooter, BaseHead 等)
│   ├── ui/             # 可复用 UI 元素 (Card, SectionHeader, Comments, ThemeSelector, LanguagePicker, HistoryOnThisDay 等)
│   └── cv/             # 简历专属组件 (TimeLine)
├── config.ts           # 网站全局基础配置 (站点名称、描述、slug 策略、View Transitions 开关)
├── content/            # 动态内容集合 (Markdown/MDX 格式) — 通过 .gitignore 排除，独立仓库管理
│   ├── blog/           # 博客文章 (按语言分目录：blog/ 为英文，blog/zh/ 为中文)
│   ├── tutorials/      # 教程页面 (同样按语言分目录)
│   ├── temple/         # 文章模板 (用于 Obsidian 创建新文章时的参考)
│   └── config.ts       # 内容集合 Schema 定义 (属于内容仓库)
├── data/               # 静态数据层 (解耦页面与数据)
│   └── cv.ts           # 简历数据 (包含中英双语数据结构，供 CV 页面引用)
├── i18n/               # 国际化配置目录
│   ├── ui.ts           # UI 界面翻译字典 (导航栏、固定文本等)
│   └── utils.ts        # 翻译辅助函数 (useTranslations, getLangFromUrl)
├── layouts/            # 页面级别布局外壳 (BaseLayout, PostLayout, TutorialLayout)
├── lib/                # 工具函数
│   └── createSlug.ts   # 根据标题生成 URL slug
├── styles/
│   └── global.css      # Tailwind 与全局样式入口
└── pages/              # 路由页面 (Astro 的文件系统路由)
    ├── zh/             # 中文语言页面
    │   ├── index.astro       # 中文首页
    │   ├── blog/             # 中文博客 (含 [slug].astro, [...page].astro, tag/[tag]/[...page].astro)
    │   ├── tutorials/        # 中文教程
    │   ├── gallery.astro     # 中文画廊
    │   ├── neighbors.astro   # 中文邻居
    │   └── cv.astro          # 中文简历
    ├── index.astro     # 英文首页 (默认语言)
    ├── blog/           # 英文博客 (含分页与标签路由)
    ├── tutorials/      # 英文教程
    ├── gallery.astro   # 英文画廊
    ├── neighbors.astro # 英文邻居
    ├── cv.astro        # 英文简历
    ├── 404.astro       # 自定义 404 页面
    └── rss.xml.js      # RSS 订阅源生成
```

## 核心维护原则与最佳实践

### 1. 数据与视图分离 (Data Decoupling)
原有的 `.astro` 页面中充斥着大量的硬编码文本。为了便于翻译和维护：
* **最佳做法**：参考 `src/data/cv.ts`。你应该将经历、项目描述、技能列表提取到 `data` 目录下的 TypeScript / JSON 对象中。
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
* **当前状态**：CV 页面 (`cv.astro` 及 `zh/cv.astro`) 目前仍为模板占位数据，尚未接入 `src/data/cv.ts`。填入真实数据时请按上述模式重构。

### 2. 多语言 (i18n) 维护指南
我们目前使用的是 Astro 4+ 的原生国际化机制。
* **修改导航词汇**：如果你要增加侧边栏菜单或者修改固定的提示语，请直接修改 `src/i18n/ui.ts`。
  - **注意**：页面路径和内容集合命名为 `tutorials`，对应的 i18n 键名为 `nav.tutorials`。之前曾使用过 `nav.store` 作为键名，现已统一。
* **增加新页面**：
  1. 如果你要增加一个新的中文页面，请复制英文页面到 `src/pages/zh/` 下。
  2. 在页面和导航组件中使用 `getRelativeLocaleUrl` 来确保跳转链接携带正确的语言路径。
* **语言切换**：`LanguagePicker` 组件 (`src/components/ui/LanguagePicker.astro`) 已封装语言切换逻辑，根据当前 `pathname` 自动生成对应的中/英文 URL。
* **内容集合翻译 (Blog/Tutorials)**：文章按文件夹 (`blog/zh/post-1.md`) 进行组织。内容查询时通过 `id.startsWith("zh/")` 过滤区分语言。

### 3. 组件划分规则
* 只有特定页面使用，并且包含极多专属逻辑的，放入 `components/专属名字/`（如 `components/cv/TimeLine.astro`）。
* 没有状态和布局依赖，只负责渲染外观（如卡片、标签）的纯组件，放入 `components/ui/`。
* 决定网站骨架的导航条、侧边栏，放入 `components/layout/`。

### 4. SEO 优化与发现 (SEO & Discoverability)
为了解决搜索引擎"已抓取但未索引"的问题，并提升多语言站点的排名：
* **规范标签与多语言关联**：`BaseHead.astro` 中已集成自动化的 `canonical` 和 `hreflang` 标签。这些标签会根据当前路径自动映射对应的中英文版本，确保搜索引擎理解页面间的语言对应关系。
* **sitemap 语言标注**：`astro.config.mjs` 中 sitemap 的 i18n 配置将 `zh` 映射为 `zh-Hans`（Bing/Google 标准语言代码），与 hreflang 标签中的 `zh` 互补。
* **结构化数据 (JSON-LD)**：`BaseHead.astro` 包含 `Person` 和 `WebSite` 类型的 JSON-LD。对于博客文章，还会自动注入 `Article` 类型的结构化数据（含发布日期、作者信息）。
* **RSS 订阅**：`/rss.xml` 提供博客 RSS 源（通过 `@astrojs/rss` 生成），提升内容分发渠道。
* **默认元数据本地化**：`BaseLayout.astro` 内部实现了语言感知的默认标题和描述逻辑。如果你在 `zh/` 目录下创建新页面，它将自动采用中文 SEO 信息。
* **sitemap 过滤策略**：自动排除 404 页面、分页子页面 (`/blog/2`)、标签列表页 (`/blog/tag/...`) 以及 CV 页面。

### 5. UI 一致性：SectionHeader 组件
为了保持页面章节风格高度统一，所有页面的二级标题（如"项目展示"、"教育背景"）必须使用 `SectionHeader` 组件，严禁直接手写 `div` 或 `h2` 标签。
* **用法示例**：
  ```astro
  import SectionHeader from "../components/ui/SectionHeader.astro";
  
  <SectionHeader title="我的项目" />
  <!-- 如需自定义间距 -->
  <SectionHeader title="最新博客" class="mb-5 mt-10" />
  ```
* **维护建议**：`SectionHeader` 默认包含 `mb-5` (下边距)。如果需要调整全站章节标题的大小或样式，只需修改 `src/components/ui/SectionHeader.astro` 即可实现全局生效。

### 6. 评论系统与 UI 抽象化 (Comments & Styling Abstraction)
我们集成了 **Artalk** 作为评论系统。为了保持代码的灵活性和未来的可维护性：
* **组件化集成**：评论逻辑封装在 `src/components/ui/Comments.astro` 中。它自动处理多语言（i18n）路径隔离和深色模式适配。
* **颜色抽象化 (Color Tokens)**：
  * **禁止硬编码**：在 `Comments.astro` 的 `<style>` 块中，我们将 Artalk 的内部变量（如 `--at-color-main`）映射到了 DaisyUI 的主题色（如 `oklch(var(--p))`）。
  * 所有 UI 组件统一通过 `oklch(var(--*))` 引用 DaisyUI v4 的语义色变量，天然适配主题切换。
* **i18n 策略**：评论区根据 `Astro.currentLocale` 自动切换语言界面，并使用 `window.location.pathname` 作为 `pageKey` 确保中英文页面的评论相互独立。

### 7. 布局一致性与全局容器规则 (Layout Consistency)
在维护页面布局时，需注意 `BaseLayout` 提供的基础容器约束：
* **BaseLayout 容器行为**：`BaseLayout.astro` 的 `main` 标签定义了全局内容的最大宽度 `lg:max-w-[900px] max-w-[100vw] w-full`。
* **宽度补丁 (Width Patch)**：`w-full` 和 `max-w-[100vw]` 防止页面在内容较少时因 Flex 布局特性而收缩，确保内容在小屏和宽屏下均表现正常。
* **特殊宽度 (Individual Posts)**：博客正文（`PostLayout`）和教程正文（`TutorialLayout`）为了提升阅读体验，在 `BaseLayout` 内部又包裹了一层 `max-w-[750px] mx-auto` 的居中容器。在新增自定义展示页时，需明确选择是跟随"列表页（900px 左对齐）"还是"内容页（750px 居中）"的风格。

### 8. 页面架构：从商业模板向"数字花园"转型
网站已完成从传统简历/外包展示向"数字花园"风格的迁移：
* **隐藏 CV 入口**：CV 页面虽保留，但已通过移除导航栏入口、页面添加 `noindex={true}` 属性以及在 `astro.config.mjs` 中配置 `sitemap` 过滤，实现了对普通访客和搜索引擎的"深度隐藏"。
* **板块替换**：
    - **Gallery (画廊)**：取代了原有的 Services。
    - **Neighbors (邻居)**：取代了原有的 Projects。
    - **Tutorials (教程)**：取代了原有的 Store 商品页（内容集合和 i18n 键名均已统一为 `tutorials`）。
* **导航菜单结构**：SideBar 中的实际顺序为 Home → Blog → Tutorials → Gallery → Neighbors → Contact（CV 已移除）。
* **同步维护**：修改此类核心板块时，必须同步更新 `src/i18n/ui.ts` 字典、`src/components/layout/SideBarMenu.astro` 链接，以及 `src/pages/` 与 `src/pages/zh/` 下的对应物理文件。

### 9. 边缘侧控制与地区可见性 (Edge Functions & Regional Visibility)
为了在静态站点上实现高级的动态拦截和安全控制，我们引入了 **Cloudflare Pages Functions** 机制：
*   **物理级拦截 (_middleware.ts)**：在项目根目录的 `functions/` 下，我们部署了一个边缘中间件。它通过检测 Cloudflare 提供的地理位置标头（`cf-ipcountry`），利用 `HTMLRewriter` 在响应发回前物理删除带有 `data-block-region="CN"` 属性的 HTML 元素。
    - **优点**：源码级过滤，无视觉闪烁，安全性极高（CN 用户源码中不含被屏蔽内容）。
    - **粒度控制**：对于普通元素使用属性选择器 `[data-block-region="CN"]` 精确删除；对于 `main` 标签则替换为"内容不可见"的提示信息。
*   **智能重定向与分流**：
    - **逻辑**：当检测到 CN 用户访问根路径 `/`（英文首页）时，中间件会自动执行 302 重定向至 `/zh/`。
    - **异常处理**：中文首页（`zh/index.astro`）中的 `HistoryOnThisDay` 组件未传递 `block_region` 属性，确保国内用户仍能正常访问中文核心内容。
*   **全局安全加固**：中间件会自动为所有 HTML 响应注入以下安全响应头：
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
*   **Android 兼容性修复**：在开启 `nosniff` 后，若响应的 `Content-Type` 缺少 `charset`，部分安卓浏览器可能拒绝解析。中间件会自动补全 `content-type: text/html; charset=UTF-8`。
*   **内部头清理**：构建时由 `BaseLayout` 注入的 `X-Block-Region` 响应头会在边缘侧被删除，避免暴露内部实现细节。
*   **数据流**：`BaseLayout.astro` 读取文章的 `block_region` 属性并写入 `X-Block-Region` 响应头，同时将 `data-block-region` 属性注入 HTML → 中间件读取响应头做决策 → 删除 `X-Block-Region` 头后返回客户端。

### 10. 动态历史小组件 (History Ticker)
`src/components/ui/HistoryOnThisDay.astro` 实现了一个高定制化的历史事件轮播器：
*   **多源 API 适配**：根据页面语言自动切换数据源（中文：xxapi 聚合接口；英文：byabbe REST API）。
*   **View Transitions 兼容**：脚本使用 `astro:after-swap` 事件监听器重新初始化，确保在页面切换后仍能正确重启定时器，避免内存泄漏或逻辑停滞。
*   **竞态保护**：每次请求分配唯一 `requestId`，回调时检查是否过期，防止旧请求覆盖新数据。
*   **容器自适应**：轮播轨道的高度会根据当前显示的事件字数动态伸缩，确保布局紧凑且不遮挡下方内容。

### 11. 评论系统鲁棒性与超时处理 (Comment System Robustness)
针对第三方评论系统（Artalk）加载不稳定的情况，我们实施了主动防御：
*   **10 秒超时熔断**：在 `Comments.astro` 中内置了定时器。若 Artalk 服务器在 10 秒内未触发 `list-loaded` 事件，前端将自动停止加载动画。
*   **维护模式切换**：超时后会自动展示预定义的维护提示信息（`ArtalkMaintenance` 层），并引导用户通过邮件联系站长。
*   **前端埋点警告**：在控制台会同步输出 `load timeout` 警告，便于通过浏览器日志排查服务端状态。
*   **初始化事件**：评论组件监听 `astro:page-load` 事件，确保在 View Transitions 导航后正确初始化。

### 12. 主题系统 (Theme System)
网站基于 DaisyUI v4 实现了多主题切换：
*   **可用主题**：lofi（默认）、nord、dracula、cupcake、emerald、retro、winter。
*   **切换组件**：`ThemeSelector` (`src/components/ui/ThemeSelector.astro`) 在下拉菜单中展示所有主题，点击即时切换。
*   **持久化**：主题选择存储在 `localStorage`，页面加载时通过 `BaseLayout` 中的内联脚本在首帧渲染前应用，消除 FOUC（闪白）。
*   **View Transitions 兼容**：主题切换器监听 `astro:after-swap` 事件，确保在页面导航后重新绑定事件并恢复主题。
*   **加载进度条**：`astro-loading-indicator` 包提供页面加载进度条，颜色根据特殊日期动态变化（如 Pride Month 彩虹色、程序员节绿色）。

### 13. 博客与内容功能
*   **标签系统**：博客支持标签分类，标签页路由为 `blog/tag/[tag]/[...page].astro`，支持分页。
*   **Slug 生成**：`src/lib/createSlug.ts` 根据 `config.ts` 中的 `GENERATE_SLUG_FROM_TITLE` 开关决定使用标题生成 slug 还是使用文件名。
*   **内容模板**：`src/content/temple/` 目录存放中英文文章模板，供 Obsidian 创建新文章时参考格式。
*   **View Transitions**：`config.ts` 中的 `TRANSITION_API` 控制是否启用 Astro 的 View Transitions API。

### 14. 内容与代码分离架构 (Content & Code Decoupling)
为了实现"内容创作"与"代码逻辑"的解耦，并支持使用 Obsidian 管理文章，我们采用了 **"本地嵌套 + 云端动态组装"** 的架构。

#### 核心设计逻辑：
*   **主仓库 (Code Repo)**：仅存放展示逻辑、组件和页面路由。通过 `.gitignore` 忽略 `/src/content` 目录。
*   **内容仓库 (Content Repo)**：存放所有 Markdown/MDX 文章、内容校验配置 `src/content/config.ts`，以及 Obsidian 工作区配置（`.obsidian/` 目录）。
*   **解耦点**：主仓库在 GitHub 上不含任何文章数据，保证了代码历史的纯净。

#### 本地开发维护：
*   **物理嵌套**：在本地开发环境下，直接在 `src/content` 目录下 `git clone` 内容仓库。
*   **双重忽略**：`.gitignore` 包含 `/src/content`，确保主仓库不受内容仓库的 Git 操作干扰。
*   **实时预览**：文件在物理上处于 Astro 预期的路径下，`pnpm run dev` 时可以实时捕捉到文章的修改。
*   **Obsidian 即开即用**：内容仓库自带 `.obsidian/` 配置（主题、插件），克隆后可直接用 Obsidian 打开 `src/content` 作为 Vault 使用。

#### 云端构建与同步 (Cloudflare Pages)：
*   **触发机制**：在 Cloudflare Pages 后台配置 **Deploy Hook**，并在 GitHub 内容仓库中配置对应的 Webhook。每当你推送新文章，Cloudflare 会自动启动构建。
*   **动态组装脚本**：在 Cloudflare 的构建命令中，我们不再直接运行 `astro build`，而是使用以下复合命令：
    ```bash
    rm -rf src/content && git clone --depth 1 https://$GITHUB_TOKEN@github.com/your-name/your-content-repo.git src/content && pnpm run build
    ```
*   **健壮性保证**：`rm -rf` 确保了每次构建的环境都是"绝对新鲜"的，彻底杜绝了因缓存导致的"文章不更新"问题。

#### 关于 config.ts 的归属：
*   **决策**：`src/content/config.ts` 被定义为内容仓库的一部分。
*   **依据**：该文件定义了数据的"形状（Schema）"。数据（文章）与它的形状描述符（config.ts）在逻辑上属于同一生命周期。当内容结构发生变化时，只需在文章仓库内完成闭环修改即可。

> 提示：执行 `pnpm run build` 前，请确保你已经使用 Astro 的 `getRelativeLocaleUrl` 修复了新添加的链接路径，防止语言互相跳转出现 404。

### 15. 全文搜索系统 (Full-text Search)
我们集成了 **Pagefind** 并结合 **astro-pagefind** 插件，实现了高性能、低功耗且具备“高级感”的全文搜索。
*   **双组件架构**：
    - `Search.astro`：侧边栏中的触发按钮，保持 `transition:persist`。
    - `SearchModal.astro`：挂载在 `BaseLayout.astro` 最外层（`</body>` 前）的全局覆盖层。
*   **位置与层叠上下文修复**：为了绕过 `.drawer` 容器的 CSS `transform` 对 `fixed` 定位的干扰，搜索框被放置在所有布局容器之外。这确保了搜索框能够**真正的水平居中**且背景模糊（Backdrop Blur）能穿透全局。
*   **索引范围控制**：在 `BaseLayout.astro` 的 `main` 标签上标记了 `data-pagefind-body`。索引器会自动抓取该区域内的正文内容，同时排除侧边栏、页脚等重复的 UI 元素。
*   **View Transitions 兼容性**：
    - 脚本使用 `astro:page-load` 事件监听，确保在路由切换后重新初始化。
    - 使用 **事件委托** 绑定触发器，即使侧边栏按钮被持久化，点击逻辑依然有效。
*   **构建集成**：集成在 `astro.config.mjs` 中，运行 `pnpm run build` 时会自动在 `dist/pagefind` 生成索引。
*   **快捷键支持**：全站支持 `/` 或 `Ctrl/Cmd + K` 呼出搜索。
*   **开发环境注意**：在 `npm run dev` 模式下，由于索引仅在构建时生成，搜索框会显示“索引未生成”提示。测试需通过 `pnpm run build` 配合 `pnpm run preview` 进行。

### 16. 侧边栏与布局兼容性 (Sidebar & Layout Compatibility)
为了实现高度稳定的侧边栏导航和目录停留效果，我们在维护过程中总结了以下关键坑点与解决方案：

*   **DaisyUI Drawer 与 Sticky 的冲突**：
    - **避坑**：严禁给 `.drawer-content` 设置 `overflow: visible`（除非高度受限）。虽然这能解决部分溢出显示问题，但它会破坏父级滚动上下文，导致内部的 `position: sticky` 元素（如侧边栏和目录）失效。
    - **解决方案**：保持 DaisyUI 默认的 `overflow` 行为。对于需要吸顶的组件，确保其父容器在 `lg` 断点下具有正确的布局特征。

*   **响应式断点真空区 (Breakpoint Gap)**：
    - **现象**：在 1024px 到 1100px 之间目录同时消失。
    - **准则**：所有自定义的媒体查询（Media Query）必须与 Tailwind 的内置断点（如 `lg: 1024px`）**严格对齐**。确保移动端 UI 消失的同时，桌面端 UI 精确出现。

*   **Safari 滚动击穿补丁 (Safari Sticky Rubber-band Fix)**：
    - **问题**：Safari 浏览器在嵌套 Grid 布局下处理 `position: sticky` 存在 Bug。当页面触发橡胶带回弹（Rubber-banding）滚动时，侧边栏会产生位移或抖动。
    - **精准打击方案**：
        1.  **JS 检测**：在 `BaseLayout.astro` 的内联脚本中通过 UA 检测识别真正的 Safari 环境，并给 `html` 注入 `is-safari` 类。
        2.  **CSS 覆盖**：仅针对 `html.is-safari` 环境，在 `lg` 断点下将 `.drawer-side` 强制设为 `position: fixed`，并配合 `.drawer` 的 `padding-left` 进行布局补偿。
    - **优点**：该方案对 Chrome/Edge 用户完全透明（保留原生 Grid 性能），仅在 Safari 中启用固定补丁，实现了极佳的跨平台稳定性。

*   **真机调试建议**：
    - 使用 `pnpm run dev --host` 开启局域网监听，通过物理 iPhone/iPad 访问 IP 地址来验证 Safari 的滚动行为，这是模拟器无法完全还原的。

