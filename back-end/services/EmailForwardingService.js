import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

/**
 * Email Forwarding Service (Database-Driven)
 * 
 * Monitors email accounts for labeled emails and forwards them to designated recipients.
 * All configurations are stored in database per user.
 * Uses IMAP to read emails and SMTP to send them.
 */
class EmailForwardingService {
  constructor() {
    this.isProcessing = false;
    
    // Initialize Supabase client for email forwarding database
    this.supabase = createClient(
      process.env.EMAIL_FORWARDING_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.EMAIL_FORWARDING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('[EmailForwarding] Service initialized');
  }

  /**
   * Start the email forwarding service
   * Runs automatically every 2 minutes
   */
  async start() {
    console.log('[EmailForwarding] ✅ Service started');
    
    // Scan for new emails every 2 minutes
    setInterval(async () => {
      await this.scan();
    }, 2 * 60 * 1000);

    // Initial scan on startup (with 5 second delay)
    setTimeout(() => {
      this.scan();
    }, 5000);
  }

  /**
   * Scan for all enabled configurations and process emails
   */
  async scan() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      console.log(`[EmailForwarding] 🔄 Starting scan at ${new Date().toISOString()}`);
      
      // Fetch all enabled configurations from database
      const { data: configs, error } = await this.supabase
        .from('email_forwarding_configs')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('[EmailForwarding] Error fetching configs:', error.message);
        return;
      }

      if (!configs || configs.length === 0) {
        console.log('[EmailForwarding] No active configurations');
        return;
      }

      console.log(`[EmailForwarding] Found ${configs.length} active configuration(s)`);

      // Process each configuration
      for (const config of configs) {
        try {
          await this.processConfig(config);
        } catch (err) {
          console.error(`[EmailForwarding] Error processing config ${config.id}:`, err.message);
        }
      }

