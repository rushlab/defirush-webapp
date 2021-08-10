const _ = require('lodash')
const axios = require('axios')
const { ethers } = require('ethers')
const express = require('express')
const router = express.Router()

const { getSecret } = require('../utils/index')
const DEFI_PULSE_API_KEY = getSecret('DEFI_PULSE_API_KEY', '')
const ETHERSCAN_API_KEY = getSecret('ETHERSCAN_API_KEY', '')

// TODO 可以考虑用 https://www.gasnow.org/
// router.get('/gas_price_table', async (req, res, next) => {
//   const { data } = await axios.get('https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json', {
//     params: {
//       'api-key': DEFI_PULSE_API_KEY
//     }
//   })
//   const { fast, safeLow, average, avgWait, safeLowWait, fastWait } = data
//   res.json({
//     fast: {
//       waiting_seconds: parseInt(fastWait * 60),
//       price_gwei: (fast / 10).toFixed(1)
//     },
//     normal: {
//       waiting_seconds: parseInt(avgWait * 60),
//       price_gwei: (average / 10).toFixed(1)
//     },
//     slow: {
//       waiting_seconds: parseInt(safeLowWait * 60),
//       price_gwei: (safeLow / 10).toFixed(1)
//     }
//   })
// })


const gasPriceTable = new (function() {
  this._updatedAt = 0
  this._data = {
    fast: { waiting_seconds: 0, price_gwei: 0 },
    normal: { waiting_seconds: 0, price_gwei: 0 },
    slow: { waiting_seconds: 0, price_gwei: 0 },
  }
  this._update = async function() {
    const res = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'gastracker',
        action: 'gasoracle',
        apikey: ETHERSCAN_API_KEY,
      }
    }).catch(() => ({'data': {'status': 0, 'message': 'request error'}}))
    if (+res.data.status !== 1) {
      console.log('error gasoracle', res.data.message)
      return
    }
    const result = res.data.result
    this._data['fast']['price_gwei'] = result['FastGasPrice'].toString()
    this._data['normal']['price_gwei'] = result['ProposeGasPrice'].toString()
    this._data['slow']['price_gwei'] = result['SafeGasPrice'].toString()
    _.forEach(['fast', 'normal', 'slow'], async (key) => {
      const item = this._data[key]
      const gasprice = ethers.utils.parseUnits(item['price_gwei'], 'gwei').toString()
      const res = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'gastracker',
          action: 'gasestimate',
          gasprice: gasprice,
          apikey: ETHERSCAN_API_KEY,
        }
      }).catch(() => ({'data': {'status': 0, 'message': 'request error'}}))
      if (+res.data.status !== 1) {
        console.log('error gasestimate', res.data.message)
        return
      }
      item['waiting_seconds'] = parseInt(res.data.result)
    })
    setTimeout(() => this._update(), 15000)
  }
  this.get = async function() {
    return this._data
  }
  // 构建了以后立即 update 一次
  this._update()
})();

router.get('/gas_price_table', async (req, res, next) => {
  const results = await gasPriceTable.get()
  res.json(results)
})

module.exports = router
