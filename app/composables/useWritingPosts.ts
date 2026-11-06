export function useWritingPosts() {
  return useAsyncData('home-posts', () => queryCollection('blog')
    .where('draft', '=', false).order('date', 'DESC').order('title', 'ASC')
    .select('path', 'title', 'description', 'date', 'Type', 'start', 'end', 'publication').all())
}
