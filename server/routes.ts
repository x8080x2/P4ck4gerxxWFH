import type { Express } from "express";
import { createServer, type Server } from "http";
import TelegramBot from "node-telegram-bot-api";
import { codeStorage } from "./code-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: "healthy" });
  });

  // Validate AGL access code
  app.post("/api/validate-agl-code", async (req, res) => {
    try {
      const { code } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: "Code is required" 
        });
      }

      // Input validation
      if (typeof code !== 'string' || code.length !== 8 || !/^[A-Z0-9]+$/.test(code.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid code format"
        });
      }

      const validation = codeStorage.validateCode(code, clientIP);

      if (validation.valid) {
        res.json({ 
          success: true, 
          message: "Code validated successfully" 
        });
      } else {
        res.status(401).json({ 
          success: false, 
          message: validation.reason || "Invalid or expired code" 
        });
      }
    } catch (error) {
      console.error('Error validating AGL code:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to validate code" 
      });
    }
  });

   // Notify signature submission
    app.post("/api/notify-signature-submission", async (req, res) => {
      try {
        const { timestamp, clientIP } = req.body;

        // Send Telegram notification
        if (bot && process.env.TELEGRAM_CHAT_ID) {
          const message = `
  ✅ *Agreement Letter Signed*

  *Time:* ${new Date(timestamp).toLocaleString()}
  *Client IP:* ${clientIP || 'Unknown'}
  *Status:* Completed Successfully

  A user has successfully signed the Agreement Letter.
          `;

          await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
            parse_mode: 'Markdown'
          });
        }

        res.json({ success: true, message: "Notification sent" });
      } catch (error) {
        console.error('Error sending signature notification:', error);
        res.status(500).json({ 
          success: false, 
          message: "Failed to send notification" 
        });
      }
    });
  
  const httpServer = createServer(app);
  return httpServer;
}

// Setup Telegram bot with commands
async function setupTelegramBot() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram bot credentials not found. AGL code generation via Telegram disabled.');
    return;
  }

  try {
    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

    // Start command
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const welcomeMessage = `
🔑 *AGL Code Generator Bot*

Welcome to the AGL (Agreement Letter) code generator bot. Use the button below to generate access codes.
      `;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🔑 Generate AGL Code',
              callback_data: 'generate_code'
            }
          ]
        ]
      };

      bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // Handle callback queries (button presses)
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Unauthorized access' });
        return;
      }

      const data = callbackQuery.data;

      if (data === 'generate_code') {
        const code = codeStorage.generateCode();
        const message = `
🔑 *New AGL Access Code Generated*

*Code:* \`${code}\`
*Valid for:* 24 hours
*Status:* Active

Share this code with the user to access the Agreement Letter page.
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔄 Generate Another Code',
                callback_data: 'generate_code'
              }
            ]
          ]
        };

        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }

      // Answer the callback query to remove loading state
      bot.answerCallbackQuery(callbackQuery.id);
    });

    // Generate AGL code command
    bot.onText(/\/generate_agl_code/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const code = codeStorage.generateCode();
      const message = `
🔑 *New AGL Access Code Generated*

*Code:* \`${code}\`
*Valid for:* 24 hours
*Status:* Active

Share this code with the user to access the Agreement Letter page.

💡 *Tip:* Use /start for the interactive menu!
      `;

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    console.log('Telegram AGL code generator bot initialized successfully');

  } catch (error) {
    console.error('Failed to setup Telegram bot:', error);
  }
}

// Initialize Telegram bot on startup
setupTelegramBot();