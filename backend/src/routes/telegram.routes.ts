import { Router, Request, Response } from 'express';
import {
  handleIncomingMessage,
  handleCallbackQuery,
  isBotUpdateProcessed,
  setWebhook,
  deleteWebhook,
} from '../services/telegram-bot.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Webhook for Telegram
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    // Deduplication
    if (update.update_id && await isBotUpdateProcessed(update.update_id)) {
      return res.json({ ok: true, duplicated: true });
    }

    if (update.message?.chat?.id) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';

      await handleIncomingMessage(chatId, text);
    } else if (update.callback_query?.chat?.id && update.callback_query?.data) {
      const chatId = update.callback_query.chat.id;
      const data = update.callback_query.data;

      await handleCallbackQuery(data, chatId);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/setup-webhook', requireAuth, async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    await setWebhook(webhookUrl);
    res.json({ success: true, message: `Webhook set to ${webhookUrl}` });
  } catch (error) {
    console.error('Setup webhook error:', error);
    res.status(500).json({ error: 'Webhook setup failed' });
  }
});

router.post('/delete-webhook', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteWebhook();
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Webhook deletion failed' });
  }
});

export default router;
