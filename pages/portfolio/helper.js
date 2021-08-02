import _ from 'lodash'

async function _getAssetDepositsData(bankApp, asset) {
  const [
    { userDeposits },
    { depositAPY, priceUSD }
  ] = await Promise.all([
    bankApp.getAccountAssetData(asset),
    bankApp.getAssetData(asset)
  ])
  const userDepositsUSD = +userDeposits * +priceUSD
  // const userEarnUSDInYear = userDepositsUSD * +depositAPY
  return {
    userDeposits,
    depositAPY, priceUSD,
    userDepositsUSD: userDepositsUSD.toString(),
    // userEarnUSDInYear: userEarnUSDInYear.toString()
  }
}

async function _getAssetBorrowsData(bankApp, asset) {
  const [
    { userBorrows },
    { borrowAPY, priceUSD }
  ] = await Promise.all([
    bankApp.getAccountAssetData(asset),
    bankApp.getAssetData(asset)
  ])
  const userBorrowsUSD = +userBorrows * +priceUSD
  const userEarnUSDInYear = userBorrowsUSD * +borrowAPY
  return {
    userBorrows,
    borrowAPY, priceUSD,
    userBorrowsUSD: userBorrowsUSD.toString(),
    userEarnUSDInYear: userEarnUSDInYear.toString()
  }
}

export async function getBankPortfolio(bankItem) {
  const { app: bankApp, title, logo } = bankItem
  const [
    { deposits: depositAssets, borrows: borrowAssets },
    { userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }
  ] = await Promise.all([
    bankApp.getAccountAssets(),
    bankApp.getAccountData()
  ])
  const summary = { userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }
  const depositsDict = {}
  const borrowsDict = {}
  const promiseList1 = _.map(depositAssets, async (asset) => {
    depositsDict[asset] = await _getAssetDepositsData(bankApp, asset)
  })
  const promiseList2 = _.map(borrowAssets, async (asset) => {
    borrowsDict[asset] = await _getAssetBorrowsData(bankApp, asset)
  })
  await Promise.all([ ...promiseList1, ...promiseList2])
  return { summary, depositsDict, borrowsDict }
}
