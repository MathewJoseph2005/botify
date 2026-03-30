/**
 * Global Constants for Botify
 * Centralizes all magic strings, role IDs, and configuration patterns
 */

// ==================== Role IDs ====================
export const ROLE_IDS = {
  ADMIN: 1,
  SELLER: 2,
  BUYER: 3,
};

export const ROLE_NAMES = {
  1: 'admin',
  2: 'seller',
  3: 'buyer',
};

// ==================== Validation Patterns ====================
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
};

// ==================== Email Providers Configuration ====================
// Centralized configuration for all supported email providers
export const EMAIL_PROVIDERS = {
  'gmail.com': {
    imap: 'imap.gmail.com',
    smtp: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  'outlook.com': {
    imap: 'imap-mail.outlook.com',
    smtp: 'smtp.outlook.com',
    port: 587,
    secure: false,
  },
  'hotmail.com': {
    imap: 'imap-mail.outlook.com',
    smtp: 'smtp.outlook.com',
    port: 587,
    secure: false,
  },
  'yahoo.com': {
    imap: 'imap.mail.yahoo.com',
    smtp: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
  },
  'protonmail.com': {
    imap: 'imap.protonmail.com',
    smtp: 'smtp.protonmail.com',
    port: 587,
    secure: false,
  },
};

export const DEFAULT_EMAIL_PROVIDER = EMAIL_PROVIDERS['gmail.com'];

// ==================== Error Messages ====================
export const ERROR_MESSAGES = {
  ROLE_SELLERS_ONLY: 'Only sellers can access this resource.',
  ROLE_BUYERS_ONLY: 'Only buyers can access this resource.',
  ROLE_ADMIN_ONLY: 'Admin access required.',
  INVALID_ROLE: 'Invalid role. Must be seller or buyer.',
  USER_ALREADY_EXISTS: 'User with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  USER_BANNED: 'Your account has been banned. Contact support for assistance.',
  INVALID_TOKEN: 'Invalid or expired token.',
  NO_TOKEN: 'Access denied. No token provided.',
  NOT_FOUND: 'Resource not found.',
  UNAUTHORIZED: 'Unauthorized access.',
};

// ==================== Pagination ====================
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};

// ==================== Email Campaign ====================
export const EMAIL_CAMPAIGN = {
  MAX_RECIPIENTS: 10000,
  BATCH_SIZE: 100,
  TIMEOUT_MS: 30000,
};

// ==================== Telegram Bot ====================
export const TELEGRAM = {
  DEFAULT_CONCURRENCY: 10,
  MAX_CONCURRENCY: 50,
  MIN_CONCURRENCY: 1,
};

// ==================== File Upload ====================
export const FILE_UPLOAD = {
  EXCEL_MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  ATTACHMENT_MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_EXCEL_EXT: ['.xlsx', '.xls', '.csv'],
};

// ==================== JWT ====================
export const JWT = {
  EXPIRY: '7d',
};

// ==================== Cache TTL (milliseconds) ====================
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
};

// ==================== Email Forwarding ====================
export const EMAIL_FORWARDING = {
  SCAN_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes
  MAX_CONCURRENT_SCANS: 5,
  IMAP_TIMEOUT_MS: 15000,
  BATCH_STATS_UPDATE_SIZE: 50, // Update stats every 50 emails
};
