<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const { site } = useAppConfig()
const route = useRoute()
const isHome = computed(() => route.path === '/')

const { data: currentPage } = await useAsyncData(
  () => 'header-page-' + route.path,
  async () => {
    if (route.path === '/') return { title: site.name }
    const page = route.path.startsWith('/blog/')
      ? await queryCollection('blog').path(route.path).where('draft', '=', false).select('title').first()
      : await queryCollection('content').path(route.path).select('title').first()
    return { title: page?.title }
  },
)

const items = computed<BreadcrumbItem[]>(() => {
  if (isHome.value) return [{ label: site.name, active: true }]
  const home = { label: site.name, to: '/', exact: true, active: false }
  const fallback = decodeURIComponent(route.path.split('/').filter(Boolean).at(-1) || '').replace(/[-_]+/g, ' ')
  return [home, { label: currentPage.value?.title || fallback, active: true }]
})

function mobileLabel(label = '') {
  const characters = Array.from(label)
  return characters.length > 18 ? characters.slice(0, 18).join('').trimEnd() + '…' : label
}
</script>

<template>
  <div class="min-w-0">
    <UBreadcrumb :items="items" color="neutral" class="-ml-1.5 min-w-0"
      :ui="{ list: 'gap-0.5', link: 'cursor-default p-0 text-sm', item: 'first:shrink-0', separatorIcon: 'size-3' }">
      <template #item="{ item, active }">
        <span v-if="active" :title="item.label"
          class="min-w-0 cursor-default truncate px-1.5 py-1 text-sm font-medium text-default">
          <span class="sr-only">{{ item.label }}</span>
          <span aria-hidden="true" class="lg:hidden">{{ isHome ? item.label : mobileLabel(item.label) }}</span>
          <span aria-hidden="true" class="hidden lg:inline">{{ item.label }}</span>
        </span>
        <UButton v-else as="span" :label="item.label" color="neutral" variant="ghost" size="xs"
          class="min-w-0 cursor-default px-1.5 text-sm" />
      </template>
    </UBreadcrumb>
  </div>
</template>
