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

---
> 提示：执行 `pnpm run build` 前，请确保你已经使用 Astro 的 `getRelativeLocaleUrl` 修复了新添加的链接路径，防止语言互相跳转出现 404。
