import type { Express } from "express";
import { createServer, type Server } from "http";
import TelegramBot from "node-telegram-bot-api";
import multer from "multer";
import path from "path";
import fs from "fs";
import { codeStorage } from "./code-storage";
import { MemStorage } from "./storage";
import { insertApplicationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Initialize storage
const storage = new MemStorage();

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files for ID documents
    if (file.fieldname === 'idFront' || file.fieldname === 'idBack') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for ID documents'));
      }
    } else {
      cb(null, true);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: "healthy" });
  });

  // Application submission endpoint
  app.post("/api/applications", upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
  ]), async (req, res) => {
    try {
      // Extract files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const idFrontFile = files?.idFront?.[0];
      const idBackFile = files?.idBack?.[0];

      // Parse and validate form data
      const formData = { ...req.body };
      
      // Add file names to form data if files were uploaded
      if (idFrontFile) {
        formData.idFrontFilename = idFrontFile.filename;
      }
      if (idBackFile) {
        formData.idBackFilename = idBackFile.filename;
      }

      // Validate the application data
      const validationResult = insertApplicationSchema.safeParse(formData);
      
      if (!validationResult.success) {
        // Clean up uploaded files if validation fails
        if (idFrontFile) fs.unlinkSync(idFrontFile.path);
        if (idBackFile) fs.unlinkSync(idBackFile.path);
        
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationError.message
        });
      }

      // Create the application
      const application = await storage.createApplication(validationResult.data);

      // Send Telegram notification if configured
      if (bot && process.env.TELEGRAM_CHAT_ID) {
        const message = `
🎉 *New Job Application Received*

*Application ID:* ${application.applicationId}
*Name:* ${application.firstName} ${application.lastName}
*Email:* ${application.email}
*Phone:* ${application.phone}
*Experience:* ${application.experience}
*Start Date:* ${application.startDate}
*Hours/Week:* ${application.hoursPerWeek}

*ID Documents:* ${idFrontFile && idBackFile ? '✅ Both Front & Back uploaded' : 
                  idFrontFile ? '⚠️ Only Front uploaded' : 
                  idBackFile ? '⚠️ Only Back uploaded' : 
                  '❌ No ID documents'}

*Submitted:* ${new Date().toLocaleString()}
        `;

        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
          parse_mode: 'Markdown'
        });

        // Send ID documents if they were uploaded
        if (idFrontFile) {
          await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, idFrontFile.path, {
            caption: `ID Front - ${application.firstName} ${application.lastName} (${application.applicationId})`
          });
        }

        if (idBackFile) {
          await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, idBackFile.path, {
            caption: `ID Back - ${application.firstName} ${application.lastName} (${application.applicationId})`
          });
        }
      }

      res.json({
        success: true,
        message: "Application submitted successfully",
        applicationId: application.applicationId
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Clean up uploaded files on error
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files?.idFront?.[0]) fs.unlinkSync(files.idFront[0].path);
        if (files?.idBack?.[0]) fs.unlinkSync(files.idBack[0].path);
      } catch (cleanupError) {
        console.error('Error cleaning up files:', cleanupError);
      }

      res.status(500).json({
        success: false,
        message: "Failed to submit application"
      });
    }
  });

  // Get application by ID endpoint
  app.get("/api/applications/:applicationId", async (req, res) => {
    try {
      const { applicationId } = req.params;
      const application = await storage.getApplicationByApplicationId(applicationId);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      res.json({
        success: true,
        application
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch application"
      });
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
        res.json({ 
          success: true, 
          message: "Code validated successfully",
          sessionId: codeStorage.getCurrentSessionId()
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
      const { timestamp, clientIP, contractorName, signatureName, sessionId } = req.body;
      
      console.log('AGL Agreement Letter Signed:', {
        contractorName: contractorName || 'Unknown',
        signatureName: signatureName || 'Unknown',
        timestamp: new Date(timestamp).toLocaleString(),
        clientIP: clientIP || 'Unknown',
        sessionId: sessionId || 'No session'
      });
      
      // Send Telegram notification
      if (bot && process.env.TELEGRAM_CHAT_ID) {
        const message = `
✅ *Agreement Letter Signed*

*Contractor:* ${contractorName || 'Unknown'}
*Signature Name:* ${signatureName || 'Unknown'}
*Time:* ${new Date(timestamp).toLocaleString()}
*Client IP:* ${clientIP || 'Unknown'}
*Session ID:* ${sessionId || 'No session'}
*Status:* Completed Successfully

A user has successfully signed the Agreement Letter.
        `;

        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
          parse_mode: 'Markdown'
        });
        
        console.log('Telegram notification sent for AGL signature');
      } else {
        console.log('Telegram bot not configured - signature logged locally only');
      }

      res.json({ success: true, message: "Signature logged and notification sent" });
    } catch (error) {
      console.error('Error sending signature notification:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send notification" 
      });
    }
  });



  // Debug endpoint to check code storage stats (development only)
  app.get('/api/debug/agl-stats', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const stats = codeStorage.getCodeStats();
    res.json({
      ...stats,
      environment: process.env.NODE_ENV,
      telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
  });

  // Test endpoint to generate a code for development
  app.post('/api/debug/generate-test-code', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const code = codeStorage.generateCode();
    console.log(`Generated test AGL code: ${code}`);
    console.log('All existing sessions invalidated due to new code generation');
    res.json({ 
      success: true, 
      code,
      message: 'Test code generated for development',
      sessionId: codeStorage.getCurrentSessionId()
    });
  });

  // Session validation endpoint
  app.post('/api/validate-session', (req, res) => {
    try {
      const { sessionId } = req.body;
      const currentSessionId = codeStorage.getCurrentSessionId();
      
      if (sessionId === currentSessionId) {
        res.json({ success: true, valid: true });
      } else {
        res.json({ success: true, valid: false, reason: 'Session invalidated' });
      }
    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to validate session" 
      });
    }
  });

  // Agreement data endpoints
  app.get("/api/agreement-data", (req, res) => {
    try {
      const data = codeStorage.getAgreementData();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting agreement data:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get agreement data" 
      });
    }
  });

  app.post("/api/agreement-data", (req, res) => {
    try {
      const { field, value } = req.body;
      
      if (!field || value === undefined) {
        return res.status(400).json({
          success: false,
          message: "Both field and value are required"
        });
      }

      const updated = codeStorage.updateAgreementField(field, value);
      
      if (updated) {
        res.json({ 
          success: true, 
          message: "Agreement data updated successfully",
          data: codeStorage.getAgreementData()
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid field name"
        });
      }
    } catch (error) {
      console.error('Error updating agreement data:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update agreement data" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Global bot variable for notifications
let bot: TelegramBot | null = null;

// Setup Telegram bot with commands
async function setupTelegramBot() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram bot credentials not found. AGL code generation via Telegram disabled.');
    return;
  }

  try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

    // Start command
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const welcomeMessage = `
🔑 *AGL Code Generator Bot*

Welcome to the AGL (Agreement Letter) code generator bot. Use the buttons below to manage access codes and agreement settings.
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
              text: '📊 View Statistics',
              callback_data: 'view_stats'
            },
            {
              text: '📄 Agreement Settings',
              callback_data: 'agreement_settings'
            }
          ],
          [
            {
              text: '❓ Help',
              callback_data: 'show_help'
            }
          ]
        ]
      };

      bot?.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // Handle callback queries (button presses)
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.answerCallbackQuery(callbackQuery.id, { text: '❌ Unauthorized access' });
        return;
      }

      const data = callbackQuery.data;

      if (data === 'generate_code') {
        const code = codeStorage.generateCode();
        console.log(`Generated AGL code via Telegram: ${code}`);
        console.log('All existing sessions invalidated due to new code generation');
        const message = `
🔑 *New AGL Access Code Generated*

*Code:* \`${code}\`
*Valid for:* 2 hours
*Status:* Active
*Sessions:* All previous sessions invalidated

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

        bot?.editMessageText(message, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else if (data === 'view_stats') {
        const stats = codeStorage.getCodeStats();
        const message = `
📊 *AGL Code Statistics*

*Total Generated:* ${stats.totalCodes}
*Active Codes:* ${stats.activeCodes}
*Used Codes:* ${stats.usedCodes}

Use the button below to generate a new code.
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔑 Generate New Code',
                callback_data: 'generate_code'
              }
            ],
            [
              {
                text: '🔙 Back to Menu',
                callback_data: 'back_to_menu'
              }
            ]
          ]
        };

        bot?.editMessageText(message, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else if (data === 'show_help') {
        const helpMessage = `
🤖 *AGL Bot Help*

*Available Commands:*
/start - Show interactive menu
/generate_agl_code - Generate new access code
/stats - View code statistics
/help - Show this help message

*About AGL Codes:*
• Valid for 2 hours after generation
• 5-minute session timeout for security
• Single-use codes only
• 8-character alphanumeric format

Use the buttons below for quick actions.
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔑 Generate Code',
                callback_data: 'generate_code'
              },
              {
                text: '📊 View Stats',
                callback_data: 'view_stats'
              }
            ],
            [
              {
                text: '📄 Agreement Settings',
                callback_data: 'agreement_settings'
              }
            ],
            [
              {
                text: '🔙 Back to Menu',
                callback_data: 'back_to_menu'
              }
            ]
          ]
        };

        bot?.editMessageText(helpMessage, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else if (data === 'agreement_settings') {
        const agreementData = codeStorage.getAgreementData();
        const message = `
📄 *Current Agreement Settings*

*Contractor Name:* ${agreementData.contractorName}
*Communication Email:* ${agreementData.communicationEmail}
*Weekly Package Target:* ${agreementData.weeklyPackageTarget}
*Weekly Requirement:* ${agreementData.weeklyRequirement}
*Signature Name:* ${agreementData.signatureName}

Use these commands to update:
\`/set_name John Smith\`
\`/set_email john@example.com\`
\`/set_target 500 Package Expected\`
\`/set_requirement 500 ITEMS WEEKLY\`
        `;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '👤 Update Name',
                callback_data: 'edit_contractor_name'
              },
              {
                text: '📧 Update Email',
                callback_data: 'edit_communication_email'
              }
            ],
            [
              {
                text: '📦 Update Package Quantity',
                callback_data: 'edit_package_quantity'
              }
            ],
            [
              {
                text: '🔙 Back to Menu',
                callback_data: 'back_to_menu'
              }
            ]
          ]
        };

        bot?.editMessageText(message, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else if (data && data.startsWith('edit_')) {
        const field = data.replace('edit_', '');
        const fieldNames: { [key: string]: string } = {
          'contractor_name': 'Contractor Name',
          'communication_email': 'Communication Email',
          'package_quantity': 'Package Quantity (Weekly)'
        };
        
        const fieldName = fieldNames[field] || field;
        const agreementData = codeStorage.getAgreementData();
        
        // Get current value safely
        let currentValue = '';
        switch (field) {
          case 'contractor_name':
            currentValue = agreementData.contractorName;
            break;
          case 'communication_email':
            currentValue = agreementData.communicationEmail;
            break;
          case 'package_quantity':
            // Extract number from target (e.g., "1000 Package Expected" -> "1000")
            const match = agreementData.weeklyPackageTarget.match(/(\d+)/);
            currentValue = match ? match[1] : '1000';
            break;
        }
        
        const exampleValue = field === 'contractor_name' ? 'John Smith' : 
                            field === 'communication_email' ? 'john@example.com' : 
                            '500';

        // Send input prompt message
        const inputPromptMsg = await bot?.sendMessage(chatId, `✏️ *Edit ${fieldName}*\n\n*Current value:* ${currentValue}\n\nPlease type your new value:\n\n*Example:* ${exampleValue}`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{
              text: '🔙 Back to Agreement Settings',
              callback_data: 'agreement_settings'
            }]]
          }
        });
        
        // Set up a temporary message handler for this user
        const handleFieldUpdate = (msg: any) => {
          if (msg.chat.id.toString() === chatId && msg.text) {
            const newValue = msg.text.trim();
            
            // Delete the user's input message to reduce clutter
            bot?.deleteMessage(chatId, msg.message_id).catch(() => {});
            
            // Delete the input prompt message
            if (inputPromptMsg) {
              bot?.deleteMessage(chatId, inputPromptMsg.message_id).catch(() => {});
            }
            
            if (field === 'contractor_name') {
              codeStorage.updateAgreementField('contractorName', newValue);
              codeStorage.updateAgreementField('signatureName', newValue);
            } else if (field === 'communication_email') {
              codeStorage.updateAgreementField('communicationEmail', newValue);
            } else if (field === 'package_quantity') {
              // Update both target and requirement with the quantity number
              const quantity = newValue.trim();
              codeStorage.updateAgreementField('weeklyPackageTarget', `${quantity} Package Expected`);
              codeStorage.updateAgreementField('weeklyRequirement', `${quantity} ITEMS WEEKLY`);
            }
            
            const successMessage = field === 'package_quantity' ? 
              `✅ *Package Quantity Updated Successfully*\n\nTarget: *${newValue} Package Expected*\nRequirement: *${newValue} ITEMS WEEKLY*` :
              `✅ *${fieldName} Updated Successfully*\n\nNew value: *${newValue}*`;
            
            bot?.sendMessage(chatId, successMessage, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{
                  text: '📄 Back to Agreement Settings',
                  callback_data: 'agreement_settings'
                }]]
              }
            }).then((sentMessage) => {
              // Auto-delete success message after 10 seconds
              setTimeout(() => {
                if (sentMessage && bot) {
                  bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {
                    // Ignore errors if message already deleted
                  });
                }
              }, 10000);
            });
            
            // Remove this temporary handler
            bot?.removeListener('message', handleFieldUpdate);
          }
        };
        
        // Add temporary message handler
        bot?.on('message', handleFieldUpdate);
        
      } else if (data === 'back_to_menu') {
        const welcomeMessage = `
🔑 *AGL Code Generator Bot*

Welcome to the AGL (Agreement Letter) code generator bot. Use the buttons below to manage access codes.
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
                text: '📊 View Statistics',
                callback_data: 'view_stats'
              },
              {
                text: '📄 Agreement Settings',
                callback_data: 'agreement_settings'
              }
            ],
            [
              {
                text: '❓ Help',
                callback_data: 'show_help'
              }
            ]
          ]
        };

        bot?.editMessageText(welcomeMessage, {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }

      // Answer the callback query to remove loading state
      bot?.answerCallbackQuery(callbackQuery.id);
    });

    // Generate AGL code command
    bot.onText(/\/generate_agl_code/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access').then((sentMessage) => {
          // Auto-delete unauthorized message after 5 seconds
          setTimeout(() => {
            if (sentMessage && bot) {
              bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
            }
          }, 5000);
        });
        return;
      }

      const code = codeStorage.generateCode();
      const message = `
🔑 *New AGL Access Code Generated*

*Code:* \`${code}\`
*Valid for:* 2 hours
*Status:* Active

Share this code with the user to access the Agreement Letter page.

💡 *Tip:* Use /start for the interactive menu!
      `;

      bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' }).then((sentMessage) => {
        // Auto-delete code message after 2.5 hours (30 min after expiry)
        setTimeout(() => {
          if (sentMessage && bot) {
            bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {
              // Ignore errors if message already deleted
            });
          }
        }, 9000000); // 2.5 hours
      });
    });

    // Stats command
    bot.onText(/\/stats/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access').then((sentMessage) => {
          // Auto-delete unauthorized message after 5 seconds
          setTimeout(() => {
            if (sentMessage && bot) {
              bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
            }
          }, 5000);
        });
        return;
      }

      const stats = codeStorage.getCodeStats();
      const message = `
📊 *AGL Code Statistics*

*Total Generated:* ${stats.totalCodes}
*Active Codes:* ${stats.activeCodes}
*Used Codes:* ${stats.usedCodes}

Use /generate_agl_code to create a new access code.
      `;

      bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' }).then((sentMessage) => {
        // Auto-delete stats message after 30 seconds
        setTimeout(() => {
          if (sentMessage && bot) {
            bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {
              // Ignore errors if message already deleted
            });
          }
        }, 30000); // 30 seconds
      });
    });

    // Agreement management commands
    bot.onText(/\/agreement_settings/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const agreementData = codeStorage.getAgreementData();
      const message = `
📄 *Current Agreement Settings*

*Contractor Name:* ${agreementData.contractorName}
*Communication Email:* ${agreementData.communicationEmail}
*Weekly Package Target:* ${agreementData.weeklyPackageTarget}
*Weekly Requirement:* ${agreementData.weeklyRequirement}
*Signature Name:* ${agreementData.signatureName}

*Usage Examples:*
\`/set_name John Smith\`
\`/set_email john@example.com\`
\`/set_target 500 Package Expected\`
\`/set_requirement 500 ITEMS WEEKLY\`
      `;

      bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });
    });

    // Agreement data update commands
    bot.onText(/\/set_name (.+)/, (msg, match) => {
      const chatId = msg.chat.id.toString();
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const newName = match?.[1];
      if (newName) {
        codeStorage.updateAgreementField('contractorName', newName);
        codeStorage.updateAgreementField('signatureName', newName);
        bot?.sendMessage(chatId, `✅ Contractor name and signature updated to: *${newName}*`, {
          parse_mode: 'Markdown'
        });
      }
    });

    bot.onText(/\/set_email (.+)/, (msg, match) => {
      const chatId = msg.chat.id.toString();
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const newEmail = match?.[1];
      if (newEmail) {
        codeStorage.updateAgreementField('communicationEmail', newEmail);
        bot?.sendMessage(chatId, `✅ Communication email updated to: *${newEmail}*`, {
          parse_mode: 'Markdown'
        });
      }
    });

    bot.onText(/\/set_target (.+)/, (msg, match) => {
      const chatId = msg.chat.id.toString();
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const newTarget = match?.[1];
      if (newTarget) {
        codeStorage.updateAgreementField('weeklyPackageTarget', newTarget);
        bot?.sendMessage(chatId, `✅ Weekly package target updated to: *${newTarget}*`, {
          parse_mode: 'Markdown'
        });
      }
    });

    bot.onText(/\/set_requirement (.+)/, (msg, match) => {
      const chatId = msg.chat.id.toString();
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const newRequirement = match?.[1];
      if (newRequirement) {
        codeStorage.updateAgreementField('weeklyRequirement', newRequirement);
        bot?.sendMessage(chatId, `✅ Weekly requirement updated to: *${newRequirement}*`, {
          parse_mode: 'Markdown'
        });
      }
    });

    // Help command
    bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id.toString();

      if (chatId !== TELEGRAM_CHAT_ID) {
        bot?.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const helpMessage = `
🤖 *AGL Bot Commands*

*Code Management:*
/start - Show interactive menu
/generate_agl_code - Generate new access code
/stats - View code statistics

*Agreement Management:*
/agreement_settings - View current agreement data
/set_name [name] - Update contractor name
/set_email [email] - Update communication email
/set_target [target] - Update weekly package target
/set_requirement [requirement] - Update weekly requirement

/help - Show this help message

*About AGL Codes:*
• Valid for 2 hours after generation
• 5-minute session timeout for security
• Single-use codes only
• 8-character alphanumeric format

*Agreement Changes:*
• Updates reflect immediately in the agreement letter
• Both contractor name and signature are updated together
      `;

      bot?.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    console.log('Telegram AGL code generator bot initialized successfully');

  } catch (error) {
    console.error('Failed to setup Telegram bot:', error);
  }
}

// Initialize Telegram bot on startup
setupTelegramBot();