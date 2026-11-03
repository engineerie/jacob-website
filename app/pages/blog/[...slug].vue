<script setup lang="ts">
const route = useRoute()
const { data: post } = await useAsyncData('post-' + route.path, () => queryCollection('blog')
  .path(route.path).where('draft', '=', false).first())
if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
useSeoMeta({ title: () => `${post.value?.title} — Jacob Bertilsson`, description: () => post.value?.description })
const formattedDate = computed(() => post.value?.date
  ? new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(post.value.date)) : null)
</script>

<template>
  <article v-if="post">
    <header class="mb-7">
      <ProseH1>{{ post.title }}</ProseH1>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <time v-if="post.date" :datetime="post.date">{{ formattedDate }}</time>
        <ULink v-if="post.link" :to="post.link" target="_blank" rel="noopener noreferrer">Source ↗</ULink>
      </div>
    </header>
    <ContentRenderer :value="post" class="document-content" />
  </article>
</template>