      console.log('[EmailForwarding] ✅ Scan cycle complete');
    } catch (error) {
      console.error('[EmailForwarding] ❌ Scan error:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single configuration
   */
  async processConfig(config) {
    console.log(`[EmailForwarding] Processing config: ${config.name} (ID: ${config.id})`);

    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: this.getImapHost(config.email),
      port: 993,
      tls: true,
      tlsOptions: { 
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connTimeout: 15000,
      authTimeout: 15000,
      keepalive: true,
    });

    return new Promise((resolve, reject) => {
      imap.on('error', (error) => {
        console.error(`[EmailForwarding] IMAP error for ${config.name}:`, error.message);
        reject(error);
      });

      imap.on('end', () => {
        console.log(`[EmailForwarding] Connection closed for ${config.name}`);
        resolve();
      });

      imap.on('ready', async () => {
        try {
          console.log(`[EmailForwarding] Connected to ${config.email}`);
          
          // Get mailboxes to find the forwarding label
          imap.getBoxes((error, boxes) => {
            if (error) {
              console.error(`[EmailForwarding] Error getting mailboxes:`, error.message);
              imap.end();
              reject(error);
              return;
            }

            const allLabels = Object.keys(boxes);
            const labelName = config.forward_label;

            if (!allLabels.includes(labelName)) {
              console.warn(`[EmailForwarding] Label "${labelName}" not found in ${config.email}`);
              console.log(`[EmailForwarding] Available labels: ${allLabels.join(', ')}`);
              imap.end();
              resolve();
              return;
            }

            // Open the forwarding label mailbox
            imap.openBox(labelName, false, async (error, box) => {
              if (error) {
                console.error(`[EmailForwarding] Error opening label:`, error.message);
                imap.end();
                reject(error);
                return;
              }

              try {
                console.log(`[EmailForwarding] Opened label "${labelName}" - searching for emails...`);

                // Search for all emails in label
                this.searchEmails(imap, ['ALL']).then(async (results) => {
                  console.log(`[EmailForwarding] Found ${results.length} email(s) to process`);

                  if (results.length === 0) {
                    imap.end();
                    resolve();
                    return;
                  }

                  // Process each email
                  let forwarded = 0;
                  for (const uid of results) {
                    try {
                      const was_forwarded = await this.forwardEmail(imap, uid, config);
                      if (was_forwarded) forwarded++;
                    } catch (err) {
                      console.error(`[EmailForwarding] Error forwarding email:`, err.message);
                    }
                  }

                  console.log(`[EmailForwarding] ✅ Forwarded ${forwarded}/${results.length} email(s)`);
                  imap.end();
                  resolve();
                }).catch(err => {
                  console.error(`[EmailForwarding] Search error:`, err.message);
                  imap.end();
                  reject(err);
                });
              } catch (err) {
                console.error(`[EmailForwarding] Error processing label:`, err.message);
                imap.end();
                reject(err);
              }
            });
          });
        } catch (error) {
          console.error(`[EmailForwarding] Error in ready handler:`, error.message);
          imap.end();
          reject(error);
        }
      });

      imap.connect();
    });
  }

  /**
   * Fetch and forward a single email
   */
  async forwardEmail(imap, uid, config) {
    return new Promise((resolve, reject) => {
      const f = imap.fetch(uid, { bodies: '' });

      f.on('message', (msg) => {
        let chunks = [];
        
        msg.on('data', (chunk) => {
          chunks.push(chunk);
        });

        msg.on('end', async () => {
          try {
            const { Readable } = await import('stream');
            const stream = Readable.from(chunks);
            
            const parsed = await simpleParser(stream);

            // Parse recipient emails
            const recipients = Array.isArray(config.recipient_emails)
              ? config.recipient_emails
              : config.recipient_emails.split(',').map(e => e.trim());

            // Create transporter for sending
            const transporter = nodemailer.createTransport(
              this.getSmtpConfig(config.email, config.password)
            );

            // Prepare forwarded email
            const mailOptions = {
              from: config.email,
              to: recipients.join(','),
              subject: `[Forwarded] ${parsed.subject || '(no subject)'}`,
              html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                  <p><strong>Originally from:</strong> ${parsed.from?.text || 'unknown'}</p>
                  <p><strong>Date:</strong> ${parsed.date || 'unknown'}</p>
                  <hr style="border: 1px solid #ddd;" />
                  <div style="margin-top: 20px;">
                    ${parsed.html || (parsed.text ? `<pre>${parsed.text}</pre>` : '<p style="color: #999;">(no content)</p>')}
                  </div>
                </div>
              `,
              text: `Originally from: ${parsed.from?.text || 'unknown'}\nDate: ${parsed.date || 'unknown'}\n\n${parsed.text || '(no content)'}`,
            };

            await transporter.sendMail(mailOptions);
            console.log(`[EmailForwarding] ✅ Forwarded "${parsed.subject || '(no subject)'}" to ${recipients.join(', ')}`);

            resolve(true);
          } catch (error) {
            console.error(`[EmailForwarding] Error parsing/forwarding email:`, error.message);
            reject(error);
          }
        });

        msg.on('error', (error) => {
          console.error(`[EmailForwarding] Error reading email stream:`, error.message);
          reject(error);
        });
      });

      f.on('error', (error) => {
        console.error(`[EmailForwarding] Error fetching email:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Search for emails matching query
   */
  searchEmails(imap, query) {
    return new Promise((resolve, reject) => {
      imap.search(query, (error, results) => {
        if (error) reject(error);
        else resolve(results || []);
      });
    });
  }

  /**
   * Get IMAP host based on email provider
   */
  getImapHost(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    
    const hosts = {
      'gmail.com': 'imap.gmail.com',
      'outlook.com': 'imap-mail.outlook.com',
      'hotmail.com': 'imap-mail.outlook.com',
      'yahoo.com': 'imap.mail.yahoo.com',
      'protonmail.com': 'imap.protonmail.com',
    };

    return hosts[domain] || 'imap.gmail.com'; // Default to Gmail
  }

  /**
   * Get SMTP config for email provider
   */
  getSmtpConfig(email, password) {
    const domain = email.split('@')[1]?.toLowerCase();
    const smtpConfigs = {
      'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
      'outlook.com': { host: 'smtp.outlook.com', port: 587, secure: false },
      'hotmail.com': { host: 'smtp.outlook.com', port: 587, secure: false },
      'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
      'protonmail.com': { host: 'smtp.protonmail.com', port: 587, secure: false },
    };

    const config = smtpConfigs[domain] || smtpConfigs['gmail.com'];
    return {
      ...config,
      auth: { user: email, pass: password },
    };
  }
}

// Export singleton instance
export default new EmailForwardingService();
