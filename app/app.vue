<script setup lang="ts">
const { site } = useAppConfig()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <UHeader
      :title="site.name"
      to="/"
      :toggle="false"
      class="mx-auto w-full max-w-3xl border-b-0 bg-default backdrop-blur-none"
      :ui="{ left: 'min-w-0', title: 'text-xs font-medium', right: 'shrink-0 lg:flex-none' }"
    >
      <template #left>
        <HeaderBreadcrumb />
      </template>
      <template #right>
        <UColorModeButton size="sm" />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="max-w-7xl py-10 sm:py-14">
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
