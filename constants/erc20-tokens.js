export const TOKENS = [
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
  { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
  { symbol: '1INCH', address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18 },
  { symbol: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 }
]


export const ABI = [
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]
