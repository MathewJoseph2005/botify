import nodemailer from 'nodemailer';

/**
 * Creates a nodemailer transporter based on email domain detection
 * Detects the SMTP host from the email domain and configures appropriate settings
 * @param {string} email - The sender email address
 * @param {string} appPassword - The app-specific password or account password
 * @returns {object} Configured nodemailer transporter or null if credentials are missing
 */
export function createTransporter(email, appPassword) {
  if (!email || !appPassword) return null;

  const normalizedEmail = String(email).trim();
  const domain = normalizedEmail.split('@')[1]?.toLowerCase();
  const normalizedPassword = domain?.includes('gmail')
    ? String(appPassword).replace(/\s+/g, '')
    : String(appPassword).trim();

  if (!normalizedEmail || !normalizedPassword) return null;

  let host = 'smtp.gmail.com';
  let port = 465;
  let secure = true;

  if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
    host = 'smtp-mail.outlook.com';
    port = 587;
    secure = false;
  } else if (domain?.includes('yahoo')) {
    host = 'smtp.mail.yahoo.com';
    port = 465;
    secure = true;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: normalizedEmail,
      pass: normalizedPassword,
    },
  });
}

/**
 * Creates a transporter using system bot credentials from environment variables
 * @returns {object} Configured nodemailer transporter or null if credentials are missing
 */
export function createSystemTransporter() {
  return createTransporter(process.env.BOT_EMAIL, process.env.BOT_PASSWORD);
}
