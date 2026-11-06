<script setup lang="ts">
import { getPostType } from '~~/shared/utils/post-type.mjs'
import { getPostPublication } from '~~/shared/utils/post-publication.mjs'

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
  <UPage as="article">
    <header class="mb-7">
      <ProseH1 :class="intro?.description?.trim() ? 'mb-2' : undefined">{{ intro?.title || 'Jacob Bertilsson' }}</ProseH1>
      <p v-if="intro?.description?.trim()" class="mb-5 text-[15px] leading-6 text-muted">{{ intro.description }}</p>
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
    <UPageBody>
      <ContentRenderer v-if="intro" :value="intro" class="document-content" />
    </UPageBody>

    <section id="writing" class="mt-12 scroll-mt-20" aria-labelledby="writing-title">
      <h2 id="writing-title" class="sr-only">Writing and projects</h2>
      <UTabs v-model="selectedTab" :items="writingTabs" :unmount-on-hide="false" color="neutral" variant="link"
        size="sm" class="w-full"
        :ui="{ list: 'w-auto self-start gap-4 border-0 p-0', trigger: 'cursor-default px-0 py-2 text-[13px]', content: 'pt-2' }">
        <template #content="{ item }">
          <ul v-if="item.posts.length">
            <li v-for="post in item.posts" :key="post.path">
              <UTooltip :text="post.description?.trim()" :disabled="!post.description?.trim()"
                :delay-duration="300" :content="{ align: 'start' }"
                :ui="{ content: 'h-auto max-w-xs py-2', text: 'whitespace-normal leading-5' }">
                <NuxtLink :to="post.path"
                  class="group -mx-2 grid min-h-12 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-md px-2 py-3 transition-colors hover:bg-elevated/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none sm:grid-cols-[1rem_minmax(0,1fr)_auto]">
                  <span class="col-start-1 row-start-1 flex h-6 items-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                      stroke-linejoin="round" class="size-4 shrink-0" role="img"
                      :class="site.typeIconColors[getPostType(post.Type)]"
                      :aria-label="getPostType(post.Type)">
                      <title>{{ getPostType(post.Type) }}</title>
                      <path v-if="item.value === 'publications'"
                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                      <path v-else-if="item.value === 'projects'"
                        d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
                      <template v-else>
                        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
                        <path d="M14 3v6h6M8 13h8M8 17h5" />
                      </template>
                    </svg>
                  </span>
                  <span class="col-start-2 row-start-1 min-w-0">
                    <span class="block font-medium leading-6 text-default group-hover:text-highlighted">{{ post.title }}</span>
                    <span v-if="item.value === 'publications' && getPostPublication(post)"
                      class="mt-1 block text-xs text-muted [overflow-wrap:anywhere]">{{ getPostPublication(post) }}</span>
                  </span>
                  <ProjectPeriod v-if="item.value === 'projects'" :start="post.start" :end="post.end" class="col-start-2 row-start-2 text-xs leading-6 tabular-nums text-muted sm:col-start-3 sm:row-start-1" />
                  <time v-else-if="post.date" :datetime="post.date" class="col-start-2 row-start-2 text-xs leading-6 tabular-nums text-muted sm:col-start-3 sm:row-start-1">{{
                    formatDate(post.date)
                    }}</time>
                </NuxtLink>
              </UTooltip>
            </li>
          </ul>
          <p v-else class="py-6 text-sm text-muted">{{ item.empty }}</p>
        </template>
      </UTabs>
    </section>
  </UPage>
</template>
