import { Telegraf, Context, Markup, deunionize } from 'telegraf'

import { LeanCloudStorage } from '../leancloud'
import { bot, SessionContext } from './telegram/bot'

const doRegistration = async (ctx: SessionContext, telegramKey: string) => {
  const chat = deunionize(ctx.chat)
  // ctx.reply('processing ...')
  const query = new LeanCloudStorage.Query('UserProfile')
  query.equalTo('telegramKey', telegramKey)
  const profile = await query.first().catch(() => {})
  if (!profile) {
    ctx.reply('Register key is not valid')
  } else {
    ctx.reply(`OK! Your wallet address is ${profile?.get('walletAddress')}, setting up you account now`)
    profile.set('telegramChatId', chat!.id)
    profile.set('telegramUsername', chat!.username)
    await profile.save()
    ctx.reply('Success! You will receive notification of daily earning and liquidation risk')
  }
}

/**
 * https://github.com/telegraf/telegraf/issues/1388#issuecomment-791573609
 * 关于 ctx.message 类型的问题
 */
bot.use(async (ctx: SessionContext, next: Function) => {
  ctx.session = ctx.session ?? { pendingFor: '' }
  await next()
})

bot.command('start', async (ctx: SessionContext) => {
  const message = deunionize(ctx.message)
  const messageText = message!.text || ''
  const chat = deunionize(ctx.chat)
  if (/^\/start [a-zA-Z0-9]+/.test(messageText)) {
    const telegramKey = messageText.substr(7)
    ctx.reply(`Welcome @${chat?.username}, I'm processing your registration request for key: ${telegramKey}`)
    try {
      await doRegistration(ctx, telegramKey)
    } catch(err) {
      ctx.reply('ERROR: something went wrong')
    }
  } else {
    const replyMsg = `Welcome @${chat?.username}, choose action from the list below`
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('Register', 'register'),
      Markup.button.callback('View', 'view_profile'),
    ])
    ctx.reply(replyMsg, keyboard)
  }
  ctx.session.pendingFor = ''
})

const pendingForRegistration = (ctx: SessionContext) => {
  const message = `Please paste your register key`
  // You can get it from https://app.defirush.io/settings
  ctx.reply(message)
  ctx.session.pendingFor = 'registration'
}
bot.command('register', pendingForRegistration)
bot.action('register', pendingForRegistration)
bot.action('view_profile', async (ctx: SessionContext) => {
  const chat = deunionize(ctx.chat)
  const query = new LeanCloudStorage.Query('UserProfile')
  query.equalTo('telegramChatId', chat!.id)
  const profile = await query.first().catch(() => {})
  if (profile) {
    ctx.reply(`Your wallet address is ${profile?.get('walletAddress')}`)
  } else {
    ctx.reply('Your account is not connected, click /register to connect')
  }
  ctx.session.pendingFor = ''
})

bot.on('text', async (ctx: SessionContext) => {
  const chat = deunionize(ctx.chat)
  const message = deunionize(ctx.message)
  if (chat && message && ctx.session.pendingFor === 'registration') {
    const telegramKey = message!.text || ''
    try {
      await doRegistration(ctx, telegramKey)
    } catch(err) {
      ctx.reply('ERROR: something went wrong')
    }
  }
  ctx.session.pendingFor = ''
})

export async function run() {
  bot.launch()
  console.log(`[Telegram] Launched, listen to messages ...`)
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
  // await new Promise((resolve) => {})
}

if (require.main === module) {
  run()
    // .then(() => process.exit(0))
    // .catch(error => {
    //   console.error(error)
    //   process.exit(1)
    // })
  console.log('Standalone telegram bot running ...')
}
