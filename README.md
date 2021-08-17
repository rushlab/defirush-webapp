# Aggregation bank front

## Vue component 中的 $wallet 对象

`plugins/wallet/index.js` 里面会处理好 `address/signer/provider`, 代码中可以直接读取, 不需要 promise

```js
this.$wallet.getAddress()
this.$wallet.getSigner()
this.$wallet.getProvider()
```

其中 `getProvider` 不会为空值, 尽量用 provider 来实例化合约, 调用的时候再 connect(signer), 这样可以确保大部分只读数据没问题

`getAddress` 返回的就是 store 里面的 `walletAddress`, 页面上通过 `isAuthenticated` 来判断是否可以显示用户数据

`getAddress` 不为空的时候不一定意味着 `getSigner` 也不为空, 页面上可以通过 store 里面的 `isSignerAlive` 来判断用户是否可以发送交易

### 通过 $wallet 对象获取余额

```typescript
await this.$wallet.getBalance(): AmountDisplay  // 不传 asset 返回 ETH 余额
await this.$wallet.getBalance(asset: Address): AmountDisplay
```

### TODO ...

支持更多的钱包类型


## Build Setup

``` bash
# install dependencies
$ npm run install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).

## 注意点
nuxtjs 版本目前固定在 2.14.4, 似乎新版有个问题, layout 切换的时候页面会 created/mounted 两次
这个问题在 https://github.com/nuxt/nuxt.js/issues/3496 里被修复了
重新产生这个问题的原因看起来是希望在 layout 切换的时候, 旧的 layout 出现新的 page 的动画, 于是新的 page 就被 mount 了两次
另外 2.14.4 还需要把 @babel/preset-env 的版本固定在 "~7.12"
