const express = require('express')
const router = express.Router()

const { authenticate } = require('../utils/auth')
const error = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

router.use('/', async (req, res, next) => {
  try {
    req.customer = await authenticate(req)
  } catch(err) {
    //
  }
  next()
})

router.get('/profile', (req, res, next) => {
  if (req.customer.isAuthenticated) {
    res.json(req.customer.profile)
  } else {
    throw error(403, 'Not authenticated')
  }
})

/*
 * 处理一下错误, 不继续传递给 index.js 里面的 /api/ 路由
 */
// router.use(function(req, res, next) {
//   res.status(404)
//   res.send()
// })

module.exports = router
