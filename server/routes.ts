import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApplicationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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
  // Submit job application
  app.post("/api/applications", upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'additionalDocs', maxCount: 5 }
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
      if (files.resume && files.resume[0]) {
        formData.resumeFilename = files.resume[0].filename;
      }
      
      if (files.additionalDocs && files.additionalDocs.length > 0) {
        formData.additionalDocsFilenames = files.additionalDocs.map(file => file.filename);
      }

      // Validate the application data
      const validatedData = insertApplicationSchema.parse(formData);
      
      // Create the application
      const application = await storage.createApplication(validatedData);
      
      // Send email notification (mock implementation)
      try {
        await sendEmailNotification(application);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the application submission if email fails
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

  const httpServer = createServer(app);
  return httpServer;
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
