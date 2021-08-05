import dayjs from 'dayjs'

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

export const safeToFixed = (number, decimals) => {
  // (0.2313871230128309).toFixed(20) 后面补的不是全部 0
  // TODO 处理一下补全 0, 现在只做了截断
  if (number.toString().indexOf('e') >= 0) {
    return number.toFixed(decimals)
  } else {
    const re = new RegExp(`(\\d+\\.\\d{${decimals}})(\\d+)`)
    const result = number.toString().replace(re, '$1')
    return result
  }
}

export const toNumberOrZero = (val) => {
  return +val || 0
}
