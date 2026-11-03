<script setup lang="ts">
import { normalizePostLinks } from '~~/shared/utils/post-links.mjs'
import { getPostType } from '~~/shared/utils/post-type.mjs'

const route = useRoute()
const { data: post } = await useAsyncData('post-' + route.path, () => queryCollection('blog')
  .path(route.path).where('draft', '=', false).first())
if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
useSeoMeta({ title: () => `${post.value?.title} — Jacob Bertilsson`, description: () => post.value?.description })
const formattedDate = computed(() => post.value?.date
  ? new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(post.value.date)) : null)
const relatedLinks = computed(() => normalizePostLinks({ links: post.value?.links, link: post.value?.link }))
const isProject = computed(() => getPostType(post.value?.Type) === 'Project')
</script>

<template>
  <article v-if="post">
    <header class="mb-7">
      <ProseH1>{{ post.title }}</ProseH1>
      <div v-if="(isProject ? post.start : post.date) || relatedLinks.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <ProjectPeriod v-if="isProject" :start="post.start" :end="post.end" class="shrink-0" />
        <time v-else-if="post.date" :datetime="post.date" class="shrink-0">{{ formattedDate }}</time>
        <nav v-if="relatedLinks.length" aria-label="Related links" class="flex min-w-0 max-w-full flex-wrap gap-1">
          <UButton
            v-for="link in relatedLinks"
            :key="link.url"
            :to="link.url"
            :label="link.label"
            :title="link.label"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-link"
            class="min-w-0 max-w-full cursor-default px-1.5 text-[13px]"
          />
        </nav>
      </div>
    </header>
    <ContentRenderer :value="post" class="document-content" />
  </article>
</template>
