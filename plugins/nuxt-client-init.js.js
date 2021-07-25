export default async ({ store }) => {
  store.dispatch('tokens/getTokens')
}
