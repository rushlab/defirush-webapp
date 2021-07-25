import { AaveApp } from './aave-app'
import { CompoundApp } from './compound-app'
import { CreamApp } from './cream-app'


const bankConfigs: any = {
  'aave': {
    logo: 'https://aave.com/favicon64.png',
    title: 'Aave',
    BankAppClass: AaveApp
  },
  'compound': {
    logo: 'https://compound.finance/compound-components/assets/compound-mark.svg',
    title: 'Compound',
    BankAppClass: CompoundApp
  },
  'cream': {
    logo: 'https://app.cream.finance/static/media/cream.29138554.svg',
    title: 'Cream',
    BankAppClass: CreamApp
  },
}

export function createBankApp(bankName:string, $wallet: WalletInterface) {
  const { BankAppClass, logo, title } = bankConfigs[bankName]
  const app = new BankAppClass($wallet)
  return { name: bankName, logo, title, app }
}

export function createBankApps($wallet: WalletInterface) {
  return [
    createBankApp('aave', $wallet),
    createBankApp('compound', $wallet),
    createBankApp('cream', $wallet),
  ]
}
