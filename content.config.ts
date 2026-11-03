import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { isPostLink } from './shared/utils/post-links.mjs'

const postLink = z.string().refine(isPostLink, 'Use an http(s) URL or a quoted [Name](https://example.com) link.')

export default defineContentConfig({
  collections: {
    content: defineCollection({ type: 'page', source: { include: '**/*.md', exclude: ['blog/**'] } }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        date: z.string().optional(),
        draft: z.boolean().default(false),
        links: z.array(postLink).nullish(),
        link: postLink.nullish(),
      }),
    }),
  },
})
