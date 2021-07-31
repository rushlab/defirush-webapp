module.exports = {
  telemetry: false,
  ssr: false,
  /*
   ** Headers of the page
   */
  head: {
    title: 'DeFi Rush - The most trusted platform to manage digital assets',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: 'Track your full portfolio through various DeFi lending protocols on muliple chains'
      }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }]
  },
  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },
  /*
   ** Global CSS
   */
  css: [
    'element-ui/lib/theme-chalk/index.css',
    '~/assets/stylesheets/main.scss'
  ],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    '@/plugins/element-ui',
    '@/plugins/nuxt-client-init.js',
    '@/plugins/wallet/account.js',
    '@/plugins/wallet/transaction.js',
    '@/plugins/axios.js',
    '@/plugins/filters.js',
  ],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    '@nuxt/typescript-build',
    // Doc: https://github.com/nuxt-community/eslint-module
    // '@nuxtjs/eslint-module',
    // Doc: https://github.com/nuxt-community/stylelint-module
    // '@nuxtjs/stylelint-module'
  ],
  /*
   ** Nuxt.js modules
   */
  modules: [
    '@nuxtjs/axios',
  ],
  axios: {
    credentials: false  // cross-site Access-Control requests doesn't need to be made using credentials
  },
  /*
   ** Build configuration
   */
  build: {
    transpile: [/^element-ui/],
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {}
  },
  server: {
    port: process.env.PORT || 3000, // default: 3000
    host: process.env.HOSTNAME || '0.0.0.0' // default: localhost,
  }
}
