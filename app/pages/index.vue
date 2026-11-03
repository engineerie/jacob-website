<script setup lang="ts">
import { getPostType } from '~~/shared/utils/post-type.mjs'

const { site } = useAppConfig()
const { data: intro } = await useAsyncData('home-intro', () => queryCollection('content').path('/').first())
const { data: posts } = await useWritingPosts()
useSeoMeta({ title: () => intro.value?.title || 'Jacob Bertilsson', description: () => intro.value?.description })

const selectedTab = useState<string>('writing-tab', () => 'blog')
const categories = [
  { label: 'Blog', value: 'blog', type: 'Blog post', empty: 'No blog posts yet.' },
  { label: 'Publications', value: 'publications', type: 'Published article', empty: 'No publications yet.' },
  { label: 'Projects', value: 'projects', type: 'Project', empty: 'No projects yet.' },
]
const writingTabs = computed(() => categories.map(category => ({
  ...category,
  posts: (posts.value || []).filter(post => getPostType(post.Type) === category.type),
})))

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
}
</script>

<template>
  <article>
    <header class="mb-7">
      <ProseH1>{{ intro?.title || 'Jacob Bertilsson' }}</ProseH1>
      <nav aria-label="Contact and social profiles" class="-ml-1.5 flex flex-wrap items-center gap-1">
        <ContactEmail :address="site.email" />
        <UButton :to="site.social.linkedin" label="LinkedIn" icon="i-simple-icons-linkedin"
          target="_blank" rel="me noopener noreferrer" color="neutral" variant="ghost" size="xs"
          class="cursor-default px-1.5 text-[13px]" />
        <UButton :to="site.social.bluesky" label="Bluesky" icon="i-simple-icons-bluesky"
          target="_blank" rel="me noopener noreferrer" color="neutral" variant="ghost" size="xs"
          class="cursor-default px-1.5 text-[13px]" />
        <UButton :to="site.social.github" label="GitHub" icon="i-simple-icons-github"
          target="_blank" rel="me noopener noreferrer" color="neutral" variant="ghost" size="xs"
          class="cursor-default px-1.5 text-[13px]" />
      </nav>
    </header>
    <ContentRenderer v-if="intro" :value="intro" class="document-content" />

    <section id="writing" class="mt-12 scroll-mt-20" aria-labelledby="writing-title">
      <h2 id="writing-title" class="sr-only">Writing and projects</h2>
      <UTabs v-model="selectedTab" :items="writingTabs" :unmount-on-hide="false" color="neutral" variant="link"
        size="sm" class="w-full"
        :ui="{ list: 'w-auto self-start gap-4 border-0 p-0', trigger: 'cursor-default px-0 py-2 text-[13px]', content: 'pt-2' }">
        <template #content="{ item }">
          <ul v-if="item.posts.length">
            <li v-for="post in item.posts" :key="post.path">
              <NuxtLink :to="post.path"
                class="group -mx-2 flex min-h-12 cursor-default items-start gap-3 rounded-md px-2 py-3 transition-colors hover:bg-elevated/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none sm:items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                  stroke-linejoin="round" class="mt-0.5 size-4 shrink-0 text-dimmed sm:mt-0" role="img"
                  :aria-label="getPostType(post.Type)">
                  <title>{{ getPostType(post.Type) }}</title>
                  <path v-if="item.value === 'publications'"
                    d="M12 7v14M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z" />
                  <path v-else-if="item.value === 'projects'"
                    d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
                  <template v-else>
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
                    <path d="M14 3v6h6M8 13h8M8 17h5" />
                  </template>
                </svg>
                <span class="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span class="min-w-0 flex-1 font-medium text-default group-hover:text-highlighted">{{ post.title
                    }}</span>
                  <ProjectPeriod v-if="item.value === 'projects'" :start="post.start" :end="post.end" class="shrink-0 text-xs tabular-nums text-muted" />
                  <time v-else-if="post.date" :datetime="post.date" class="shrink-0 text-xs tabular-nums text-muted">{{
                    formatDate(post.date)
                    }}</time>
                </span>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="py-6 text-sm text-muted">{{ item.empty }}</p>
        </template>
      </UTabs>
    </section>
  </article>
</template>
