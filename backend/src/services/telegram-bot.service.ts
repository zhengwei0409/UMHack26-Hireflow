import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { callLLM, extractJsonFromResponse } from './glm.service';
import { isUpdateProcessed } from './telegram-utils';

let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = 'https://api.telegram.org';

async function getBotToken(): Promise<string> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'TELEGRAM_BOT_TOKEN' },
  });
  if (config?.value) {
    TELEGRAM_BOT_TOKEN = config.value;
    return config.value;
  }
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN not set - Telegram functionality disabled');
}

export async function isBotUpdateProcessed(updateId: number): Promise<boolean> {
  const token = await getBotToken();
  return isUpdateProcessed(token || '', updateId);
}

async function telegramRequest(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = await getBotToken();
  if (!token) {
    throw new Error('Telegram bot token not configured');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Telegram API error (${method}): ${response.status}`, err);
    throw new Error(`Telegram API error: ${response.status}`);
  }

  return response.json();
}

export async function setWebhook(webhookUrl: string): Promise<void> {
  await telegramRequest('setWebhook', { url: webhookUrl });
}

export async function deleteWebhook(): Promise<void> {
  try {
    await telegramRequest('deleteWebhook', { drop_pending_updates: true });
    console.log('[Telegram] Webhook deleted successfully');
  } catch (err) {
    console.error('[Telegram] Failed to delete webhook:', err);
  }
}

export async function sendMessage(chatId: number, text: string, replyMarkup?: unknown): Promise<void> {
  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup,
  });
}

export async function sendInlineKeyboard(
  chatId: number,
  text: string,
  buttons: Array<{ text: string; callback_data: string }>
): Promise<void> {
  const replyMarkup = {
    inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]),
  };
  await sendMessage(chatId, text, replyMarkup);
}

export async function handleIncomingMessage(chatId: number, text: string): Promise<void> {
  // HR Bot only answers HR queries
  await handleHRQuery(chatId, text);
}

async function handleHRQuery(chatId: number, query: string): Promise<void> {
  // Fetch some candidate data to provide context to LLM
  const allCandidates = await prisma.candidate.findMany({
    take: 15,
    orderBy: { glmScore: 'desc' },
    include: { job: true }
  });

  const candidateContext = allCandidates.map(c => 
    `- ${c.fullName} (Job: ${c.job.title}, Score: ${c.glmScore}, Status: ${c.status})`
  ).join('\n');

  const prompt = `You are an HR Assistant Bot for HireFlow. Answer the HR user's question based on the candidate data provided.

Available Candidates (Top 15):
${candidateContext}

Question: ${query}

Provide a concise, professional answer. If you don't have information about a specific candidate, say so. 
If the user just says "hi" or greetings, welcome them as an HR administrator.`;

  const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
  await sendMessage(chatId, response || "I'm sorry, I couldn't process that query.");
}

export async function handleCallbackQuery(
  callbackData: string,
  chatId: number
): Promise<void> {
  await sendMessage(
    chatId,
    `Action received: ${callbackData}\n\nThis has been recorded.`
  );
}

// Polling and Lock configuration
let isPolling = false;
let lastUpdateId = 0;
const INSTANCE_ID = `${process.pid}`;

export async function startPolling(): Promise<void> {
  if (isPolling) return;
  isPolling = true;
  
  console.log(`[Telegram] Instance ${INSTANCE_ID} checking polling lock...`);
  poll();
}

async function acquireLock(): Promise<boolean> {
  const now = Date.now();
  try {
    const lock = await prisma.systemConfig.findUnique({
      where: { key: 'TELEGRAM_POLLING_LOCK' },
    });

    if (lock) {
      const [ownerId, timestamp] = lock.value.split(':');
      const lockAge = now - Number(timestamp);

      // If lock is held by another instance and is fresh (< 30s), we stay idle
      if (ownerId !== INSTANCE_ID && lockAge < 30000) {
        return false;
      }
    }

    // Acquire or refresh lock
    await prisma.systemConfig.upsert({
      where: { key: 'TELEGRAM_POLLING_LOCK' },
      update: { value: `${INSTANCE_ID}:${now}` },
      create: { key: 'TELEGRAM_POLLING_LOCK', value: `${INSTANCE_ID}:${now}` },
    });
    return true;
  } catch (err) {
    console.error('[Telegram] Lock acquisition error:', err);
    return false;
  }
}

async function poll() {
  if (!isPolling) return;

  const hasLock = await acquireLock();
  if (!hasLock) {
    // We don't have the lock, try again later without polling
    setTimeout(poll, 10000);
    return;
  }

  try {
    const token = await getBotToken();
    if (token) {
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`
      );
      const data: any = await response.json();
      
      if (data.result && data.result.length > 0) {
        for (const update of data.result) {
          const updateId = update.update_id;
          lastUpdateId = Math.max(lastUpdateId, updateId);
          
          if (await isBotUpdateProcessed(updateId)) {
            continue;
          }
          
          if (update.message?.chat?.id) {
            const chatId = update.message.chat.id;
            const text = update.message.text || '';
            
            // Log for debugging
            console.log(`[Telegram] Instance ${INSTANCE_ID} processing update ${updateId}`);

            if (text.startsWith('/start')) {
              await sendMessage(chatId, 'Welcome HR Administrator! You can ask me about candidate status, scores, or lists.');
            } else {
              await handleIncomingMessage(chatId, text);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Telegram Polling] Error:', error);
  }

  // Schedule next poll immediately (with small delay)
  setTimeout(poll, 1000);
}

export function stopPolling(): void {
  isPolling = false;
  console.log('[Telegram] Polling stopped');
}
