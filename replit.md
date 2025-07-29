# Application Architecture Overview

## Overview

This is a full-stack web application built for MM Packaging to handle work-from-home job applications. The system consists of a React frontend with TypeScript, an Express.js backend, and PostgreSQL database integration using Drizzle ORM. The application features a modern UI built with shadcn/ui components and Tailwind CSS.

## Recent Changes

**July 29, 2025**: Successfully completed migration from Replit Agent to standard Replit environment. Fixed TypeScript errors in Telegram bot routes, verified all components working properly, and confirmed production deployment on Render with active Telegram integration.

**July 25, 2025**: Successfully migrated project from Replit Agent to standard Replit environment. Fixed tsx dependency issue and verified full application functionality including form submissions, email notifications, and database operations.

**July 25, 2025**: Fixed critical form validation issues and Telegram notification system:
- Resolved corrupted file-upload.tsx component syntax errors
- Improved email and phone validation with proper error messages
- Fixed Telegram notification to correctly display ID document upload status
- Enhanced Telegram bot to send actual ID document files to chat
- Updated form schema to properly handle agreement checkboxes

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Professional MM Packaging branding with hero image matching mm.group/packaging style.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components based on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React Query (@tanstack/react-query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Uploads**: Multer for handling resume and document uploads
- **Request Logging**: Custom middleware for API request tracking
- **Error Handling**: Centralized error handling middleware

### Data Storage
- **Database**: PostgreSQL (configured for production)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Development Storage**: In-memory storage implementation for development
- **Schema**: Shared schema definitions with Zod validation

## Key Components

### Database Schema
The application uses a single `applications` table storing:
- Personal information (name, email, phone, address)
- Work experience and availability preferences
- File references for uploaded documents
- Agreement confirmations for various policies
- Submission timestamps

### File Upload System
- Supports resume uploads (PDF, DOC, DOCX formats)
- Additional document uploads (up to 5 files)
- File type validation and size limits (5MB)
- Local file storage in `/uploads` directory

### Form Validation
- Client-side validation using Zod schemas
- Server-side validation for all form submissions
- Real-time form feedback with error messages
- Required field validation for all agreements

### UI Components
- Comprehensive component library from shadcn/ui
- Responsive design with mobile-first approach
- Accessible form controls and navigation
- Toast notifications for user feedback

## Data Flow

1. **Application Submission**:
   - User fills out multi-section form
   - Files are uploaded via drag-and-drop or file picker
   - Form validation occurs on client and server
   - Data is saved to database with file references
   - User receives confirmation with application ID

2. **File Handling**:
   - Files are validated for type and size
   - Stored locally with unique generated names
   - File paths are saved to database for reference

3. **Success Flow**:
   - Successful submissions redirect to success page
   - Application details are fetched and displayed
   - Contact information and next steps are provided

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection driver
- **drizzle-orm**: TypeScript ORM for database operations
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Dependencies
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tools

## Deployment Strategy

### Development Mode
- Vite dev server for frontend hot reloading
- Express server with development middleware
- In-memory storage for quick development iteration
- Source maps and error overlays enabled

### Production Build
- Vite builds optimized frontend bundle
- esbuild bundles server code for Node.js
- Static assets served from `/dist/public`
- Database migrations applied via `drizzle-kit push`

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- File uploads stored in local filesystem
- Development vs production mode detection
- Replit-specific integrations when deployed on Replit

The application is designed to be easily deployable on platforms like Replit while maintaining compatibility with traditional hosting environments.