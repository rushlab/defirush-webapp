const consola = require('consola')
const { Nuxt, Builder } = require('nuxt')

const config = require('../nuxt.config.js')
const app = require('./app')

async function start() {
  const nuxt = new Nuxt(config)
  const { host, port } = nuxt.options.server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
