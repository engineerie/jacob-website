import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { isPostLink } from './shared/utils/post-links.mjs'
import { isPostType } from './shared/utils/post-type.mjs'
import { isProjectDate } from './shared/utils/project-period.mjs'

const postLink = z.string().refine(isPostLink, 'Use an http(s) URL or a quoted [Name](https://example.com) link.')

export default defineContentConfig({
  collections: {
    content: defineCollection({ type: 'page', source: { include: '**/*.md', exclude: ['blog/**'] } }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        date: z.string().optional(),
        start: z.string().nullish().refine(isProjectDate, 'Use YYYY-MM-DD for start.'),
        end: z.string().nullish().refine(isProjectDate, 'Use YYYY-MM-DD for end.'),
        draft: z.boolean().default(false),
        Type: z.union([z.string(), z.array(z.string())]).nullish().refine(isPostType, 'Choose one Type: Blog post, Published article, or Project.'),
        links: z.array(postLink).nullish(),
        link: postLink.nullish(),
      }),
    }),
  },
})
