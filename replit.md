# Application Architecture Overview

## Overview

This is a full-stack web application built for MM Packaging to handle work-from-home job applications. The system consists of a React frontend with TypeScript, an Express.js backend, and PostgreSQL database integration using Drizzle ORM. The application features a modern UI built with shadcn/ui components and Tailwind CSS.

## Recent Changes

**August 5, 2025**: Implemented dynamic agreement letter system with 5 configurable fields through Telegram bot. Added complete agreement data management API with GET/POST endpoints (/api/agreement-data) for real-time updates. Created comprehensive Telegram bot commands (/agreement_settings, /set_name, /set_email, /set_target, /set_requirement) allowing remote management of contractor name, communication email, weekly package targets, and requirements. Agreement letter now fetches dynamic data on load, displaying updated information immediately. Enhanced bot help and interactive menu with agreement settings option. All 5 key fields (contractor name, email, package targets, requirements, signature name) are now manageable through bot without code changes.

**July 30, 2025**: Successfully completed migration from Replit Agent to standard Replit environment. Fixed critical form submission issue by implementing missing `/api/applications` POST endpoint with complete file upload support, form validation, and Telegram notifications. Removed duplicate route definitions, configured proper multer middleware for ID document uploads, and verified full application functionality including form submissions, file uploads, and database operations. All core features now working properly in standard Replit environment. Form submissions now create applications successfully (verified with test application ID QSRVZ35) and all API endpoints functioning correctly.

**July 29, 2025**: Successfully completed migration from Replit Agent to standard Replit environment. Fixed TypeScript errors in Telegram bot routes, verified all components working properly, and confirmed production deployment on Render with active Telegram integration. Added intelligent auto cache clearing functionality and comprehensive data clearing system with Telegram integration for complete history and application statistics removal. Completed comprehensive code cleanup removing duplicate LoadingOverlay component, fixed incorrect function calls, improved TypeScript typing, and removed all dead code throughout the codebase for improved performance and maintainability. Implemented 5-minute security timeout for AGL access codes and added manual submit button for agreement signatures. Fixed AGL access system and enhanced Telegram bot with interactive buttons (/start, /stats, /help, callback handlers) - confirmed working on Render deployment.

**July 29, 2025 - Migration Completion**: Completed full migration from Replit Agent to standard Replit environment. Fixed all TypeScript compilation errors, improved Telegram bot implementation with enhanced command support (/start, /generate_agl_code, /stats, /help), resolved AGL access code generation issues, and verified complete application functionality. Updated code storage system to use proper Map iteration methods for TypeScript compatibility.

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

### Cache Management System
- Intelligent auto cache clearing (every 30 minutes)
- Idle cleanup when user inactive for 10+ minutes
- Memory threshold monitoring and cleanup
- Selective storage clearing (preserves user data)
- Browser cache management via Service Worker

### Dynamic Agreement Management System
- 5 configurable agreement fields managed through Telegram bot
- Real-time updates without application restart required
- API endpoints for fetching and updating agreement data
- Secure bot command authentication with chat ID verification
- Fields: contractor name, communication email, weekly package target, weekly requirement, signature name
- Interactive bot menu with agreement settings panel

### Data Management System
- Complete application data clearing via Telegram bot
- Uploaded file removal (ID documents, resumes)
- Statistics and history reset functionality
- Telegram command `/clear_all` with confirmation
- Admin panel clear buttons for selective deletion
- Complete system reset capability

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