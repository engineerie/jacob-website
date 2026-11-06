<script setup lang="ts">
import { buildTimelineDefinition, formatTimelineDate, timelineColor, timelineRows } from '~/utils/timeline-chart.mjs'
import type { ChartPoint } from '@tanstack/charts'

const props = defineProps<{
  title: string
  label: string
  start?: string
  end?: string
  date?: string
  group?: string
  headers: string[]
  data: Record<string, string>[]
}>()
const definition = computed(() => buildTimelineDefinition(props))
const groups = computed(() => [...new Set(timelineRows(props).map(row => row.group))])
const groupedEvents = computed(() => Boolean(props.date && props.group))
const height = computed(() => Math.max(200, (groupedEvents.value ? groups.value.length : props.data.length) * 38 + 60))
const focusedPoint = shallowRef<ChartPoint<ReturnType<typeof timelineRows>[number]> | null>(null)
const readoutTrack = useTemplateRef('readoutTrack')
const readoutValues = useTemplateRef('readoutValues')
const trackWidth = ref(640)
const readoutWidth = ref(0)
const readoutHeight = ref(24)
const readoutLeft = computed(() => {
  const half = readoutWidth.value / 2
  return Math.max(half, Math.min(trackWidth.value - half, focusedPoint.value?.x ?? 0))
})
const reading = computed(() => {
  const datum = focusedPoint.value?.datum
  return datum ? datum.dateLabel || `${formatTimelineDate(datum.start)} – ${formatTimelineDate(datum.end - 86400000)}` : ''
})
let readoutObserver: ResizeObserver | undefined
onMounted(() => {
  readoutObserver = new ResizeObserver(() => {
    trackWidth.value = readoutTrack.value?.clientWidth ?? 640
    readoutWidth.value = readoutValues.value?.getBoundingClientRect().width ?? 0
    readoutHeight.value = Math.max(24, readoutValues.value?.getBoundingClientRect().height ?? 0)
  })
  if (readoutTrack.value) readoutObserver.observe(readoutTrack.value)
  if (readoutValues.value) readoutObserver.observe(readoutValues.value)
})
onBeforeUnmount(() => readoutObserver?.disconnect())
</script>

<template>
  <figure class="post-chart post-timeline">
    <figcaption class="post-chart-title">{{ title }}</figcaption>
    <div class="post-chart-card post-timeline-scroll" tabindex="0" :aria-label="`${title}: scroll horizontally on smaller screens`">
      <div class="post-timeline-canvas">
        <div ref="readoutTrack" class="post-chart-readout" :style="{ height: `${readoutHeight}px` }" aria-live="polite" aria-atomic="true">
          <div ref="readoutValues" class="post-chart-readout-values" :style="{ left: `${readoutLeft}px` }">
            <span v-if="focusedPoint" class="post-chart-readout-series">
              <span class="post-chart-swatch" :style="{ backgroundColor: focusedPoint.color }" aria-hidden="true" />
              <span :class="groupedEvents ? '' : 'sr-only'">{{ focusedPoint.datum.label }} · </span>
              {{ reading }}
            </span>
          </div>
        </div>
        <div class="post-chart-plot">
        <UChart :definition="definition" :aria-label="title" :height="height" :initial-width="640"
          :tooltip="false" @focus-change="focusedPoint = $event"
          :aria-description="date ? `Events positioned by date, ${groupedEvents ? 'grouped by type' : 'one per row'}. Original date precision is preserved in View data.` : 'Each activity is a horizontal date range. Start and end dates are inclusive. Full dates are available in View data.'" />
        <div v-if="focusedPoint" class="post-chart-focus" aria-hidden="true">
          <span class="post-chart-crosshair" :style="{ left: `${focusedPoint.x}px` }" />
          <span class="post-chart-point" :style="{ left: `${focusedPoint.x}px`, top: `${focusedPoint.y}px`, backgroundColor: focusedPoint.color }" />
        </div>
        </div>
      </div>
    </div>
    <div v-if="group" class="post-chart-legend" aria-label="Timeline groups">
      <span v-for="(name, i) in groups" :key="name" class="post-chart-legend-item">
        <span class="post-chart-swatch" :style="{ backgroundColor: timelineColor(i) }" />{{ name }}
      </span>
    </div>
    <details class="post-chart-details">
      <summary>View data</summary>
      <div class="post-chart-table-scroll">
        <table>
          <caption class="sr-only">{{ title }} — source data</caption>
          <thead><tr><th v-for="header in headers" :key="header" scope="col">{{ header }}</th></tr></thead>
          <tbody><tr v-for="(row, i) in data" :key="i"><td v-for="header in headers" :key="header">{{ row[header] }}</td></tr></tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
