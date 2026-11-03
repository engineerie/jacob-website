<script setup lang="ts">
import { normalizePostLinks } from '~~/shared/utils/post-links.mjs'

const route = useRoute()
const { data: post } = await useAsyncData('post-' + route.path, () => queryCollection('blog')
  .path(route.path).where('draft', '=', false).first())
if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
useSeoMeta({ title: () => `${post.value?.title} — Jacob Bertilsson`, description: () => post.value?.description })
const formattedDate = computed(() => post.value?.date
  ? new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(post.value.date)) : null)
const relatedLinks = computed(() => normalizePostLinks({ links: post.value?.links, link: post.value?.link }))
</script>

<template>
  <article v-if="post">
    <header class="mb-7">
      <ProseH1>{{ post.title }}</ProseH1>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <time v-if="post.date" :datetime="post.date">{{ formattedDate }}</time>
      </div>
    </header>
    <ContentRenderer :value="post" class="document-content" />
    <section v-if="relatedLinks.length" class="mt-10" aria-labelledby="post-links-title">
      <h2 id="post-links-title" class="mb-3 text-sm font-medium text-highlighted">Links</h2>
      <ul class="space-y-2">
        <li v-for="link in relatedLinks" :key="link.url">
          <ULink
            :to="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex max-w-full items-baseline gap-1.5 text-sm text-default underline-offset-4 hover:underline"
          >
            <span class="min-w-0 break-words">{{ link.label }}</span>
            <span aria-hidden="true" class="shrink-0 text-muted">↗</span>
          </ULink>
        </li>
      </ul>
    </section>
  </article>
</template>
