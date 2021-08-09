import Vue from 'vue'


/* global components */
import Price from '@/components/common/Price'
Vue.component('Price', Price)


/* dayjs */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)


/* initialize basic state in store */
export default async ({ store }) => {
  store.dispatch('tokens/getTokens')
}
