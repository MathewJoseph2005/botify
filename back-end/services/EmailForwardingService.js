import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

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

    const isGoogleOAuth = config.password && config.password.startsWith('1//');
    let imapConfig = {
      user: config.email,
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
    };

    if (isGoogleOAuth) {
      try {
        imapConfig.xoauth2 = await this.generateXOAuth2Token(config.email, config.password);
      } catch (err) {
        console.error(`[EmailForwarding] Failed to generate OAuth token for IMAP.`, err.message);
        return;
      }
    } else {
      imapConfig.password = config.password;
    }

    const imap = new Imap(imapConfig);

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
                  
                  // Update emails checked
                  const { error: rpcError } = await this.supabase.rpc('increment_emails_checked', { _config_id: config.id, _count: results.length });
                  if (rpcError) {
                    // Fallback to update if RPC not defined
                    const { data } = await this.supabase.from('email_forwarding_configs')
                      .select('emails_checked')
                      .eq('id', config.id)
                      .single();
                    if (data) {
                      await this.supabase.from('email_forwarding_configs')
                        .update({ emails_checked: data.emails_checked + results.length, last_check_at: new Date().toISOString() })
                        .eq('id', config.id);
                    }
                  }

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
        
        msg.on('body', (stream, info) => {
          stream.on('data', (chunk) => {
            chunks.push(chunk);
          });
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

            // Update stats
            const { data: statsData } = await this.supabase.from('email_forwarding_configs')
                 .select('emails_forwarded')
                 .eq('id', config.id)
                 .single();
            if (statsData) {
               await this.supabase.from('email_forwarding_configs')
                 .update({ emails_forwarded: statsData.emails_forwarded + 1 })
                 .eq('id', config.id);
            }

            // Log Success
            await this.logEmailAction(config, parsed, recipients.length, 'success');

            resolve(true);
          } catch (error) {
            console.error(`[EmailForwarding] Error parsing/forwarding email:`, error.message);
            // Ignore error reporting for stream chunks dropping, but log standard errors
            try { await this.logEmailAction(config, { subject: 'Unknown', from: { text: 'Unknown' } }, 0, 'failed', error.message); } catch(e){}
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
    const isGoogleOAuth = password && password.startsWith('1//');

    if (isGoogleOAuth) {
      return {
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: email,
          clientId: process.env.EMAIL_FORWARDING_CLIENT_ID,
          clientSecret: process.env.EMAIL_FORWARDING_CLIENT_SECRET,
          refreshToken: password
        }
      };
    }

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

  /**
   * Generates an XOAUTH2 token buffer string for Node-IMAP
   */
  async generateXOAuth2Token(email, refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.EMAIL_FORWARDING_CLIENT_ID,
      process.env.EMAIL_FORWARDING_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();

    return Buffer.from([
      `user=${email}`,
      `auth=Bearer ${token}`,
      '',
      ''
    ].join('\x01'), 'utf-8').toString('base64');
  }

  /**
   * Logs a single forwarded email attempt
   */
  async logEmailAction(config, parsed, recipientCount, status, errorMessage = null) {
    await this.supabase.from('email_forwarding_logs').insert([{
      config_id: config.id,
      user_id: config.user_id,
      email_from: parsed.from?.text || 'unknown',
      email_subject: parsed.subject || '(no subject)',
      recipients_count: recipientCount,
      status: status,
      error_message: errorMessage
    }]);
  }
}

// Export singleton instance
export default new EmailForwardingService();
