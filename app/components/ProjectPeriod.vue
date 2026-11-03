<script setup lang="ts">
import { getProjectPeriod } from '~~/shared/utils/project-period.mjs'

const props = defineProps<{ start?: string | null, end?: string | null }>()
const period = computed(() => getProjectPeriod(props))
</script>

<template>
  <span v-if="period" class="inline-flex items-center gap-1 whitespace-nowrap">
    <time :datetime="period.start">{{ period.startLabel }}</time>
    <span aria-hidden="true">–</span>
    <time v-if="period.end" :datetime="period.end">{{ period.endLabel }}</time>
    <span v-else>{{ period.endLabel }}</span>
  </span>
</template>
