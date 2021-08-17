import { AaveApp } from './aave-app'
import { CompoundApp } from './compound-app'
import { CreamApp } from './cream-app'
import { ForTubeApp } from './fortube-app'


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
  'fortube': {
    logo: 'https://for.tube/static/img/FOR.1faf664f.png',
    title: 'ForTube',
    BankAppClass: ForTubeApp
  },
}

export function createBankItem(bankName:string, $wallet: WalletInterface) {
  const { BankAppClass, logo, title } = bankConfigs[bankName]
  const app = new BankAppClass($wallet)
  return { name: bankName, logo, title, app }
}

export function createBanks($wallet: WalletInterface) {
  const chainId = $wallet.getChainId()
  if (chainId === 137) {
    return [
      createBankItem('aave', $wallet),
      createBankItem('cream', $wallet),
    ]
  } else {
    return [
      createBankItem('aave', $wallet),
      createBankItem('compound', $wallet),
      createBankItem('cream', $wallet),
      createBankItem('fortube', $wallet),
    ]
  }
}
