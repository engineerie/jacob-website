export default defineAppConfig({
  ui: {
    colors: { primary: 'zinc', neutral: 'zinc' },
    prose: {
      h1: { slots: { base: 'text-2xl sm:text-[26px] font-semibold leading-snug tracking-tight mb-5' } },
      h2: { slots: { base: 'text-base font-semibold tracking-tight mt-8 mb-3' } },
      h3: { slots: { base: 'text-[15px] font-semibold mt-6 mb-2' } },
      p: { base: 'my-4 leading-6 text-pretty' },
      li: { base: 'my-1 ps-1 leading-6 [&>ul]:my-0' },
      ul: { base: 'list-disc ps-5 my-4 marker:text-dimmed' },
      ol: { base: 'list-decimal ps-5 my-4 marker:text-muted' },
      blockquote: { base: 'border-s-2 border-accented ps-4 text-muted' },
    },
  },
  site: {
    name: 'Jacob Bertilsson',
    social: {
      linkedin: 'https://www.linkedin.com/in/jacob-bertilsson-2a8ba2137/',
      bluesky: 'https://bsky.app/profile/jacobbertilsson.bsky.social',
    },
  },
})
