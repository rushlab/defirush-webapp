import dayjs from 'dayjs'
const relativeTime = require('dayjs/plugin/relativeTime')
dayjs.extend(relativeTime)

export const formatCurrency = (value, symbol = '$') => {
  value = (+value).toFixed(2)
  if (!+value && +value !== 0) {
    return '-'
  } else if (+value < 0) {
    return `-${symbol}` + value.substr(1)
  } else if (+value === 0) {
    /* 修复 -0.00 的情况 */
    return `${symbol}0.00`
  } else {
    return symbol + value
  }
}

export const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const v = dayjs(value)
  return v.isValid() ? v.format('YYYY-MM-DD') : '-'
}

export const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }
  const v = dayjs(value)
  return v.isValid() ? v.format('YYYY-MM-DD HH:mm') : '-'
}

export const toNow = (value) => {
  const v = dayjs(value)
  return v.isValid() ? v.toNow() : '-'
}
