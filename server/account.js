const express = require('express')
const router = express.Router()

const { authenticate } = require('./utils/auth')


router.use('/', async (req, res, next) => {
  try {
    req.customer = await authenticate(req)
  } catch(err) {
    //
  }
  next()
})

router.get('/profile', (req, res, next) => {
  res.json({
    api: 'profile',
    customer: req.customer,
  })
})

/*
 * 处理一下错误, 不继续传递给 index.js 里面的 /api/ 路由
 */
// router.use(function(req, res, next) {
//   res.status(404)
//   res.send()
// })

module.exports = router
