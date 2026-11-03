# Publishing and low-resource design

This records the agreed direction for future development. The exporter, image
pipeline, GitHub connection, and deployment automation are not implemented yet.

## Authoring and publishing

- Keep writing and original image attachments in the existing Obsidian vault.
- Move finished articles into a dedicated `Website/Published` folder.
- Export that folder to the website's `content/blog` directory, resolving image
  references and copying only the referenced, processed images into `public/images`.
- Rewrite image references to website URLs. Keep alt text and captions.
- Preview and validate the exported site, then commit and push to GitHub.
- Connect hosting so a push can rebuild and deploy the site.
- Keep the vault as the source for future edits; leave original images unchanged.

## Low-resource direction

Reference: [Low-tech Magazine's solar website](https://solar.lowtechmagazine.com/about/the-solar-website/).

- Prefer static deployment and minimize work performed on each visit.
- Retain system fonts and the simple document layout.
- Keep browser JavaScript, third-party requests, and unnecessary media small.
- Measure transferred page weight and browser code as the site develops.
- Prerendering Nuxt pages does not itself eliminate client JavaScript; review both.

## Proposed image pipeline

Run image processing during export, not in visitors' browsers or on every request.

1. Read the original and apply its orientation.
2. Resize without upscaling. Start by evaluating 480px and 960px variants against
   the reading column; tune these after reviewing representative images.
3. Convert photos to a small grayscale palette and dither. Four tones with
   Floyd–Steinberg dithering are an initial preset to preview, not a fixed result.
4. Encode optimized palette PNG or lossless WebP; compare actual output sizes.
5. Remove unnecessary metadata from public derivatives while preserving image
   credit and licensing information in captions or the article.
6. Cache outputs using the source image and processing settings, regenerating only
   when either changes. Use stable content-based asset names for browser caching.
7. Generate dimensions, responsive image references, and lazy loading for images
   below the initial viewport.
8. Report output sizes and provide a local preview before publishing.

Sharp supports palette PNG and Floyd–Steinberg dithering:
<https://sharp.pixelplumbing.com/api-output/#png>.

Dithering is a visual treatment and is not guaranteed to produce the smallest
file. Measure results. Allow per-image exceptions for charts, maps, screenshots,
or photographs whose meaning depends on color or fine detail. Manual work should
mainly involve choosing the image, cropping when useful, writing alt text, and
reviewing the result.
