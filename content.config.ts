import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({ type: 'page', source: { include: '**/*.md', exclude: ['blog/**'] } }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({ date: z.string().optional(), draft: z.boolean().default(false) }),
    }),
  },
})
