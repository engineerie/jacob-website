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
      class="mx-auto w-full max-w-3xl border-b-0"
      :ui="{ left: 'min-w-0', title: 'text-xs font-medium', right: 'shrink-0 lg:flex-none' }"
    >
      <template #left>
        <HeaderBreadcrumb />
      </template>
      <template #right>
        <UButton
          :to="site.social.linkedin"
          target="_blank"
          rel="me noopener noreferrer"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          icon="i-simple-icons-linkedin"
          aria-label="Jacob Bertilsson on LinkedIn"
        />
        <UButton
          :to="site.social.bluesky"
          target="_blank"
          rel="me noopener noreferrer"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          icon="i-simple-icons-bluesky"
          aria-label="Jacob Bertilsson on Bluesky"
        />
        <UColorModeButton size="sm" />
      </template>
    </UHeader>

    <UContainer class="max-w-3xl py-10 sm:py-14">
      <main>
        <NuxtPage />
      </main>
    </UContainer>
  </UApp>
</template>
