const express = require('express')
const router = express.Router()

router.get('/', (req, res, next) => {
  res.json({
    api: 'profile'
  })
})

// router.use('/', (req, res, next) => {
//   authenticate(req).then((customer) => {
//   }
// }

/*
 * 处理一下错误, 不继续传递给 index.js 里面的 /api/ 路由
 */
// router.use(function(req, res, next) {
//   res.status(404)
//   res.send()
// })

module.exports = router
