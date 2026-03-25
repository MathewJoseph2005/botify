import { Telegraf } from 'telegraf';
import pLimit from 'p-limit';
import supabase from '../config/database.js';

class TelegramBotFactory {
  constructor() {
    this.instances = new Map();
    this.refreshIntervalRef = null;
  }

  async initialize() {
    await this.refreshInstances();
  }

  startAutoRefresh(intervalMs = 60_000) {
    if (this.refreshIntervalRef) {
      clearInterval(this.refreshIntervalRef);
    }

    this.refreshIntervalRef = setInterval(() => {
      this.refreshInstances().catch((err) => {
        console.error('[BotFactory] Refresh failed:', err.message);
      });
    }, intervalMs);

    this.refreshIntervalRef.unref?.();
  }

  async refreshInstances() {
    const { data, error } = await supabase
      .from('bot_instances')
      .select('id, seller_id, telegram_token, config_json, is_active')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to load bot instances: ${error.message}`);
    }

    const active = new Map((data || []).map((item) => [item.id, item]));

    for (const [instanceId] of this.instances) {
      if (!active.has(instanceId)) {
        await this.stopInstance(instanceId);
      }
    }

    for (const instance of active.values()) {
      const running = this.instances.get(instance.id);
      if (running?.token === instance.telegram_token) {
        continue;
      }

      if (running) {
        await this.stopInstance(instance.id);
      }

      await this.startInstance(instance);
    }
  }

  async startInstance(instance) {
    const bot = new Telegraf(instance.telegram_token);

    bot.start(async (ctx) => {
      const from = ctx.from;
      if (!from?.id) {
        return;
      }

      await supabase
        .from('bot_subscribers')
        .upsert(
          {
            bot_instance_id: instance.id,
            telegram_user_id: String(from.id),
            chat_id: String(ctx.chat?.id || from.id),
            username: from.username || null,
            first_name: from.first_name || null,
            last_name: from.last_name || null,
            is_blocked: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'bot_instance_id,telegram_user_id' }
        );

      await ctx.reply('You are now subscribed to this bot.');
    });

    bot.on('message', async (ctx) => {
      const from = ctx.from;
      if (!from?.id) {
        return;
      }

      await supabase
        .from('bot_subscribers')
        .upsert(
          {
            bot_instance_id: instance.id,
            telegram_user_id: String(from.id),
            chat_id: String(ctx.chat?.id || from.id),
            username: from.username || null,
            first_name: from.first_name || null,
            last_name: from.last_name || null,
            is_blocked: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'bot_instance_id,telegram_user_id' }
        );
    });

    bot.catch((err) => {
      console.error(`[BotFactory] Bot instance ${instance.id} error:`, err.message);
    });

    await bot.launch();
    this.instances.set(instance.id, {
      bot,
      token: instance.telegram_token,
      sellerId: instance.seller_id,
      config: instance.config_json || {},
    });

    console.log(`[BotFactory] Started instance ${instance.id}`);
  }

  async stopInstance(instanceId) {
    const running = this.instances.get(instanceId);
    if (!running) {
      return;
    }

    try {
      running.bot.stop('instance refresh');
    } catch (err) {
      console.error(`[BotFactory] Failed to stop instance ${instanceId}:`, err.message);
    }

    this.instances.delete(instanceId);
    console.log(`[BotFactory] Stopped instance ${instanceId}`);
  }

  async broadcastToInstance({ sellerId, instanceId, message, concurrency = 10 }) {
    const running = this.instances.get(instanceId);
    if (!running) {
      throw new Error('BOT_INSTANCE_NOT_RUNNING');
    }

    if (running.sellerId !== sellerId) {
      throw new Error('BOT_INSTANCE_ACCESS_DENIED');
    }

    const { data: subscribers, error } = await supabase
      .from('bot_subscribers')
      .select('id, chat_id')
      .eq('bot_instance_id', instanceId)
      .eq('is_blocked', false);

    if (error) {
      throw new Error(`SUBSCRIBER_QUERY_FAILED: ${error.message}`);
    }

    const rows = subscribers || [];
    if (rows.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    const limiter = pLimit(Math.max(1, Math.min(50, Number(concurrency) || 10)));
    let sent = 0;
    let failed = 0;

    await Promise.all(
      rows.map((subscriber) =>
        limiter(async () => {
          try {
            await running.bot.telegram.sendMessage(subscriber.chat_id, message);
            sent += 1;
          } catch (err) {
            failed += 1;

            // Common Telegram blocking signals.
            const errMsg = String(err.message || '').toLowerCase();
            if (errMsg.includes('blocked') || errMsg.includes('forbidden')) {
              await supabase
                .from('bot_subscribers')
                .update({ is_blocked: true, updated_at: new Date().toISOString() })
                .eq('id', subscriber.id);
            }
          }
        })
      )
    );

    return {
      total: rows.length,
      sent,
      failed,
    };
  }

  async shutdown() {
    if (this.refreshIntervalRef) {
      clearInterval(this.refreshIntervalRef);
      this.refreshIntervalRef = null;
    }

    for (const [instanceId] of this.instances) {
      await this.stopInstance(instanceId);
    }
  }
}

const telegramBotFactory = new TelegramBotFactory();
export default telegramBotFactory;