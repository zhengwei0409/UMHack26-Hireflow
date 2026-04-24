import app from './src/app';
import { startPolling } from './src/services/telegram-bot.service';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Start Telegram polling for local development
  if (process.env.NODE_ENV !== 'production') {
    startPolling().catch(err => console.error('Failed to start Telegram polling:', err));
  }
});
