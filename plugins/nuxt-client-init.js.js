import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

export default async ({ store }) => {
  store.dispatch('tokens/getTokens')
}
