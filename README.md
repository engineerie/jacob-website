# Jacob’s website

A minimal personal site built with Nuxt 4, Nuxt UI 4, and Nuxt Content.

The planned Obsidian publishing workflow and low-resource image processing are
documented in [the publishing plan](docs/publishing-plan.md).

## Develop

```sh
pnpm install
pnpm dev
```

## Edit the homepage

Edit `content/index.md` to change your name, introduction, and links. Edit
`content/about.md` for the about page. The current copy is a starting placeholder.
The Nuxt UI header and shared layout in `app/app.vue` use a centered, 48rem reading column
(`max-w-3xl`) with responsive side padding. Pages use a compact document layout,
and writing appears as a list of titles and dates. The header name links home.
Nuxt UI prose typography is configured in `app/app.config.ts`. The neutral light
and dark palettes and document text size live in `app/assets/css/main.css`.
The header name and social profile URLs live in `app/app.config.ts`.

## Add a post from Obsidian

1. Write a Markdown note in Obsidian.
2. Add properties at the top, using this example:

```markdown
---
title: My next post
date: "2026-10-30"
description: A short description for search engines.
---

Start writing here.

## A section

More words, a [link](https://example.com), or a list.
```

3. Copy or drag the `.md` file into `content/blog/`. Use a simple filename like
   `my-next-post.md`; it becomes `/blog/my-next-post`.

The homepage lists posts automatically, newest first. Title defaults to the first
Markdown heading (or the filename) if omitted. Date is optional; undated posts
appear after dated posts. Use a quoted `YYYY-MM-DD` date for consistent ordering.
Use the title property instead of repeating it as a `#` heading in the body.

Add `draft: true` to hide a post from the list and its public route.
These are published files, so keep private Obsidian notes outside `content/`.

Use standard Markdown links (`[Note](/blog/note)`) and images rather than
Obsidian-specific `[[wikilinks]]` or `![[embeds]]`. Put image files in
`public/images/` and reference them as `![Description](/images/photo.jpg)`.

Changes refresh automatically during `pnpm dev`. A deployed site needs to be
rebuilt and redeployed after adding or changing files; there is no upload server.
The three included posts are mock content and can be replaced or deleted.

## Production

```sh
pnpm build
pnpm preview
```
