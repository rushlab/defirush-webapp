const dotenv = require('dotenv')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
// const logger = require('morgan')

dotenv.config()
const app = express()
module.exports = app


app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])  // app.enable('trust proxy')
// app.use(logger('combined'))  // logger('dev')
app.use('/.ping', function(req, res, next) {
  res.json({
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    hostname: req.hostname,
    originalUrl: req.originalUrl,
    headers: req.headers
  })
})

app.use('/api', cors())
app.use('/api', bodyParser.json())
app.use('/api', bodyParser.urlencoded({ extended: false }))
app.use('/api', cookieParser())


/**
 * API routes
 */
const clientRoutes = require('./routes/client')
app.use('/api', clientRoutes)
const tokensRoutes = require('./routes/tokens')
app.use('/api/tokens', tokensRoutes)
const accountRoutes = require('./routes/account')
app.use('/api/account', accountRoutes)
const adminRoutes = require('./routes/admin')
app.use('/api/admin', adminRoutes)


/*
 * 处理一下 404 错误, 注意只处理 /api 下的 404
 */
app.use('/api', function(req, res, next) {
  res.status(404)
  res.send()
})

/**
 * default error handler, 注意只处理 /api 下的
 */
app.use('/api', function(err, req, res, next) {
  res.status(err.status || 500)
  res.json({
    message: err.message,
    error: err.toString()
  })
})

/**
 * Telegram bot
 */
if (process.env.TELEGRAM_BOT === '1') {
  const { run: runTelegramBot } = require('./tasks/telegram-listener')
  runTelegramBot()
}

if (require.main === module) {
  const consola = require('consola')
  const port = process.env.PORT || 3001
  const host = process.env.HOST || '127.0.0.1'
  app.listen(port, host, () => {
    consola.ready({
      message: `Standalone API server listening on http://${host}:${port}`,
      badge: true
    })
  })
}
