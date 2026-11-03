<script setup lang="ts">
const { data: intro } = await useAsyncData('home-intro', () => queryCollection('content').path('/').first())
const { data: posts } = await useAsyncData('home-posts', () => queryCollection('blog')
  .where('draft', '=', false).order('date', 'DESC').order('title', 'ASC')
  .select('path', 'title', 'date').all())
useSeoMeta({ title: () => intro.value?.title || 'Jacob Bertilsson', description: () => intro.value?.description })

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
}
</script>

<template>
  <article>
    <ProseH1>{{ intro?.title || 'Jacob Bertilsson' }}</ProseH1>
    <ContentRenderer v-if="intro" :value="intro" class="document-content" />

    <section id="writing" class="mt-12 scroll-mt-20" aria-labelledby="writing-title">
      <div class="mb-1 flex items-center gap-2 pb-3">
        <h2 id="writing-title" class="font-medium text-highlighted">Writing</h2>
      </div>
      <ul v-if="posts?.length">
        <li v-for="post in posts" :key="post.path">
          <NuxtLink
            :to="post.path"
            class="group -mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-elevated/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-4 shrink-0 text-dimmed" aria-hidden="true">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
              <path d="M14 3v6h6M8 13h8M8 17h5" />
            </svg>
            <span class="min-w-0 flex-1 font-medium text-default group-hover:text-highlighted">{{ post.title }}</span>
            <time v-if="post.date" :datetime="post.date" class="shrink-0 text-xs tabular-nums text-muted">{{ formatDate(post.date) }}</time>
          </NuxtLink>
        </li>
      </ul>
      <ProseP v-else>Something to share soon.</ProseP>
    </section>
  </article>
</template>
