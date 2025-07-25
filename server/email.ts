
import { Application } from "@shared/schema";

interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private config: EmailConfig;

  constructor() {
    this.config = {
      // Configure based on environment variables
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };
  }

  async sendApplicationConfirmation(application: Application): Promise<void> {
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #f97316 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">MM. PACKAGING</h1>
          <p style="color: #fbbf24; margin: 10px 0 0 0;">Application Received</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151;">Thank you, ${application.firstName}!</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            We have successfully received your application for our work-from-home packaging position. 
            Our team will review your information and contact you within 2-3 business days.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Application Summary</h3>
            <ul style="color: #6b7280; list-style: none; padding: 0;">
              <li><strong>Application ID:</strong> #${application.id}</li>
              <li><strong>Email:</strong> ${application.email}</li>
              <li><strong>Phone:</strong> ${application.phone}</li>
              <li><strong>Experience Level:</strong> ${application.experience}</li>
              <li><strong>Preferred Start Date:</strong> ${application.startDate}</li>
            </ul>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46;">
              <strong>Next Steps:</strong> If selected, you'll receive information about our 2-week paid training program.
            </p>
          </div>
        </div>
        
        <div style="background: #374151; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            MM. PACKAGING - Leading in Consumer Packaging
          </p>
        </div>
      </div>
    `;

    // In production, integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('📧 Email sent to:', application.email);
    console.log('Subject: Your MM Packaging Application - Confirmation');
    
    // For development, log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('Email content:', emailTemplate);
    }
  }

  async sendInternalNotification(application: Application): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    console.log(`📧 Internal notification sent to: ${adminEmail}`);
    console.log(`New application from: ${application.firstName} ${application.lastName}`);
  }
}

export const emailService = new EmailService();
