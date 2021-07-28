import Vue from 'vue'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/utils/formatter'

Vue.filter('formatCurrency', (value) => formatCurrency(value))
Vue.filter('formatDate', (value) => formatDate(value))
Vue.filter('formatDateTime', (value) => formatDateTime(value))
