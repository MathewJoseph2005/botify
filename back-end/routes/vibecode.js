import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Auth middleware - verifies JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Bot code generation templates ──────────────────────────────────────────
// We use detailed templates rather than relying on an external AI API, 
// making this feature works out-of-the-box without extra API keys.

const TEMPLATES = {
  // ──── DISCORD ─────────────────────────────────────────────────────────
  discord: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: {
                start: 'node src/index.js',
                dev: 'nodemon src/index.js',
              },
              dependencies: {
                'discord.js': '^14.14.1',
                dotenv: '^16.3.1',
              },
              devDependencies: {
                nodemon: '^3.0.2',
              },
            }, null, 2),
          },
          {
            path: `${name}/.env.example`,
            content: `# Discord Bot Token - Get from https://discord.com/developers/applications\nDISCORD_TOKEN=your_bot_token_here\nBOT_PREFIX=!\nOWNER_ID=your_discord_user_id`,
          },
          {
            path: `${name}/.gitignore`,
            content: 'node_modules/\n.env\n*.log',
          },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Features\n${features.map(f => `- ${f}`).join('\n')}\n\n## Setup\n1. \`npm install\`\n2. Copy \`.env.example\` to \`.env\` and fill in your bot token\n3. \`npm start\`\n\n## Commands\n- \`!help\` — Show all commands\n- \`!ping\` — Check latency\n${features.includes('moderation') ? '- `!kick @user` — Kick a member\n- `!ban @user` — Ban a member\n- `!clear <n>` — Delete messages' : ''}${features.includes('music') ? '\n- `!play <url>` — Play a song\n- `!skip` — Skip current song\n- `!stop` — Stop playback' : ''}`,
          },
          {
            path: `${name}/src/index.js`,
            content: `require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Command collection
client.commands = new Collection();

// Load commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
    console.log(\`✅ Loaded command: \${command.name}\`);
  }
}

const PREFIX = process.env.BOT_PREFIX || '!';

client.once('ready', () => {
  console.log(\`\\n🤖 \${client.user.tag} is online!\`);
  console.log(\`📡 Serving \${client.guilds.cache.size} servers\`);
  client.user.setPresence({
    activities: [{ name: \`\${PREFIX}help | ${name}\`, type: 0 }],
    status: 'online',
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(\`Error executing \${commandName}:\`, error);
    message.reply('❌ There was an error executing that command.');
  }
});

client.login(process.env.DISCORD_TOKEN);
`,
          },
          {
            path: `${name}/src/commands/help.js`,
            content: `const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'List all available commands',
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setTitle('📖 ${name} — Commands')
      .setColor(0xFFD700)
      .setDescription('Here are all available commands:')
      .setTimestamp();

    client.commands.forEach(cmd => {
      embed.addFields({ name: \`\${process.env.BOT_PREFIX || '!'}\${cmd.name}\`, value: cmd.description, inline: true });
    });

    message.reply({ embeds: [embed] });
  },
};
`,
          },
          {
            path: `${name}/src/commands/ping.js`,
            content: `module.exports = {
  name: 'ping',
  description: 'Check bot latency',
  async execute(message, args, client) {
    const sent = await message.reply('🏓 Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    sent.edit(\`🏓 Pong! Latency: **\${latency}ms** | API: **\${Math.round(client.ws.ping)}ms**\`);
  },
};
`,
          },
          ...(features.includes('moderation') ? [{
            path: `${name}/src/commands/kick.js`,
            content: `const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('❌ You need Kick Members permission.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user to kick.');
    if (!target.kickable) return message.reply('❌ I cannot kick this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);
    message.reply(\`✅ Kicked **\${target.user.tag}** — Reason: \${reason}\`);
  },
};
`,
          },
          {
            path: `${name}/src/commands/ban.js`,
            content: `const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a member from the server',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ You need Ban Members permission.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user to ban.');
    if (!target.bannable) return message.reply('❌ I cannot ban this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });
    message.reply(\`✅ Banned **\${target.user.tag}** — Reason: \${reason}\`);
  },
};
`,
          },
          {
            path: `${name}/src/commands/clear.js`,
            content: `const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'clear',
  description: 'Delete a number of messages',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ You need Manage Messages permission.');
    }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Please provide a number between 1 and 100.');
    }
    const deleted = await message.channel.bulkDelete(amount + 1, true);
    const msg = await message.channel.send(\`🧹 Deleted **\${deleted.size - 1}** messages.\`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
  },
};
`,
          }] : []),
          {
            path: `${name}/src/commands/info.js`,
            content: `const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Show server information',
  async execute(message) {
    const { guild } = message;
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(0xFFD700)
      .addFields(
        { name: '👑 Owner', value: \`<@\${guild.ownerId}>\`, inline: true },
        { name: '👥 Members', value: \`\${guild.memberCount}\`, inline: true },
        { name: '📅 Created', value: guild.createdAt.toLocaleDateString(), inline: true },
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};
`,
          },
        ],
      }),
    },
    python: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/requirements.txt`,
            content: `discord.py>=2.3.0\npython-dotenv>=1.0.0`,
          },
          {
            path: `${name}/.env.example`,
            content: `DISCORD_TOKEN=your_bot_token_here\nBOT_PREFIX=!`,
          },
          {
            path: `${name}/.gitignore`,
            content: '__pycache__/\n*.pyc\n.env\nvenv/',
          },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. \`pip install -r requirements.txt\`\n2. Copy \`.env.example\` to \`.env\`\n3. \`python bot.py\``,
          },
          {
            path: `${name}/bot.py`,
            content: `import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.all()
bot = commands.Bot(command_prefix=os.getenv('BOT_PREFIX', '!'), intents=intents)

@bot.event
async def on_ready():
    print(f'\\n🤖 {bot.user.name} is online!')
    print(f'📡 Serving {len(bot.guilds)} servers')
    await bot.change_presence(activity=discord.Game(name="${name}"))

@bot.command(name='ping', help='Check bot latency')
async def ping(ctx):
    latency = round(bot.latency * 1000)
    await ctx.send(f'🏓 Pong! Latency: **{latency}ms**')

@bot.command(name='info', help='Show server info')
async def info(ctx):
    guild = ctx.guild
    embed = discord.Embed(title=guild.name, color=0xFFD700)
    embed.set_thumbnail(url=guild.icon.url if guild.icon else '')
    embed.add_field(name='👑 Owner', value=guild.owner.mention)
    embed.add_field(name='👥 Members', value=str(guild.member_count))
    embed.add_field(name='📅 Created', value=guild.created_at.strftime('%Y-%m-%d'))
    await ctx.send(embed=embed)

${features.includes('moderation') ? `
@bot.command(name='kick', help='Kick a member')
@commands.has_permissions(kick_members=True)
async def kick(ctx, member: discord.Member, *, reason='No reason provided'):
    await member.kick(reason=reason)
    await ctx.send(f'✅ Kicked **{member}** — {reason}')

@bot.command(name='ban', help='Ban a member')
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason='No reason provided'):
    await member.ban(reason=reason)
    await ctx.send(f'✅ Banned **{member}** — {reason}')

