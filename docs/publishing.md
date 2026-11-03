# Publish from Obsidian

Posts start with Obsidian as the source of truth. Individual posts can later be
managed in the website project for interactive charts and other custom components.
Original vault notes and images are never modified by these tools.

## Local setup

Use Node.js 22 and pnpm. Run `pnpm install` once after cloning the website.
Copy `publishing.config.example.json` to `.publishing.local.json` and set
`vaultPath` to your existing vault. The current computer is already configured.
This local file is ignored by Git and is never needed by GitHub Actions.

The default folder to publish is `Website/Published` inside the vault. Notes
elsewhere are not exported. Referenced images can be anywhere inside the vault.
Symbolic links pointing outside the vault are rejected.

## Everyday workflow

1. Write in Obsidian, with images embedded in the note.
2. Move the finished note into `Website/Published`.
3. Run `pnpm posts:sync` in the website project.
4. Check the post in the local site. If the dev server is already running, it
   refreshes automatically; otherwise run `pnpm dev`.
5. Run `pnpm posts:publish` when ready. It imports changes, runs the exporter tests,
   validates a static site build, commits generated files, and pushes the current
   `main` or `master` branch. GitHub Actions then deploys the site to GitHub Pages.

`pnpm posts:sync --dry-run` reports the proposed export without writing files.
`pnpm posts:preview` combines import and starting a dev server.
For a one-off vault, use `pnpm posts:sync --vault "/path/to/vault"`.

The publish command stages only exporter-owned posts, processed images and the
publishing manifest. Commit website code changes separately. Existing staged
changes must be committed or unstaged before using the command.

## Post properties

```yaml
---
title: A walk through the forest
date: "2026-11-03"
description: Notes from a field visit.
links:
  - "[Project documentation](https://example.com/project)"
  - https://example.org/reference
---
```

All properties above are optional. Title defaults to a leading `#` heading, then
the filename. A matching leading title heading is removed from the export so the
website displays it once. The first import supplies a publication date, which
stays stable across later edits. An explicit date overrides it.

The optional `Type` property controls the writing-list icon: `Blog post` uses a
document, and `Published article` uses an open book. Obsidian's single-item list
format is supported, as is a plain text property:

```yaml
Type:
  - Published article
```

Choose one type per post. Posts without the property retain the document icon.

Use `links` for related websites. A list item can be a plain http(s) URL or a
quoted Markdown link such as `"[Publisher](https://example.com/book)"`. Named links
display their label; plain URLs display their hostname without `www.`. The post
shows a small Links section after its body, preserving your order and removing
duplicate URLs. No section appears for an empty list. Labels render as plain text.
The older single `link` property still works; an explicit `links` list takes
precedence. Invalid links stop export before existing posts are changed.

Filenames become lowercase URL slugs: `Test for publishing.md` becomes
`/blog/test-for-publishing`. Use `slug: a-stable-name` to keep a URL when renaming
the note. Subfolder names are included in generated slugs. Collisions stop the
export rather than overwrite a post.

`draft: true` skips the note and its images. Moving a note out of Published or
marking it as a draft removes its previously generated files on the next sync.
Hand-authored posts and unrelated images are preserved. Avoid editing generated
Markdown directly: the exporter detects those edits and asks you to transfer
them back to the source note or explicitly switch that post to website management.

## Enhance a post in VS Code

To take over an imported post, add this property to the frontmatter of its file
in `content/blog/`:

```yaml
sync: website
```

You can then edit its text or add Nuxt Content components, such as an interactive
chart. Sync and publish preserve the entire website-managed file and its imported
images. Changes to the original Obsidian note no longer replace it; moving the
original out of Published or marking it as a draft no longer removes the website
version. The handover is recorded in the publishing manifest on the next sync.
Once recorded, removing the property does not automatically re-enable overwriting.

Create custom components in `app/components/content/`, for example
`ResearchChart.vue`, and embed them in the post using MDC:

```markdown
::research-chart
::
```

The component supplies the chart's data and behavior; importing a note alone does
not create a chart. Keep interactive code specific to the pages that need it.

`pnpm posts:publish` also commits edits to these existing website-managed posts.
Commit new Vue components, chart data, and other website code separately before
publishing a post that uses them. Static GitHub Pages can run browser-based charts;
features requiring a server need a separate service.

MDC syntax such as `::post-image` is supported natively by Nuxt Content, but needs
an MDC-aware editor formatter. The recommended Nuxt MDC extension provides one.
Project settings associate `content/**/*.md` with the MDC language, enable its
formatter, and select `Nuxt.mdc` for format-on-save. Other Markdown files keep
their usual editor behavior. If VS Code retains the previous formatter, run
Developer: Reload Window and check that the content file's language mode is MDC.

## Images and links

Obsidian embeds work directly:

```markdown
![[forest.jpg]]
![[forest.jpg|480]]
```

A descriptive nonnumeric embed alias is used as alt text by the exporter. Standard
Markdown also works, including filenames with spaces encoded as `%20`:

```markdown
![Fallen birch supporting young moss](../../Attachments/forest.jpg "Photo: Jacob Bertilsson")
```

The optional image title becomes a visible caption, suitable for image credits.
Filename-only embeds receive a fallback alt text and a reminder to improve it.
Keep authorship/licensing information in captions or in the article.

Images are resized without upscaling, converted to four-tone grayscale with
Floyd–Steinberg dithering, and saved as whichever is smaller: palette PNG or
lossless WebP. The default variants are 480px and 960px wide. Originals stay in the
vault; only the generated versions enter the repository. The first image is loaded
eagerly, subsequent images lazily, with responsive sizes and explicit dimensions.
Images use native browser rendering, without a zoom library or processing service.

To preserve color, set `imageMode: color` for a whole post, or use an override:

```yaml
imageOverrides:
  chart.png: color
```

Color exceptions receive lossless compression and resizing without dithering.
Changing image settings or the original regenerates its outputs. Otherwise cached
files are reused. Output filenames contain content hashes for browser caching.
The sync command reports actual file sizes, including both responsive versions.

Wiki links and Markdown `.md` links to other published notes are converted to site
links; heading links are supported. Links to private, draft or ambiguous notes
stop the export. Missing/ambiguous images also stop the export before files are
written. Code samples are left alone. External Markdown images are preserved with
a warning; download them into the vault to process them. Animated images, PDF/note
embeds, block references and images wrapped in links are not supported.

## GitHub Pages

The repository is `engineerie/jacob-website`. In repository Settings → Pages, use
GitHub Actions as the source. The workflow in `.github/workflows/pages.yml` runs
on pushes to `main`/`master` and can also be started manually.

It installs locked dependencies, runs the publishing tests, and generates static
HTML into `.output/public`. The Pages configuration supplies the correct base URL
for project repositories. GitHub never accesses the Obsidian vault: it builds the
already exported content and images committed to the repository.

The tracked `.publishing/manifest.json` records output ownership and publication
dates. Keep it in version control alongside generated posts and images.
