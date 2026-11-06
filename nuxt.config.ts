// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/content", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  content: {
    build: {
      markdown: {
        // Use frontmatter for titles and descriptions instead of inferring them from body text.
        contentHeading: false,
      },
    },
  },
  colorMode: { preference: "system", fallback: "light" },
  app: { head: { htmlAttrs: { lang: "en" } } },
  devtools: { enabled: true },
  nitro: { prerender: { routes: ["/", "/about"], crawlLinks: true } },
  compatibilityDate: "2024-04-03",
});
