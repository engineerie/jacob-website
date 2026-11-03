<script setup lang="ts">
import type { AlertProps } from '@nuxt/ui'

defineProps<{ color?: AlertProps['color'] }>()
</script>

<template>
  <UAlert :color="color">
    <template #description>
      <slot />
    </template>
  </UAlert>
</template>
