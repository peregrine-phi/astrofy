import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://peregrinewang.me',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        // Exclude 404 page
        if (page.includes('/404')) return false;
        // Exclude pagination pages (/blog/2, /store/3, etc.)
        if (/\/\d+\/?$/.test(page)) return false;
        // Exclude tag listing pages (low SEO value, duplicate content)
        if (/\/blog\/tag\//.test(page)) return false;
        return true;
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          zh: 'zh-Hans',
        },
      },
    }),
    tailwind(),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
    routing: {
      prefixDefaultLocale: false,
    }
  }
});