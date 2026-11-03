<script setup lang="ts">
const route = useRoute()

const { data: page } = await useAsyncData('page-' + route.path, () => {
  return queryCollection('content').path(route.path).first()
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useSeoMeta({ title: () => `${page.value?.title} — Jacob Bertilsson`, description: () => page.value?.description })
</script>

<template>
  <article v-if="page">
    <ProseH1>{{ page.title }}</ProseH1>
    <ContentRenderer :value="page" class="document-content" />
  </article>
</template>
