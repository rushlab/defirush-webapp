const axios = require('axios')
const express = require('express')
const router = express.Router()

const { getSecret } = require('../utils/index')
const DEFI_PULSE_API_KEY = getSecret('DEFI_PULSE_API_KEY', '')

// TODO 可以考虑用 https://www.gasnow.org/

router.get('/gas_price_table', async (req, res, next) => {
  const { data } = await axios.get('https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json', {
    params: {
      'api-key': DEFI_PULSE_API_KEY
    }
  })
  const { fast, safeLow, average, avgWait, safeLowWait, fastWait } = data
  res.json({
    fast: {
      waiting_seconds: parseInt(fastWait * 60),
      price_gwei: (fast / 10).toFixed(1)
    },
    normal: {
      waiting_seconds: parseInt(avgWait * 60),
      price_gwei: (average / 10).toFixed(1)
    },
    slow: {
      waiting_seconds: parseInt(safeLowWait * 60),
      price_gwei: (safeLow / 10).toFixed(1)
    }
  })
})

module.exports = router
