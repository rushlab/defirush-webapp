import Vue from 'vue'


/* global components */
import Price from '@/components/common/Price'
import Amount from '@/components/common/Amount'
Vue.component('Price', Price)
Vue.component('Amount', Amount)


/* dayjs */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)


/* initialize basic state in store */
export default async ({ store }) => {
  // store.dispatch('tokens/getTokens') 应该在确认了 chainId 以后再获取
}
