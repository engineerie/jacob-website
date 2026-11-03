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
      <time v-if="post.date" :datetime="post.date" class="text-xs text-muted">{{ formattedDate }}</time>
    </header>
    <ContentRenderer :value="post" class="document-content" />
  </article>
</template>
