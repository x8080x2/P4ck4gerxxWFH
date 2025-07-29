
interface AccessCode {
  code: string;
  createdAt: Date;
  used: boolean;
  expiresAt: Date;
}

const accessCodes = new Map<string, AccessCode>();

export const codeStorage = {
  generateCode(): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Code expires in 24 hours
    
    accessCodes.set(code, {
      code,
      createdAt: new Date(),
      used: false,
      expiresAt
    });
    
    return code;
  },

  validateCode(code: string): boolean {
    const accessCode = accessCodes.get(code.toUpperCase());
    
    if (!accessCode) {
      return false;
    }

    if (accessCode.used) {
      return false;
    }

    if (new Date() > accessCode.expiresAt) {
      accessCodes.delete(code.toUpperCase());
      return false;
    }

    // Mark code as used
    accessCode.used = true;
    return true;
  },

  cleanExpiredCodes(): void {
    const now = new Date();
    for (const [code, accessCode] of accessCodes) {
      if (now > accessCode.expiresAt) {
        accessCodes.delete(code);
      }
    }
  }
};

// Clean expired codes every hour
setInterval(() => {
  codeStorage.cleanExpiredCodes();
}, 60 * 60 * 1000);