@bot.command(name='clear', help='Delete messages')
@commands.has_permissions(manage_messages=True)
async def clear(ctx, amount: int = 5):
    await ctx.channel.purge(limit=amount + 1)
    msg = await ctx.send(f'🧹 Deleted **{amount}** messages.')
    await msg.delete(delay=3)
` : ''}
bot.run(os.getenv('DISCORD_TOKEN'))
`,
          },
        ],
      }),
    },
  },

  // ──── TELEGRAM ────────────────────────────────────────────────────────
  telegram: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
              dependencies: { telegraf: '^4.16.3', dotenv: '^16.3.1' },
              devDependencies: { nodemon: '^3.0.2' },
            }, null, 2),
          },
          {
            path: `${name}/.env.example`,
            content: `# Get from https://t.me/BotFather\nTELEGRAM_BOT_TOKEN=your_token_here`,
          },
          { path: `${name}/.gitignore`, content: 'node_modules/\n.env\n*.log' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. \`npm install\`\n2. Get a token from @BotFather on Telegram\n3. Copy \`.env.example\` to \`.env\`\n4. \`npm start\``,
          },
          {
            path: `${name}/src/index.js`,
            content: `require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Start command
bot.start((ctx) => {
  const name = ctx.from.first_name || 'there';
  ctx.reply(
    \`👋 Hello \${name}! Welcome to *${name}*\\n\\nI'm your personal bot assistant. Use /help to see what I can do.\`,
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    \`📖 *${name} Commands*\\n\\n\` +
    \`/start — Start the bot\\n\` +
    \`/help — Show this help\\n\` +
    \`/about — About this bot\\n\` +
    ${features.includes('polls') ? `\`/poll — Create a poll\\n\` +` : ''}
    ${features.includes('reminders') ? `\`/remind — Set a reminder\\n\` +` : ''}
    \`/id — Show your Telegram ID\`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('about', (ctx) => {
  ctx.reply(\`🤖 *${name}*\\n${desc}\\n\\nBuilt with ❤️ using Telegraf\`, { parse_mode: 'Markdown' });
});

bot.command('id', (ctx) => {
  ctx.reply(\`🪪 Your ID: \\\`\${ctx.from.id}\\\`\\nChat ID: \\\`\${ctx.chat.id}\\\`\`, { parse_mode: 'Markdown' });
});

${features.includes('polls') ? `
bot.command('poll', (ctx) => {
  ctx.replyWithPoll('What do you think?', ['👍 Great', '👎 Not great', '🤷 Neutral'], {
    is_anonymous: false,
  });
});
` : ''}

${features.includes('reminders') ? `
bot.command('remind', (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) return ctx.reply('Usage: /remind <message> — I will remind you in 1 minute');
  ctx.reply(\`⏰ I'll remind you in 1 minute: "\${text}"\`);
  setTimeout(() => {
    ctx.reply(\`🔔 Reminder: \${text}\`);
  }, 60000);
});
` : ''}

// Echo handler (reply to any text)
bot.on('text', (ctx) => {
  ctx.reply(\`You said: "\${ctx.message.text}"\\nUse /help to see my commands.\`);
});

// Launch
bot.launch().then(() => {
  console.log('\\n🤖 ${name} Telegram bot is running!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
`,
          },
        ],
      }),
    },
    python: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/requirements.txt`,
            content: `python-telegram-bot>=20.0\npython-dotenv>=1.0.0`,
          },
          { path: `${name}/.env.example`, content: `TELEGRAM_BOT_TOKEN=your_token_here` },
          { path: `${name}/.gitignore`, content: '__pycache__/\n*.pyc\n.env\nvenv/' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. \`pip install -r requirements.txt\`\n2. Get a token from @BotFather\n3. Copy \`.env.example\` to \`.env\`\n4. \`python bot.py\``,
          },
          {
            path: `${name}/bot.py`,
            content: `import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.effective_user.first_name or 'there'
    await update.message.reply_text(
        f'👋 Hello {name}! Welcome to ${name}\\n\\nUse /help to see commands.'
    )

async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        '📖 Commands:\\n'
        '/start — Start\\n'
        '/help — Help\\n'
        '/about — About\\n'
        '/id — Your ID'
    )

async def about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('🤖 ${name}\\n${desc}')

async def user_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    cid = update.effective_chat.id
    await update.message.reply_text(f'🪪 Your ID: {uid}\\nChat ID: {cid}')

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f'You said: "{update.message.text}"')

def main():
    app = Application.builder().token(os.getenv('TELEGRAM_BOT_TOKEN')).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help', help_cmd))
    app.add_handler(CommandHandler('about', about))
    app.add_handler(CommandHandler('id', user_id))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    print('\\n🤖 ${name} Telegram bot is running!')
    app.run_polling()

if __name__ == '__main__':
    main()
`,
          },
        ],
      }),
    },
  },

  // ──── WHATSAPP ────────────────────────────────────────────────────────
  whatsapp: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
              dependencies: { 'whatsapp-web.js': '^1.34.6', qrcode: '^1.5.4', dotenv: '^16.3.1' },
              devDependencies: { nodemon: '^3.0.2' },
            }, null, 2),
          },
          { path: `${name}/.gitignore`, content: 'node_modules/\n.env\n.wwebjs_auth/\n.wwebjs_cache/\n*.log' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. \`npm install\`\n2. \`npm start\`\n3. Scan the QR code with your WhatsApp`,
          },
          {
            path: `${name}/src/index.js`,
            content: `const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.on('qr', (qr) => {
  console.log('\\n📱 Scan this QR code with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\\n✅ ${name} WhatsApp bot is ready!');
});

client.on('message', async (msg) => {
  const text = msg.body.toLowerCase().trim();

  if (text === '!help' || text === 'help') {
    msg.reply(
      '🤖 *${name}*\\n\\n' +
      'Commands:\\n' +
      '• help — Show this menu\\n' +
      '• ping — Check if I\\'m online\\n' +
      '• about — About this bot\\n' +
      ${features.includes('auto-reply') ? "'• auto — Toggle auto-replies\\n' +" : ''}
      '• time — Current time'
    );
  } else if (text === '!ping' || text === 'ping') {
    msg.reply('🏓 Pong! I\\'m online and ready.');
  } else if (text === '!about' || text === 'about') {
    msg.reply('🤖 ${name}\\n${desc}\\n\\nBuilt with whatsapp-web.js');
  } else if (text === '!time' || text === 'time') {
    msg.reply(\`🕐 Current time: \${new Date().toLocaleString()}\`);
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

console.log('🚀 Starting ${name}...');
client.initialize();
`,
          },
        ],
      }),
    },
  },

  // ──── SLACK ───────────────────────────────────────────────────────────
  slack: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
              dependencies: { '@slack/bolt': '^3.17.1', dotenv: '^16.3.1' },
              devDependencies: { nodemon: '^3.0.2' },
            }, null, 2),
          },
          {
            path: `${name}/.env.example`,
            content: `SLACK_BOT_TOKEN=xoxb-your-bot-token\nSLACK_SIGNING_SECRET=your-signing-secret\nSLACK_APP_TOKEN=xapp-your-app-token\nPORT=3000`,
          },
          { path: `${name}/.gitignore`, content: 'node_modules/\n.env\n*.log' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. Create a Slack App at https://api.slack.com/apps\n2. \`npm install\`\n3. Copy \`.env.example\` to \`.env\`\n4. \`npm start\``,
          },
          {
            path: `${name}/src/index.js`,
            content: `require('dotenv').config();
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Respond to "hello"
app.message('hello', async ({ message, say }) => {
  await say(\`👋 Hey <@\${message.user}>! I'm ${name}. How can I help?\`);
});

// Slash command /help
app.command('/help', async ({ ack, respond }) => {
  await ack();
  await respond({
    text: '📖 *${name} Commands*\\n• hello — Greet the bot\\n• /help — Show this help\\n• /about — About',
  });
});

// Slash command /about
app.command('/about', async ({ ack, respond }) => {
  await ack();
  await respond({
    text: '🤖 *${name}*\\n${desc}',
  });
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(\`\\n🤖 ${name} Slack bot is running on port \${port}!\`);
})();
`,
          },
        ],
      }),
    },
  },

  // ──── EMAIL ───────────────────────────────────────────────────────────
  email: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
              dependencies: { nodemailer: '^8.0.1', imap: '^0.8.19', mailparser: '^3.9.6', dotenv: '^16.3.1' },
              devDependencies: { nodemon: '^3.0.2' },
            }, null, 2),
          },
          {
            path: `${name}/.env.example`,
            content: `EMAIL_USER=your_email@gmail.com\nEMAIL_PASS=your_app_password\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nIMAP_HOST=imap.gmail.com\nIMAP_PORT=993`,
          },
          { path: `${name}/.gitignore`, content: 'node_modules/\n.env\n*.log' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n## Setup\n1. \`npm install\`\n2. Enable "App Passwords" in Gmail\n3. Copy \`.env.example\` to \`.env\`\n4. \`npm start\``,
          },
          {
            path: `${name}/src/index.js`,
            content: `require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: \`"${name}" <\${process.env.EMAIL_USER}>\`,
      to,
      subject,
      html,
    });
    console.log(\`✅ Email sent: \${info.messageId}\`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

// Example: Send a test email
async function main() {
  console.log('\\n🤖 ${name} Email Bot starting...');
  
  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err.message);
    return;
  }

  // Send test email (uncomment to test)
  // await sendEmail('recipient@example.com', 'Hello from ${name}', '<h1>Hello!</h1><p>${desc}</p>');
  
  console.log('📧 Email bot is ready. Modify this file to add your logic.');
}

main();

module.exports = { sendEmail };
`,
          },
        ],
      }),
    },
    python: {
      monorepo: (name, desc, features) => ({
        files: [
          { path: `${name}/requirements.txt`, content: `python-dotenv>=1.0.0` },
          {
            path: `${name}/.env.example`,
            content: `EMAIL_USER=your_email@gmail.com\nEMAIL_PASS=your_app_password\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=587`,
          },
          { path: `${name}/.gitignore`, content: '__pycache__/\n*.pyc\n.env\nvenv/' },
          {
            path: `${name}/bot.py`,
            content: `import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def send_email(to, subject, body_html):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.getenv('EMAIL_USER')
    msg['To'] = to
    msg.attach(MIMEText(body_html, 'html'))

    with smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT'))) as server:
        server.starttls()
        server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASS'))
        server.send_message(msg)
        print(f'✅ Email sent to {to}')

if __name__ == '__main__':
    print('\\n📧 ${name} Email Bot ready.')
    # send_email('test@example.com', 'Hello', '<h1>Hi from ${name}!</h1>')
`,
          },
        ],
      }),
    },
  },

  // ──── INSTAGRAM ───────────────────────────────────────────────────────
  instagram: {
    javascript: {
      monorepo: (name, desc, features) => ({
        files: [
          {
            path: `${name}/package.json`,
            content: JSON.stringify({
              name: name.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              description: desc,
              main: 'src/index.js',
              scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
              dependencies: { 'instagram-private-api': '^1.46.1', dotenv: '^16.3.1' },
              devDependencies: { nodemon: '^3.0.2' },
            }, null, 2),
          },
          {
            path: `${name}/.env.example`,
            content: `IG_USERNAME=your_instagram_username\nIG_PASSWORD=your_instagram_password`,
          },
          { path: `${name}/.gitignore`, content: 'node_modules/\n.env\n*.log' },
          {
            path: `${name}/README.md`,
            content: `# ${name}\n\n${desc}\n\n⚠️ Note: Instagram automation may violate ToS. Use responsibly.\n\n## Setup\n1. \`npm install\`\n2. Copy \`.env.example\` to \`.env\`\n3. \`npm start\``,
          },
          {
            path: `${name}/src/index.js`,
            content: `require('dotenv').config();
const { IgApiClient } = require('instagram-private-api');

const ig = new IgApiClient();

async function main() {
  console.log('\\n📸 ${name} Instagram Bot starting...');

  ig.state.generateDevice(process.env.IG_USERNAME);
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
  console.log('✅ Logged in as', process.env.IG_USERNAME);

  // Get inbox
  const inbox = ig.feed.directInbox();
  const threads = await inbox.items();
  console.log(\`📬 Found \${threads.length} conversations\`);

  // Auto-reply to unread messages
  for (const thread of threads) {
    if (thread.last_seen_at) {
      console.log(\`💬 Thread: \${thread.thread_title || 'DM'}\`);
    }
  }

  console.log('\\n📸 Bot is ready. Extend this file with your logic.');
}

main().catch(console.error);
`,
          },
        ],
      }),
    },
  },
};

