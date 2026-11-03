// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/content", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  colorMode: { preference: "system", fallback: "light" },
  app: { head: { htmlAttrs: { lang: "en" } } },
  devtools: { enabled: true },
  compatibilityDate: "2024-04-03",
});
