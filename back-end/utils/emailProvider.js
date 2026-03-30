/**
 * Email Provider Configuration Utility
 * Centralizes IMAP/SMTP configuration for all email providers
 */

import { EMAIL_PROVIDERS, DEFAULT_EMAIL_PROVIDER } from './constants.js';

/**
 * Get provider config by email domain
 * @param {string} email - Email address
 * @returns {Object} Provider configuration
 */
export function getProviderConfig(email) {
  if (!email) return DEFAULT_EMAIL_PROVIDER;

  const domain = email.split('@')[1]?.toLowerCase();
  return EMAIL_PROVIDERS[domain] || DEFAULT_EMAIL_PROVIDER;
}

/**
 * Get IMAP configuration for email
 * @param {string} email - Email address
 * @param {string} password - Email password or OAuth token
 * @returns {Object} IMAP configuration
 */
export function getImapConfig(email, password) {
  const provider = getProviderConfig(email);
  const isGoogleOAuth = password?.startsWith('1//');

  const baseConfig = {
    user: email,
    host: provider.imap,
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connTimeout: 15000,
    authTimeout: 15000,
    keepalive: true,
  };

  if (isGoogleOAuth) {
    // OAuth token will be added separately via generateXOAuth2Token
    return baseConfig;
  }

  return {
    ...baseConfig,
    password,
  };
}

/**
 * Get SMTP configuration for email
 * @param {string} email - Email address
 * @param {string} password - Email password
 * @returns {Object} SMTP configuration
 */
export function getSmtpConfig(email, password) {
  const provider = getProviderConfig(email);

  return {
    host: provider.smtp,
    port: provider.port,
    secure: provider.secure,
    auth: {
      user: email,
      pass: password,
    },
  };
}

/**
 * Get OAuth2 SMTP configuration
 * @param {string} email - Email address
 * @param {string} clientId - OAuth client ID
 * @param {string} clientSecret - OAuth client secret
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Object} OAuth2 SMTP configuration
 */
export function getOAuth2SmtpConfig(email, clientId, clientSecret, refreshToken) {
  return {
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: email,
      clientId,
      clientSecret,
      refreshToken,
    },
  };
}

/**
 * Check if email uses OAuth
 * @param {string} password - Password or refresh token
 * @returns {boolean} True if OAuth token
 */
export function isOAuthToken(password) {
  return password?.startsWith('1//') || password?.startsWith('ya29.');
}

/**
 * Get provider name for display
 * @param {string} email - Email address
 * @returns {string} Provider name
 */
export function getProviderName(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  const names = {
    'gmail.com': 'Gmail',
    'outlook.com': 'Outlook',
    'hotmail.com': 'Hotmail',
    'yahoo.com': 'Yahoo',
    'protonmail.com': 'ProtonMail',
  };
  return names[domain] || domain || 'Unknown';
}

export default {
  getProviderConfig,
  getImapConfig,
  getSmtpConfig,
  getOAuth2SmtpConfig,
  isOAuthToken,
  getProviderName,
};