// Fallback generator for platform/language combos that don't have a template
function generateFallback(platform, language, name, desc, features) {
  const safeName = name.toLowerCase().replace(/\s+/g, '-');
  const files = [
    {
      path: `${safeName}/README.md`,
      content: `# ${name}\n\n${desc}\n\n## Platform: ${platform}\n## Language: ${language}\n\n## Features\n${features.map(f => `- ${f}`).join('\n')}\n\n## Getting Started\n1. Install dependencies\n2. Configure environment variables\n3. Run the bot`,
    },
  ];

  if (language === 'javascript') {
    files.push({
      path: `${safeName}/package.json`,
      content: JSON.stringify({
        name: safeName,
        version: '1.0.0',
        description: desc,
        main: 'index.js',
        scripts: { start: 'node index.js' },
      }, null, 2),
    });
    files.push({
      path: `${safeName}/index.js`,
      content: `// ${name} — ${platform} Bot\n// ${desc}\n\nconsole.log('🤖 ${name} is starting...');\n\n// TODO: Add your ${platform} bot logic here\n// Features: ${features.join(', ')}\n`,
    });
  } else if (language === 'python') {
    files.push({
      path: `${safeName}/requirements.txt`,
      content: `# Add your dependencies here\npython-dotenv>=1.0.0`,
    });
    files.push({
      path: `${safeName}/bot.py`,
      content: `# ${name} — ${platform} Bot\n# ${desc}\n\nprint('🤖 ${name} is starting...')\n\n# TODO: Add your ${platform} bot logic here\n# Features: ${features.length > 0 ? features.join(', ') : 'basic'}\n`,
    });
  }

  files.push({
    path: `${safeName}/.env.example`,
    content: `# ${platform.toUpperCase()} Configuration\n# Add your API keys and tokens here`,
  });
  files.push({
    path: `${safeName}/.gitignore`,
    content: language === 'python'
      ? '__pycache__/\n*.pyc\n.env\nvenv/'
      : 'node_modules/\n.env\n*.log',
  });

  return { files };
}

