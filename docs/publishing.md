# Publish from Obsidian

The Obsidian vault is the source of truth. The website receives exported Markdown
and optimized images. Original notes and images are never modified by these tools.

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
link: https://example.com/source
---
```

All properties above are optional. Title defaults to a leading `#` heading, then
the filename. A matching leading title heading is removed from the export so the
website displays it once. The first import supplies a publication date, which
stays stable across later edits. An explicit date overrides it. `link`, when
present, appears as a Source link under the post title.

Filenames become lowercase URL slugs: `Test for publishing.md` becomes
`/blog/test-for-publishing`. Use `slug: a-stable-name` to keep a URL when renaming
the note. Subfolder names are included in generated slugs. Collisions stop the
export rather than overwrite a post.

`draft: true` skips the note and its images. Moving a note out of Published or
marking it as a draft removes its previously generated files on the next sync.
Hand-authored posts and unrelated images are preserved. Avoid editing generated
Markdown directly: the exporter detects those edits and asks you to transfer
them back to the source note before it overwrites anything.

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
