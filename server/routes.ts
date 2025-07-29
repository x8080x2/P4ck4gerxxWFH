import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApplicationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import { codeStorage } from "./code-storage";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      await storage.getAllApplications();
      res.json({ status: "healthy", database: "connected" });
    } catch (error) {
      res.status(503).json({ status: "unhealthy", database: "disconnected" });
    }
  });

  // Submit job application
  app.post("/api/applications", upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Parse form data
      const formData = {
        ...req.body,
        trainingAgreement: req.body.trainingAgreement === 'true' ? 'true' : undefined,
        reliabilityAgreement: req.body.reliabilityAgreement === 'true' ? 'true' : undefined,
        privacyAgreement: req.body.privacyAgreement === 'true' ? 'true' : undefined,
      };

      // Add file information
      if (files && files.idFront && files.idFront[0]) {
        formData.idFrontFilename = files.idFront[0].filename;
      }
      
      if (files && files.idBack && files.idBack[0]) {
        formData.idBackFilename = files.idBack[0].filename;
      }

      // Validate the application data
      const validatedData = insertApplicationSchema.parse(formData);
      
      // Create the application
      const application = await storage.createApplication(validatedData);
      
      // Send notifications
      try {
        await sendTelegramNotification(application);
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the application submission if notifications fail
      }
      
      res.status(201).json({ 
        success: true, 
        applicationId: application.applicationId,
        message: "Application submitted successfully! We will review your application and contact you within 2-3 business days."
      });
    } catch (error: any) {
      console.error('Application submission error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false,
          message: "Please check all required fields",
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Failed to submit application. Please try again."
      });
    }
  });

  // Get application by ID (supports both numeric ID and applicationId)
  app.get("/api/applications/:id", async (req, res) => {
    try {
      const idParam = req.params.id;
      let application;
      
      // Check if it's a numeric ID or alphanumeric applicationId
      if (/^\d+$/.test(idParam)) {
        const id = parseInt(idParam);
        application = await storage.getApplication(id);
      } else {
        application = await storage.getApplicationByApplicationId(idParam);
      }
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(application);
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Get all applications (for admin purposes)
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getAllApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
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
        // Log successful access
        console.log(`AGL access granted for IP: ${clientIP} at ${new Date().toISOString()}`);
        
        res.json({ 
          success: true, 
          message: "Code validated successfully" 
        });
      } else {
        // Log failed attempts
        console.log(`AGL access denied for IP: ${clientIP} - Reason: ${validation.reason} at ${new Date().toISOString()}`);
        
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

  // Export applications as CSV
  app.get("/api/applications/export", async (req, res) => {
    try {
      const applications = await storage.getAllApplications();
      
      const csvHeaders = [
        'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Address',
        'Experience', 'Previous Jobs', 'Training Available', 'Start Date',
        'Hours Per Week', 'Workspace Space', 'Submitted At'
      ];
      
      const csvRows = applications.map(app => [
        app.id,
        app.firstName,
        app.lastName,
        app.email,
        app.phone,
        app.address,
        app.experience,
        app.previousJobs || '',
        app.trainingAvailable,
        app.startDate,
        app.hoursPerWeek,
        app.workspaceSpace,
        app.submittedAt?.toISOString() || ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting applications:', error);
      res.status(500).json({ message: "Failed to export applications" });
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
    console.log('Telegram bot not configured');
    return;
  }

  try {
    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    
    // Start command with main menu
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id.toString();
      
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const welcomeMessage = `
🏢 *MM Packaging Admin Bot*

Welcome to the MM Packaging administration bot. Use the buttons below to manage your application system.
      `;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🔑 Generate AGL Code',
              callback_data: 'generate_code'
            }
          ],
          [
            {
              text: '📊 Application Stats',
              callback_data: 'app_stats'
            },
            {
              text: '📅 History',
              callback_data: 'detailed_history'
            }
          ],
          [
            {
              text: '❓ Help',
              callback_data: 'help'
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
        bot.answerCallbackQuery(callbackQuery.id, '❌ Unauthorized access');
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
            ],
            [
              {
                text: '🏠 Main Menu',
                callback_data: 'main_menu'
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
      } else if (data === 'app_stats') {
        try {
          const applications = await storage.getAllApplications();
          
          // Calculate various statistics
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

          const todayApplications = applications.filter(app => {
            const appDate = new Date(app.submittedAt || '');
            return appDate >= today;
          });

          const yesterdayApplications = applications.filter(app => {
            const appDate = new Date(app.submittedAt || '');
            return appDate >= yesterday && appDate < today;
          });

          const weekApplications = applications.filter(app => {
            const appDate = new Date(app.submittedAt || '');
            return appDate >= thisWeek;
          });

          const monthApplications = applications.filter(app => {
            const appDate = new Date(app.submittedAt || '');
            return appDate >= thisMonth;
          });

          // Calculate daily average for the week
          const dailyAverage = Math.round(weekApplications.length / 7 * 10) / 10;

          // Get hourly breakdown for today
          const hourlyStats = Array(24).fill(0);
          todayApplications.forEach(app => {
            const hour = new Date(app.submittedAt || '').getHours();
            hourlyStats[hour]++;
          });
          
          const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
          const peakHourCount = Math.max(...hourlyStats);

          const message = `
📊 *Application Statistics & History*

📈 *Current Period:*
*Total Applications:* ${applications.length}
*Today:* ${todayApplications.length} applications
*Yesterday:* ${yesterdayApplications.length} applications
*This Week:* ${weekApplications.length} applications
*This Month:* ${monthApplications.length} applications

📋 *Trends:*
*Daily Average (7 days):* ${dailyAverage} apps/day
*Peak Hour Today:* ${peakHour}:00 (${peakHourCount} apps)
*Week vs Last 7 days:* ${weekApplications.length > dailyAverage * 7 ? '📈 Trending Up' : weekApplications.length < dailyAverage * 7 ? '📉 Trending Down' : '➡️ Stable'}

⏰ *Last Updated:* ${now.toLocaleString()}
          `;

          const keyboard = {
            inline_keyboard: [
              [
                {
                  text: '📅 Detailed History',
                  callback_data: 'detailed_history'
                }
              ],
              [
                {
                  text: '🔄 Refresh Stats',
                  callback_data: 'app_stats'
                }
              ],
              [
                {
                  text: '🏠 Main Menu',
                  callback_data: 'main_menu'
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
        } catch (error) {
          bot.answerCallbackQuery(callbackQuery.id, '❌ Failed to fetch statistics');
        }
      } else if (data === 'detailed_history') {
        try {
          const applications = await storage.getAllApplications();
          
          // Group applications by date
          const dailyStats = new Map<string, number>();
          applications.forEach(app => {
            const date = new Date(app.submittedAt || '').toDateString();
            dailyStats.set(date, (dailyStats.get(date) || 0) + 1);
          });

          // Get last 10 days
          const last10Days = [];
          for (let i = 9; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const count = dailyStats.get(dateStr) || 0;
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            last10Days.push(`*${dayName}:* ${count} apps`);
          }

          // Find busiest day
          let busiestDay = '';
          let maxCount = 0;
          dailyStats.forEach((count, date) => {
            if (count > maxCount) {
              maxCount = count;
              busiestDay = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            }
          });

          const message = `
📅 *Detailed Application History*

📊 *Last 10 Days:*
${last10Days.join('\n')}

🏆 *All-Time Records:*
*Busiest Day:* ${busiestDay} (${maxCount} apps)
*Total Applications:* ${applications.length}
*Average per Day:* ${Math.round(applications.length / Math.max(dailyStats.size, 1) * 10) / 10}

📈 *Activity Pattern:*
${applications.length > 50 ? '🔥 High Volume' : applications.length > 20 ? '📈 Growing' : applications.length > 10 ? '🌱 Steady' : '🆕 Starting'}
          `;

          const keyboard = {
            inline_keyboard: [
              [
                {
                  text: '📊 Back to Stats',
                  callback_data: 'app_stats'
                }
              ],
              [
                {
                  text: '🏠 Main Menu',
                  callback_data: 'main_menu'
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
        } catch (error) {
          bot.answerCallbackQuery(callbackQuery.id, '❌ Failed to fetch detailed history');
        }
      } else if (data === 'help') {
        const helpMessage = `
📋 *MM Packaging Admin Bot Help*

*Available Commands:*
• /start - Show main menu with all options
• /generate_agl_code - Quick code generation

*Features:*
• 🔑 Generate AGL access codes (24-hour validity)
• 📊 View comprehensive application statistics
• 📅 Detailed history with trends and analytics
• ❓ Get help and support

*Statistics Include:*
• Daily, weekly, and monthly breakdowns
• Trending analysis and peak hours
• Historical data with activity patterns
• All-time records and averages

*Note:* Access codes expire after 24 hours and can only be used once.
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🏠 Main Menu',
                callback_data: 'main_menu'
              }
            ]
          ]
        };

        bot.editMessageText(helpMessage, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else if (data === 'main_menu') {
        const welcomeMessage = `
🏢 *MM Packaging Admin Bot*

Welcome to the MM Packaging administration bot. Use the buttons below to manage your application system.
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔑 Generate AGL Code',
                callback_data: 'generate_code'
              }
            ],
            [
              {
                text: '📊 Application Stats',
                callback_data: 'app_stats'
              },
              {
                text: '📅 History',
                callback_data: 'detailed_history'
              }
            ],
            [
              {
                text: '❓ Help',
                callback_data: 'help'
              }
            ]
          ]
        };

        bot.editMessageText(welcomeMessage, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }

      // Answer the callback query to remove loading state
      bot.answerCallbackQuery(callbackQuery.id);
    });

    // Backward compatibility - keep text commands
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

    console.log('Telegram bot setup completed');
  } catch (error) {
    console.error('Failed to setup Telegram bot:', error);
  }
}

// Initialize Telegram bot on startup
setupTelegramBot();

// Setup daily statistics sync
async function setupDailySync() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Daily sync not configured - missing Telegram credentials');
    return;
  }

  // Send daily summary at 9 AM every day
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Check if it's 9:00 AM (±5 minutes)
    if (hour === 9 && minute >= 0 && minute <= 5) {
      try {
        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
        const applications = await storage.getAllApplications();
        
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const todayApps = applications.filter(app => {
          const appDate = new Date(app.submittedAt || '');
          return appDate >= today;
        }).length;
        
        const yesterdayApps = applications.filter(app => {
          const appDate = new Date(app.submittedAt || '');
          return appDate >= yesterday && appDate < today;
        }).length;
        
        const change = todayApps - yesterdayApps;
        const changeIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        const changeText = change > 0 ? `+${change}` : change.toString();
        
        const message = `
🌅 *Daily Application Summary*
*Date:* ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

📊 *Today's Activity:*
*New Applications:* ${todayApps}
*Yesterday:* ${yesterdayApps}
*Change:* ${changeIcon} ${changeText}

📈 *Overall Progress:*
*Total Applications:* ${applications.length}
*System Status:* ✅ Active

Have a great day managing your applications! 🚀
        `;

        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        console.log('Daily sync summary sent successfully');
      } catch (error) {
        console.error('Failed to send daily sync:', error);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

// Initialize daily sync
setupDailySync();

// Telegram notification function
async function sendTelegramNotification(application: any) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured, skipping notification');
    return;
  }
  
  try {
    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
    
    const message = `
🆕 *New Job Application Received*

*Applicant:* ${application.firstName} ${application.lastName}
*Email:* ${application.email}
*Phone:* ${application.phone}
*Application ID:* #${application.applicationId}

*Experience Level:* ${application.experience}
*Start Date:* ${application.startDate}
*Hours Per Week:* ${application.hoursPerWeek}
*Training Available:* ${application.trainingAvailable}
*Workspace:* ${application.workspaceSpace}

*ID Front:* ${application.idFrontFilename ? '✅ Uploaded' : '❌ Not provided'}
*ID Back:* ${application.idBackFilename ? '✅ Uploaded' : '❌ Not provided'}

*Submitted:* ${new Date().toLocaleString()}
    `;

    // Prepare media group for ID documents
    const mediaGroup: any[] = [];
    const idFrontPath = application.idFrontFilename ? path.join(uploadDir, application.idFrontFilename) : null;
    const idBackPath = application.idBackFilename ? path.join(uploadDir, application.idBackFilename) : null;

    if (idFrontPath && fs.existsSync(idFrontPath)) {
      mediaGroup.push({
        type: 'document' as const,
        media: idFrontPath,
        caption: `📄 ID Front - Application #${application.applicationId}`
      });
    }

    if (idBackPath && fs.existsSync(idBackPath)) {
      mediaGroup.push({
        type: 'document' as const,
        media: idBackPath,
        caption: `📄 ID Back - Application #${application.applicationId}`
      });
    }

    // Send message first
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    
    // Then send media group if there are documents
    if (mediaGroup.length > 0) {
      try {
        await bot.sendMediaGroup(TELEGRAM_CHAT_ID, mediaGroup);
      } catch (mediaError) {
        console.error('Failed to send media group, falling back to individual files:', mediaError);
        // Fallback to individual file sending
        for (const media of mediaGroup) {
          try {
            await bot.sendDocument(TELEGRAM_CHAT_ID, media.media, {
              caption: media.caption
            });
          } catch (fileError) {
            console.error('Failed to send individual file:', fileError);
          }
        }
      }
    }
    
    console.log(`Telegram notification sent for application ${application.applicationId}`);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}


