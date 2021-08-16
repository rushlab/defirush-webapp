const express = require('express')
const jwt = require('jsonwebtoken')

const router = express.Router()

const JWT_SECRET = process.env.ADMIN_JWT_SECRET
/**
 * jwt.sign({data: 'foobar'}, 'secret', { expiresIn: 60 })
 * jwt.sign({data: 'foobar'}, 'secret', { expiresIn: '1h' })
 */
const jwtSign = (data, options) => jwt.sign(data, JWT_SECRET, options)
const jwtVerify = (token) => new Promise((resolve, reject) => {
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      reject(err)
    } else {
      resolve(decoded)
    }
  })
})

const createError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

router.use('/', async (req, res, next) => {
  try {
    if (!/admin-jwt [^ ]+/i.test(req.headers.authorization || '')) {
      throw createError(401, 'Not authorized')
    }
    const token = req.headers.authorization.split(' ')[1]
    try {
      await jwtVerify(token)
    } catch(err) {
      throw createError(401, err.message || 'Invalid token')
    }
  } catch(err) {
    next(err)
    return
  }
  next()
})

router.get('/test', async (req, res, next) => {
  res.json({
    test: true
  })
})

module.exports = router
