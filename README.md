# TODO

wallet connect 中间断掉了直接弹出扫码的时候重新连接, 连上了以后需要恢复 signer, 最好是刷新一下

加一个 reconnect 按钮，然后直接调用 enable


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
