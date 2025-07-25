import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApplicationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";

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
        workspaceAgreement: req.body.workspaceAgreement === 'true' ? 'true' : undefined,
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
        await sendEmailNotification(application);
        await sendTelegramNotification(application);
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the application submission if notifications fail
      }
      
      res.status(201).json({ 
        success: true, 
        applicationId: application.id,
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

  // Get application by ID
  app.get("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
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
*Application ID:* #${application.id}

*Experience Level:* ${application.experience}
*Start Date:* ${application.startDate}
*Hours Per Week:* ${application.hoursPerWeek}
*Training Available:* ${application.trainingAvailable}
*Workspace:* ${application.workspaceSpace}

*ID Front:* ${application.idFrontFilename ? '✅ Uploaded' : '❌ Not provided'}
*ID Back:* ${application.idBackFilename ? '✅ Uploaded' : '❌ Not provided'}

*Submitted:* ${new Date().toLocaleString()}
    `;
    
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    
    // Send ID documents as files if they exist
    if (application.idFrontFilename) {
      const idFrontPath = path.join(uploadDir, application.idFrontFilename);
      if (fs.existsSync(idFrontPath)) {
        try {
          await bot.sendDocument(TELEGRAM_CHAT_ID, idFrontPath, {
            caption: `📄 ID Front - Application #${application.id}`
          });
        } catch (fileError) {
          console.error('Failed to send ID front file:', fileError);
        }
      }
    }
    
    if (application.idBackFilename) {
      const idBackPath = path.join(uploadDir, application.idBackFilename);
      if (fs.existsSync(idBackPath)) {
        try {
          await bot.sendDocument(TELEGRAM_CHAT_ID, idBackPath, {
            caption: `📄 ID Back - Application #${application.id}`
          });
        } catch (fileError) {
          console.error('Failed to send ID back file:', fileError);
        }
      }
    }
    
    console.log(`Telegram notification sent for application ${application.id}`);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

// Mock email notification function
async function sendEmailNotification(application: any) {
  // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
  console.log(`Email notification sent for application ${application.id}`);
  console.log(`Applicant: ${application.firstName} ${application.lastName}`);
  console.log(`Email: ${application.email}`);
  console.log(`Phone: ${application.phone}`);
  console.log(`Start Date: ${application.startDate}`);
  console.log(`Training Available: ${application.trainingAvailable}`);
  
  // Simulate async email sending
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}
