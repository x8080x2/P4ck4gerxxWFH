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
      
      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: "Code is required" 
        });
      }

      const isValid = codeStorage.validateCode(code);
      
      if (isValid) {
        res.json({ 
          success: true, 
          message: "Code validated successfully" 
        });
      } else {
        res.status(401).json({ 
          success: false, 
          message: "Invalid or expired code" 
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
    
    // Generate AGL access code command
    bot.onText(/\/generate_agl_code/, (msg) => {
      const chatId = msg.chat.id.toString();
      
      // Only allow authorized chat ID
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
      `;
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Help command
    bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id.toString();
      
      if (chatId !== TELEGRAM_CHAT_ID) {
        bot.sendMessage(chatId, '❌ Unauthorized access');
        return;
      }

      const helpMessage = `
📋 *MM Packaging Admin Bot Commands*

/generate_agl_code - Generate new access code for Agreement Letter
/help - Show this help message

*Note:* Access codes expire after 24 hours and can only be used once.
      `;
      
      bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    console.log('Telegram bot setup completed');
  } catch (error) {
    console.error('Failed to setup Telegram bot:', error);
  }
}

// Initialize Telegram bot on startup
setupTelegramBot();

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


