<template>
  <UCard>
    <template #header>Counter: {{ count }}</template>
    <UFieldGroup>
      <UButton @click="increment">Increment</UButton>
      <UButton @click="decrement">Decrement</UButton>
    </UFieldGroup>
  </UCard>
</template>

<script setup lang="ts">
const count = ref(0)

const increment = () => {
  count.value++
}

const decrement = () => {
  count.value--
}
</script>

