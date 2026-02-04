import { ModerationResult, Message, UserSession } from '../types/index.js';
import { config } from '../config/index.js';

// Pattern-based moderation (fast, synchronous)
const PATTERNS = {
  // Zero tolerance - instant ban
  ZERO_TOLERANCE: {
    patterns: [
      /\b(underage|minor|child|kid|teen|13|14|15|16|17)\b.*\b(nude|naked|sex|porn|cam|pics?|photos?)\b/i,
      /\b(cp|child porn|preteen|lolita|jailbait)\b/i,
      /\b(i am|im|i'm)\s+(\d{1,2})\b.*\b(year old|y\.?o|yo)\b/i,
    ],
    action: 'ban' as const,
    reason: 'Zero tolerance violation detected',
  },
  
  // High severity - instant block
  HIGH_SEVERITY: {
    patterns: [
      /\b(kill|murder|die|death threat|swat)\b/i,
      /\b(dox|doxx|address|ssn|social security)\b/i,
      /\b(rape|molest|abuse)\b/i,
      /\b(sell|buy|drugs|cocaine|heroin|meth)\b/i,
      /\b(scam|fraud|phishing|credit card|cvv)\b/i,
    ],
    action: 'block' as const,
    reason: 'High severity content detected',
  },
  
  // Medium severity - warn then block
  MEDIUM_SEVERITY: {
    patterns: [
      /\b(fuck|shit|bitch|cunt|asshole)\b{2,}/i, // Repeated profanity
      /\b(hate|kill yourself|kys)\b/i,
      /\b(dick|cock|pussy|tits?|boobs?)\b{2,}/i,
      /\b(retard|fag|nigger|chink)\b/i,
    ],
    action: 'warn' as const,
    reason: 'Inappropriate content detected',
  },
  
  // Low severity - soft warning
  LOW_SEVERITY: {
    patterns: [
      /\b(hell|damn|crap)\b/i,
      /\b(stupid|idiot|dumb|loser)\b/i,
    ],
    action: 'warn' as const,
    reason: 'Mild language detected',
  },
  
  // Teen protection (for teen zone)
  TEEN_PROTECTION: {
    patterns: [
      /\b(age|how old|where do you live|phone number|snap|insta|discord)\b/i,
      /\b(meet up|hang out|come over|visit)\b/i,
      /\b(sexy|hot|cute|want you|like you)\b/i,
    ],
    action: 'warn' as const,
    reason: 'Potentially inappropriate for your age',
  },
};

// Personal info detection
const PERSONAL_INFO_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone/SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard)\b/i, // Address
  /\b(snapchat|snap|instagram|ig|insta|discord|kik|whatsapp)[\s:]*@?\w+/i, // Social media
];

export class ModerationService {
  private userWarnings: Map<string, number> = new Map();
  private userBlocks: Map<string, number> = new Map();
  
  async moderateMessage(
    content: string,
    userId: string,
    session: UserSession
  ): Promise<ModerationResult> {
    const lowerContent = content.toLowerCase().trim();
    
    // Check zero tolerance first
    for (const pattern of PATTERNS.ZERO_TOLERANCE.patterns) {
      if (pattern.test(lowerContent)) {
        await this.banUser(userId, PATTERNS.ZERO_TOLERANCE.reason);
        return {
          allowed: false,
          severity: 'high',
          action: 'ban',
          reason: PATTERNS.ZERO_TOLERANCE.reason,
          flaggedWords: this.extractFlaggedWords(content, [pattern]),
        };
      }
    }
    
    // Check teen protection for teen zone
    if (session.ageCategory === 'teen') {
      for (const pattern of PATTERNS.TEEN_PROTECTION.patterns) {
        if (pattern.test(lowerContent)) {
          return this.handleWarning(userId, 'medium', 'Please be careful sharing personal information');
        }
      }
    }
    
    // Check high severity
    for (const pattern of PATTERNS.HIGH_SEVERITY.patterns) {
      if (pattern.test(lowerContent)) {
        return {
          allowed: false,
          severity: 'high',
          action: 'block',
          reason: PATTERNS.HIGH_SEVERITY.reason,
          flaggedWords: this.extractFlaggedWords(content, [pattern]),
        };
      }
    }
    
    // Check personal info
    for (const pattern of PERSONAL_INFO_PATTERNS) {
      if (pattern.test(content)) {
        return this.handleWarning(userId, 'medium', 'Please do not share personal information');
      }
    }
    
    // Check medium severity
    for (const pattern of PATTERNS.MEDIUM_SEVERITY.patterns) {
      if (pattern.test(lowerContent)) {
        return this.handleWarning(userId, 'medium', PATTERNS.MEDIUM_SEVERITY.reason);
      }
    }
    
    // Check low severity
    for (const pattern of PATTERNS.LOW_SEVERITY.patterns) {
      if (pattern.test(lowerContent)) {
        return this.handleWarning(userId, 'low', PATTERNS.LOW_SEVERITY.reason);
      }
    }
    
    // Message is clean
    return {
      allowed: true,
      action: 'allow',
    };
  }
  
  private handleWarning(userId: string, severity: 'low' | 'medium' | 'high', reason: string): ModerationResult {
    const currentWarnings = this.userWarnings.get(userId) || 0;
    const newWarnings = currentWarnings + 1;
    this.userWarnings.set(userId, newWarnings);
    
    // Escalate to block after 3 warnings
    if (newWarnings >= 3) {
      this.userBlocks.set(userId, (this.userBlocks.get(userId) || 0) + 1);
      this.userWarnings.delete(userId);
      
      // Ban after 2 blocks
      if (this.userBlocks.get(userId)! >= 2) {
        return {
          allowed: false,
          severity: 'high',
          action: 'ban',
          reason: 'Multiple violations',
        };
      }
      
      return {
        allowed: false,
        severity: 'high',
        action: 'block',
        reason: 'Too many warnings',
      };
    }
    
    return {
      allowed: severity === 'low', // Allow low severity with warning
      severity,
      action: 'warn',
      reason,
    };
  }
  
  private async banUser(userId: string, reason: string): Promise<void> {
    // Implement ban logic - could call Redis, database, etc.
    console.log(`🚫 User banned: ${userId} - ${reason}`);
  }
  
  private extractFlaggedWords(content: string, patterns: RegExp[]): string[] {
    const flagged: string[] = [];
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        flagged.push(...matches);
      }
    }
    return [...new Set(flagged)];
  }
  
  // Reset warnings (called when user starts new chat)
  resetUserWarnings(userId: string): void {
    this.userWarnings.delete(userId);
  }
  
  // Get user moderation stats
  getUserStats(userId: string): { warnings: number; blocks: number } {
    return {
      warnings: this.userWarnings.get(userId) || 0,
      blocks: this.userBlocks.get(userId) || 0,
    };
  }
}

// Singleton instance
export const moderationService = new ModerationService();