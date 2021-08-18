import { Telegraf, Context, Markup, session, deunionize } from 'telegraf'
import { LeanCloudStorage } from '../leancloud'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

interface SessionData {
  pendingFor: string
}

export interface SessionContext extends Context {
  // session?: SessionData  // 不需要 ?, 下面确保了 session 一定有值
  session: SessionData
}

export const bot = new Telegraf<SessionContext>(TELEGRAM_BOT_TOKEN)
bot.use(session())

export async function sendMessageToAccount(chainId: number, address: string, message: string) {
  const query = new LeanCloudStorage.Query('UserProfile')
  query.equalTo('walletChainId', chainId)
  query.equalTo('walletAddress', address)
  const profile = await query.first().catch(() => {})
  if (!profile) {
    return
  }
  const telegramChatId = profile.get('telegramChatId')
  return await bot.telegram.sendMessage(telegramChatId, message)
}
