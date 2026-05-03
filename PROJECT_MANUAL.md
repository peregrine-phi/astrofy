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

---
> 提示：执行 `pnpm run build` 前，请确保你已经使用 Astro 的 `getRelativeLocaleUrl` 修复了新添加的链接路径，防止语言互相跳转出现 404。
