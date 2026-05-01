---
title: "Building a Digital Garden with Astro"
description: "A reflection on why I chose Astro to build my personal site and how the concept of a digital garden shaped the way I think about writing online."
pubDate: "May 01 2026"
heroImage: "/post_img.webp"
badge: "NEW"
tags: ["astro", "web", "digital-garden"]
---

## Why a Digital Garden?

The internet is full of blogs. Most of them follow a familiar pattern: reverse-chronological posts, polished prose, and the implicit pressure to publish something *complete*. But what if writing didn't have to be like that?

A **digital garden** is a different metaphor. Instead of a stream of finished articles, it's a collection of ideas at various stages of growth — some are seedlings, others are fully grown. The emphasis is on *learning in public*, not performing expertise.

## Why Astro?

When I started looking for a framework, I had a few requirements:

1. **Static-first** — I wanted fast page loads and zero JavaScript by default.
2. **Content-focused** — Markdown support with frontmatter and content collections.
3. **Flexible** — The ability to mix frameworks (React, Vue, Svelte) when needed, but not be forced into any of them.

Astro checked all the boxes. Its *island architecture* means I can ship interactive components only where they're needed, keeping the rest of the page as pure HTML.

## The Stack

Here's what powers this site:

- **Astro** — Static site generator
- **Tailwind CSS** — Utility-first styling via DaisyUI
- **Content Collections** — Type-safe Markdown with schema validation
- **Cloudflare Pages** — Deployment and CDN

## Lessons Learned

Building in public teaches you things no tutorial can:

- **Perfectionism is the enemy of progress.** Ship the rough draft. Refine later.
- **Structure emerges from content.** Don't over-architect before you have something to say.
- **i18n is harder than it looks.** Supporting multiple languages touches every layer of your app — routing, content, UI strings, and even slug generation.

## What's Next?

I'm planning to expand the garden with more notes on systems programming, philosophy, and the intersection of technology and human experience. Stay tuned.

> *"天地者，萬物之逆旅。光陰者，百代之過客。"*
> — Li Bai
