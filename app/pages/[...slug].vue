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
  <UPage v-if="page" as="article">
    <ProseH1 :class="page.description?.trim() ? 'mb-2' : undefined">{{ page.title }}</ProseH1>
    <p v-if="page.description?.trim()" class="mb-5 text-[15px] leading-6 text-muted">{{ page.description }}</p>
    <UPageBody>
      <ContentRenderer :value="page" class="document-content" />
    </UPageBody>
  </UPage>
</template>
