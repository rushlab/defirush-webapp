import Vue from 'vue'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toNow,
} from '@/utils/formatter'

Vue.filter('formatCurrency', (value) => formatCurrency(value))
Vue.filter('formatDate', (value) => formatDate(value))
Vue.filter('formatDateTime', (value) => formatDateTime(value))
Vue.filter('toNow', (value) => toNow(value))
