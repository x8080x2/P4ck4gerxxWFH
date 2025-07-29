
interface AccessCode {
  code: string;
  createdAt: Date;
  used: boolean;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  attempts: number;
  lastActivity: Date;
}

const accessCodes = new Map<string, AccessCode>();
const rateLimitMap = new Map<string, { attempts: number; lastAttempt: Date }>();

export const codeStorage = {
  generateCode(ipAddress?: string, userAgent?: string): string {
    // Use cryptographically secure random generation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) { // Increased from 6 to 8 characters
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // Reduced from 24 to 2 hours
    
    accessCodes.set(code, {
      code,
      createdAt: new Date(),
      used: false,
      expiresAt,
      ipAddress,
      userAgent,
      attempts: 0,
      lastActivity: new Date()
    });
    
    return code;
  },

  validateCode(code: string, clientIP?: string): { valid: boolean; reason?: string } {
    const upperCode = code.toUpperCase();
    
    // Rate limiting check
    if (clientIP) {
      const rateLimit = rateLimitMap.get(clientIP);
      const now = new Date();
      
      if (rateLimit) {
        const timeDiff = now.getTime() - rateLimit.lastAttempt.getTime();
        if (timeDiff < 60000 && rateLimit.attempts >= 5) { // 5 attempts per minute
          return { valid: false, reason: 'Rate limit exceeded. Please try again later.' };
        }
        
        if (timeDiff >= 60000) {
          rateLimit.attempts = 1;
        } else {
          rateLimit.attempts++;
        }
        rateLimit.lastAttempt = now;
      } else {
        rateLimitMap.set(clientIP, { attempts: 1, lastAttempt: now });
      }
    }
    
    const accessCode = accessCodes.get(upperCode);
    
    if (!accessCode) {
      return { valid: false, reason: 'Invalid access code' };
    }

    if (accessCode.used) {
      return { valid: false, reason: 'Code has already been used' };
    }

    if (new Date() > accessCode.expiresAt) {
      accessCodes.delete(upperCode);
      return { valid: false, reason: 'Code has expired' };
    }

    // Check for 5-minute inactivity timeout
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (accessCode.lastActivity < fiveMinutesAgo) {
      accessCodes.delete(upperCode);
      return { valid: false, reason: 'Code expired due to inactivity (5 minutes)' };
    }

    // Update last activity
    accessCode.lastActivity = new Date();

    // Increment attempt counter
    accessCode.attempts++;
    
    // Prevent brute force on specific codes
    if (accessCode.attempts > 3) {
      accessCodes.delete(upperCode);
      return { valid: false, reason: 'Too many attempts on this code' };
    }

    // Mark code as used
    accessCode.used = true;
    return { valid: true };
  },

  // Update activity for an active code (for keeping session alive)
  updateActivity(code: string): boolean {
    const upperCode = code.toUpperCase();
    const accessCode = accessCodes.get(upperCode);
    
    if (accessCode && !accessCode.used) {
      accessCode.lastActivity = new Date();
      return true;
    }
    return false;
  },

  cleanExpiredCodes(): void {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    for (const [code, accessCode] of accessCodes) {
      if (now > accessCode.expiresAt || accessCode.lastActivity < fiveMinutesAgo) {
        accessCodes.delete(code);
      }
    }
    
    // Clean old rate limit entries
    for (const [ip, rateLimit] of rateLimitMap) {
      const timeDiff = now.getTime() - rateLimit.lastAttempt.getTime();
      if (timeDiff > 3600000) { // Remove entries older than 1 hour
        rateLimitMap.delete(ip);
      }
    }
  },

  getCodeStats(): { totalCodes: number; activeCodes: number; usedCodes: number } {
    const now = new Date();
    let activeCodes = 0;
    let usedCodes = 0;
    
    for (const [, accessCode] of accessCodes) {
      if (accessCode.used) {
        usedCodes++;
      } else if (now <= accessCode.expiresAt) {
        activeCodes++;
      }
    }
    
    return {
      totalCodes: accessCodes.size,
      activeCodes,
      usedCodes
    };
  }
};

// Clean expired codes every hour
setInterval(() => {
  codeStorage.cleanExpiredCodes();
}, 60 * 60 * 1000);
