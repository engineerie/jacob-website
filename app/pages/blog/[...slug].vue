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
const { data: posts } = await useWritingPosts()
const surround = computed(() => {
  const items = (posts.value || []).filter(item => getPostType(item.Type) === getPostType(post.value?.Type))
  const index = items.findIndex(item => item.path === post.value?.path)
  if (index < 0) return [null, null]
  return [
    items[index - 1] ? { ...items[index - 1], direction: 'Previous', icon: 'i-lucide-arrow-left', class: 'col-start-1' } : null,
    items[index + 1] ? { ...items[index + 1], direction: 'Next', icon: 'i-lucide-arrow-right', class: 'col-start-2' } : null,
  ]
})
</script>

<template>
  <UPage v-if="post" as="article">
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
    <UPageBody>
      <ContentRenderer :value="post" class="document-content" />
    </UPageBody>
    <UContentSurround
      v-if="surround.some(Boolean)"
      as="nav"
      aria-label="Previous and next items"
      :surround="surround"
      class="mt-12"
      :ui="{
        root: 'grid-cols-2 gap-4',
        link: 'min-w-0 cursor-default rounded-md border-0 px-2 py-2 hover:bg-elevated text-default focus-visible:border-transparent',
      }"
    >
      <template #link="{ link }">
        <span class="flex items-center gap-1.5 text-xs text-muted" :class="link.direction === 'Next' ? 'justify-end' : ''">
          <UIcon v-if="link.direction === 'Previous'" :name="link.icon" class="size-3.5 shrink-0" />
          {{ link.direction }}
          <UIcon v-if="link.direction === 'Next'" :name="link.icon" class="size-3.5 shrink-0" />
        </span>
        <span class="mt-1 block text-[13px] font-medium [overflow-wrap:anywhere]">{{ link.title }}</span>
      </template>
    </UContentSurround>
  </UPage>
</template>
