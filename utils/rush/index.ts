import { utils, BigNumber } from 'ethers'

type ABI = string[] | object[]

type EncodedTxData = {
  to: Address,
  data: any,
  value?: any
}

type SafeTxType = [
  to: Address,
  value: any,
  data: string,
  operation: string,
  safeTxGas: BigNumberish,
  baseGas: BigNumberish,
  gasPrice: BigNumberish,
  gasToken: Address,
  refundReceiver: Address,
  signatures: string
]

export const signPreValidated = (senderAddress: Address) : string => {
  const signatures = '0x' + [
    '000000000000000000000000' + senderAddress.slice(2),
    '0000000000000000000000000000000000000000000000000000000000000000',
    '01'
  ].join('')
  return signatures
}

export const getTargetContactInterface = (abi: ABI): any => {
  return new utils.Interface(abi)
}

export const prepareEncodedData = (
  targetContractAddress: Address,
  targetInterface: any, 
  functionName: string, 
  functionParams: object,
): EncodedTxData => {
  const params: any[] = []
  let value
  for (const key in functionParams) {
    if (Object.prototype.hasOwnProperty.call(functionParams, 'value')) {
      value = (functionParams as any).value
    } else {
      params.push((functionParams as any)[key])
    }
  }
  console.log('#####', params)
  const to = targetContractAddress
  const data = targetInterface.encodeFunctionData(functionName, params)
  const txData: EncodedTxData = {
    to,
    data
  }
  if (!value) {
    txData.value = '0'
  }
  return txData
}

export const prepareParamsForExecTransaction = ({
  senderAddress,
  targetContractAddress,
  targetContractABI,
  functionName,
  functionParams
} : {
  senderAddress: Address,
  targetContractAddress: Address,
  targetContractABI: ABI,
  functionName: string,
  functionParams: object,
}): SafeTxType => {
  const targetInterface = getTargetContactInterface(targetContractABI)
  const { to, value, data } = prepareEncodedData(targetContractAddress, targetInterface, functionName, functionParams)
  console.log('@@@ prepareEncodedData', { to, value, data })

  const operation = '0'
  const safeTxGas = BigNumber.from('0')
  const baseGas = '0'
  const gasPrice = '0'
  const gasToken = '0x0000000000000000000000000000000000000000'
  const refundReceiver = '0x0000000000000000000000000000000000000000'
  const signatures = signPreValidated(senderAddress) 
  const safeTx: SafeTxType = [
    to, 
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    signatures
  ]
  console.log('safeTx', safeTx)
  return safeTx
}