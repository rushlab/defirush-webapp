const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
// const logger = require('morgan')

const app = express()

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
const clientRoutes = require('./api/client')
app.use('/api', clientRoutes)
const accountRoutes = require('./api/account')
app.use('/api/account', accountRoutes)


/*
 * 处理一下 404 错误, 不继续渲染 vuejs 客户端
 */
app.use('/api', function(req, res, next) {
  res.status(404)
  res.send()
})

/**
 * default error handler
 */
app.use('/api', function(err, req, res, next) {
  res.status(err.status || 500)
  res.json({
    message: err.message,
    error: err.toString()
  })
})

module.exports = app
