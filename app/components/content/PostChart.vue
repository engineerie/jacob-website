<script setup lang="ts">
import { areaY, barY, defineChart, group, lineY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scalePoint } from '@tanstack/charts/scales/point'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { ChartPoint } from '@tanstack/charts'

const props = defineProps<{
  type: 'line' | 'area' | 'bar'
  index: string
  title: string
  headers: string[]
  categories: string[]
  data: Record<string, string | number>[]
}>()

const numberFormat = new Intl.NumberFormat('en-GB')
const seriesColor = (i: number) => `var(--ui-chart-${i % 2 + 1})`
const focusMaskId = `post-chart-focus-${useId().replace(/[^a-zA-Z0-9_-]/g, '-')}`
type Reading = { x: string | number, category: string, value: number }
const focusedPoint = shallowRef<ChartPoint<Reading> | null>(null)
const focusedGroup = shallowRef<readonly ChartPoint<Reading>[]>([])
const readoutTrack = useTemplateRef('readoutTrack')
const readoutValues = useTemplateRef('readoutValues')
const trackWidth = ref(640)
const readoutWidth = ref(0)
const readoutHeight = ref(24)
const barGroupWidth = computed(() => {
  const plotWidth = Math.max(1, trackWidth.value - 72)
  return Math.min(props.categories.length * 8, plotWidth / (props.data.length + 1))
})
const readings = computed(() => {
  if (!focusedPoint.value) return []
  const points = focusedGroup.value.filter(point => point.xValue === focusedPoint.value?.xValue)
  if (!points.length) points.push(focusedPoint.value)
  return props.categories.flatMap(category => {
    const point = points.find(point => point.datum.category === category)
    return point ? [point] : []
  })
})
// Grouped bars have different point positions; their guide belongs at the midpoint.
const crosshairX = computed(() => readings.value.length
  ? readings.value.reduce((sum, point) => sum + point.x, 0) / readings.value.length
  : 0)
const readoutLeft = computed(() => {
  const half = readoutWidth.value / 2
  return Math.max(half, Math.min(trackWidth.value - half, crosshairX.value))
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
// Shared chart presentation: posts supply only their data and chart type.
const definition = computed(() => {
  const rows = props.data.flatMap(row => props.categories.map(category => ({
    x: row[props.index], category, value: Number(row[category]),
  })))
  const channels = { x: 'x', y: 'value', z: 'category', color: 'category' } as const
  const plotWidth = Math.max(1, trackWidth.value - 72)
  const groupWidth = barGroupWidth.value
  // Constrain the whole group, rather than shrinking each bar inside a wide slot.
  const barPadding = Math.max(0, 1 - groupWidth * props.data.length / Math.max(1, plotWidth - groupWidth))
  const marks = props.type === 'bar'
    ? [barY(rows, { ...channels, maxThickness: 8, radius: 2, layout: group({ padding: 0 }) })]
    : [
        // Explicit endpoints prevent TanStack from automatically stacking series.
        ...(props.type === 'area' ? [decorative(areaY(rows, { ...channels, y1: 0, y2: 'value', fillOpacity: 0.08 }))] : []),
        lineY(rows, { ...channels, strokeWidth: 2, lineCap: 'round', lineJoin: 'round' }),
      ]
  return defineChart({
    marks,
    focusRing: false,
    margin: { top: 16, right: 20, bottom: 40, left: 52 },
    theme: { foreground: 'var(--ui-text-muted)', muted: 'var(--ui-text-dimmed)', grid: 'var(--ui-border)', background: 'var(--ui-bg)' },
    scales: {
      x: {
        scale: props.type === 'bar' ? () => scaleBand().paddingInner(barPadding).paddingOuter(0.5) : () => scalePoint().padding(0.15),
        axis: { line: false, ticks: { line: false, padding: 16 }, tickLabels: { fontSize: 11, thin: { minGap: 28, priority: 'ends' } } },
      },
      y: {
        scale: scaleLinear, nice: true,
        grid: { stroke: 'var(--ui-border)', strokeWidth: 1 },
        axis: { line: false, ticks: { count: 4, line: false, padding: 14, format: value => numberFormat.format(Number(value)) }, tickLabels: { fontSize: 11 } },
      },
    },
    color: { scale: scaleOrdinal().domain(props.categories).range(props.categories.map((_, i) => seriesColor(i))) },
    focus: 'group-x',
    maxFocusDistance: Number.POSITIVE_INFINITY,
  })
})
</script>

<template>
  <figure class="post-chart">
    <figcaption class="post-chart-title">{{ title }}</figcaption>
    <div class="post-chart-card">
    <div ref="readoutTrack" class="post-chart-readout" :style="{ height: `${readoutHeight}px` }" aria-live="polite" aria-atomic="true">
      <div ref="readoutValues" class="post-chart-readout-values" :style="{ left: `${readoutLeft}px` }">
        <span v-for="point in readings" :key="point.datum.category" class="post-chart-readout-series">
          <span class="post-chart-swatch" :style="{ backgroundColor: point.color }" aria-hidden="true" />
          <span class="sr-only">{{ point.datum.category }}: </span>
          {{ numberFormat.format(point.datum.value) }}
        </span>
      </div>
    </div>
    <div class="post-chart-plot" :data-focused="readings.length ? '' : undefined"
      :style="{ '--post-chart-mask': `url(#${focusMaskId})` }">
    <!-- Mask only the data marks: guides, labels and focus dots keep full contrast. -->
    <svg class="post-chart-mask-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <mask :id="focusMaskId" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
          x="0" y="0" :width="trackWidth" height="260" style="mask-type: alpha">
          <rect x="0" y="0" :width="trackWidth" height="260" fill="white" class="post-chart-mask-future" />
          <!-- Bars highlight only the selected group; lines retain the history to its left. -->
          <rect :x="type === 'bar' ? crosshairX - barGroupWidth / 2 : 0" y="0"
            :width="type === 'bar' ? barGroupWidth : Math.max(0, crosshairX)" height="260" fill="white" />
        </mask>
      </defs>
    </svg>
    <UChart
      :type="type"
      :data="data"
      :index="index"
      :categories="categories"
      :definition="definition"
      :aria-label="title"
      :height="260"
      :initial-width="640"
      :tooltip="false"
      @focus-change="focusedPoint = $event"
      @focus-group-change="focusedGroup = $event"
    />
    <div v-if="readings.length" class="post-chart-focus" aria-hidden="true">
      <span class="post-chart-crosshair" :style="{ left: `${crosshairX}px` }" />
      <template v-if="type !== 'bar'">
        <span v-for="point in readings" :key="point.datum.category" class="post-chart-point"
          :style="{ left: `${point.x}px`, top: `${point.y}px`, backgroundColor: point.color }" />
      </template>
    </div>
    </div>
    </div>
    <div v-if="categories.length > 1" class="post-chart-legend" aria-label="Chart series">
      <span v-for="(category, i) in categories" :key="category" class="post-chart-legend-item">
        <span class="post-chart-swatch" :style="{ backgroundColor: seriesColor(i) }" />{{ category }}
      </span>
    </div>
    <details class="post-chart-details">
      <summary>View data</summary>
      <div class="post-chart-table-scroll">
        <table>
          <caption class="sr-only">{{ title }} — source data</caption>
          <thead><tr><th v-for="header in headers" :key="header" scope="col">{{ header }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, rowIndex) in data" :key="rowIndex">
              <td v-for="header in headers" :key="header">{{ row[header] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
