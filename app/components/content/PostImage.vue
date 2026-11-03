<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string
  alt: string
  width: number
  height: number
  srcset?: string
  loading?: 'eager' | 'lazy'
  displayWidth?: number
  caption?: string
}>(), { loading: 'lazy' })

const baseURL = useRuntimeConfig().app.baseURL
function withBase(src: string) {
  return /^(?:https?:)?\/\//.test(src) ? src : `${baseURL.replace(/\/$/, '')}/${src.replace(/^\//, '')}`
}
const sources = computed(() => props.srcset?.split(',').map((source) => {
  const [url, width] = source.trim().split(/\s+/)
  return `${withBase(url)} ${width}`
}).join(', '))
const sizes = computed(() => props.displayWidth ? `(max-width: ${props.displayWidth}px) 100vw, ${props.displayWidth}px`
  : '(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 704px')
</script>

<template>
  <figure class="my-6">
    <img
      :src="withBase(src)"
      :alt="alt"
      :width="width"
      :height="height"
      :srcset="sources"
      :sizes="sizes"
      :loading="loading"
      decoding="async"
      class="block h-auto w-full max-w-full rounded-sm"
      :style="displayWidth ? { maxWidth: `${displayWidth}px` } : undefined"
    >
    <figcaption v-if="caption" class="mt-2 text-xs leading-5 text-muted">{{ caption }}</figcaption>
  </figure>
</template>
