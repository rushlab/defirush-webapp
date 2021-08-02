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
  const userEarnUSDInYear = userDepositsUSD * +depositAPY
  return {
    asset,  // asset address：用于在渲染资产列表的时候
    userDeposits,
    depositAPY, priceUSD,
    userDepositsUSD: userDepositsUSD.toString(),
    userEarnUSDInYear: userEarnUSDInYear.toString()
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
    asset,  // asset address：用于在渲染资产列表的时候
    userBorrows,
    borrowAPY, priceUSD,
    userBorrowsUSD: userBorrowsUSD.toString(),
    userEarnUSDInYear: userEarnUSDInYear.toString()
  }
}

export async function getAccountDataOfBank(bankItem) {
  const { app: bankApp, title, logo } = bankItem
  const [
    { deposits, borrows },
    { userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }
  ] = await Promise.all([
    bankApp.getAccountAssets(),
    bankApp.getAccountData()
  ])
  const promiseList1 = _.map(deposits, asset => _getAssetDepositsData(bankApp, asset))
  const promiseList2 = _.map(borrows, asset => _getAssetBorrowsData(bankApp, asset))
  const depositsData = await Promise.all(promiseList1)
  const borrowsData = await Promise.all(promiseList2)
  return {
    bank: { title, logo },
    userDepositsUSD, userBorrowsUSD, availableBorrowsUSD,
    depositsData, borrowsData
  }
}