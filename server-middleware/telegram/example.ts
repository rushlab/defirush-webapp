import { Telegraf, Context, session } from 'telegraf'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

/**
 * start - registration
 * view - view profile
 *
 * 监听的顺序很重要，比如先 on('text') 再 command('start') 会导致 /start 命令进入 text 的处理流程
 * 解决方法是要么别用 on('text') 改用 on('message')，后者只监听普通消息，要么就是把 command 监听放在最前面
 */

interface SessionData {
  lastMessage: string
}

interface MyContext extends Context {
  session?: SessionData
}

const bot = new Telegraf<MyContext>(TELEGRAM_BOT_TOKEN)
bot.use(session())

bot.command('view', (ctx) => {
  console.log(ctx.message)
  ctx.session ??= { lastMessage: '' }
  ctx.reply(`Command from ${ctx.message.chat.id}, last message ${ctx.session.lastMessage}`)
  ctx.session.lastMessage = ctx.message.text
})

bot.on('text', (ctx) => {
  console.log(ctx.message)
  ctx.session ??= { lastMessage: '' }
  ctx.reply(`Text from ${ctx.message.chat.id}, last message ${ctx.session.lastMessage}`)
  ctx.session.lastMessage = ctx.message.text
})

bot.start((ctx) => ctx.reply('Welcome'))


async function run() {
  bot.launch()
  console.log('[bot] launched, listen to messages ...')

  // bot.telegram.sendMessage(1897694456, 'Hello XD, I am alive')
  // bot.telegram.sendMessage(885184460, 'Hello Fei, I am alive')

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))

  await new Promise((resolve) => {})
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
