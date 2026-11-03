<script setup lang="ts">
const props = defineProps<{ address: string }>()
const open = ref(false)
const copied = ref(false)
const copying = ref(false)
const copyError = ref('')

watch(open, () => {
  copied.value = false
  copyError.value = ''
})

async function copyAddress() {
  if (copying.value) return
  copying.value = true
  copyError.value = ''
  try {
    await navigator.clipboard.writeText(props.address)
    copied.value = true
  } catch {
    copied.value = false
    copyError.value = 'Could not copy. Please try again.'
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div class="min-w-0 max-w-full">
    <UPopover v-model:open="open" :content="{ align: 'start', 'aria-label': 'Email contact options' }"
      :ui="{ content: 'w-max max-w-[calc(100vw-16px)]' }">
      <UButton :label="address" :aria-label="`Contact ${address}`" icon="i-lucide-mail" color="neutral" variant="ghost"
        size="xs" class="max-w-full cursor-default px-1.5 text-[13px]" />
      <template #content>
        <div class="flex flex-col p-1.5">
          <UButton :to="`mailto:${address}`" label="Open email app" icon="i-lucide-mail" color="neutral" variant="ghost"
            size="sm" block class="cursor-default justify-start" @click="open = false" />
          <UButton :label="copied ? 'Copied' : 'Copy address'" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :loading="copying" color="neutral" variant="ghost" size="sm" block class="cursor-default justify-start"
            @click="copyAddress" />
          <p v-if="copyError" role="alert" class="px-2 py-1.5 text-xs text-error">{{ copyError }}</p>
        </div>
      </template>
    </UPopover>
    <span role="status" aria-live="polite" class="sr-only">{{ copied ? 'Email address copied to clipboard.' : ''
    }}</span>
  </div>
</template>