// ── Generate bot code ──────────────────────────────────────────────────────
router.post('/generate', authenticate, (req, res) => {
  try {
    const { botName, description, platform, language, structure, features } = req.body;

    if (!botName || !description || !platform || !language) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: botName, description, platform, language',
      });
    }

    const safeName = botName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const selectedFeatures = Array.isArray(features) ? features : [];
    const structType = structure || 'monorepo';

    // Check if we have a template
    const platformTemplates = TEMPLATES[platform];
    let result;

    if (platformTemplates?.[language]?.[structType]) {
      result = platformTemplates[language][structType](safeName, description, selectedFeatures);
    } else if (platformTemplates?.[language]?.monorepo) {
      result = platformTemplates[language].monorepo(safeName, description, selectedFeatures);
    } else {
      result = generateFallback(platform, language, safeName, description, selectedFeatures);
    }

    res.json({
      success: true,
      botName: safeName,
      platform,
      language,
      structure: structType,
      features: selectedFeatures,
      files: result.files,
      fileCount: result.files.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Vibe Code generation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bot code',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ── Get supported platforms & options ───────────────────────────────────────
router.get('/options', authenticate, (req, res) => {
  res.json({
    success: true,
    platforms: [
      {
        id: 'discord',
        name: 'Discord',
        icon: '🎮',
        description: 'Server automation, moderation, and commands',
        languages: ['javascript', 'python'],
        features: ['moderation', 'music', 'logging', 'custom-commands'],
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: '✈️',
        description: 'Bot with commands, inline keyboards, and handlers',
        languages: ['javascript', 'python'],
        features: ['polls', 'reminders', 'inline-keyboards', 'file-uploads'],
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: '💬',
        description: 'Messaging automation and customer service',
        languages: ['javascript'],
        features: ['auto-reply', 'media-support', 'group-management'],
      },
      {
        id: 'slack',
        name: 'Slack',
        icon: '💼',
        description: 'Workspace automation and integration',
        languages: ['javascript'],
        features: ['slash-commands', 'message-posting', 'event-handling'],
      },
      {
        id: 'email',
        name: 'Email',
        icon: '📧',
        description: 'Automated email sending, responding, and processing',
        languages: ['javascript', 'python'],
        features: ['smtp', 'templates', 'auto-reply', 'bulk-send'],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📸',
        description: 'DM automation and engagement bot',
        languages: ['javascript'],
        features: ['auto-reply', 'dm-automation', 'story-interactions'],
      },
    ],
    structures: [
      { id: 'monorepo', name: 'Monorepo', description: 'Single directory with all code' },
    ],
  });
});

export default router;
