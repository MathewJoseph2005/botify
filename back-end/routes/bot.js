import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import schedule from 'node-schedule';
import path from 'path';
import fs from 'fs';
import verifyToken from '../middleware/auth.js';
import supabase from '../config/database.js';
import emailForwardingSupabase from '../config/emailForwardingDatabase.js';
import whatsappController from '../controllers/WhatsAppController.js';
import { createTransporter } from '../utils/emailTransporter.js';
import { google } from 'googleapis';

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer config – store uploads in back-end/uploads/ with unique names
// ---------------------------------------------------------------------------
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'excelFile') {
      const allowedExts = ['.xlsx', '.xls', '.csv'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        return cb(new Error('Only .xlsx, .xls, or .csv files are allowed for the recipient list.'));
      }
    }
    cb(null, true);
  },
});

const uploadFields = upload.fields([
  { name: 'excelFile', maxCount: 1 },
  { name: 'attachment', maxCount: 10 },
]);

// ---------------------------------------------------------------------------
// Helper – parse emails from the uploaded Excel / CSV file
// ---------------------------------------------------------------------------
function parseEmails(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Look for a column named "Email" (case-insensitive)
  const emails = [];
  for (const row of rows) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === 'email');
    if (key && row[key]) {
      const email = String(row[key]).trim();
      if (email) emails.push(email);
    }
  }
  return [...new Set(emails)]; // deduplicate
}

// ---------------------------------------------------------------------------
// Helper – clean up uploaded files after they're no longer needed
// ---------------------------------------------------------------------------
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {}); // fire-and-forget
  }
}

// ---------------------------------------------------------------------------
// GET /api/bot/list
// Retrieve all bots for the authenticated user
// ---------------------------------------------------------------------------
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('bot_id, bot_name, is_active, created_at, updated_at')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      bots: bots || [],
    });
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bots.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/create
// Create a new bot configuration for the user
// ---------------------------------------------------------------------------
router.post('/create', verifyToken, async (req, res) => {
  const { botName } = req.body;

  // Validation
  if (!botName) {
    return res.status(400).json({
      success: false,
      message: 'botName is required.',
    });
  }

  // Validate system credentials are set
  if (!process.env.BOT_EMAIL || !process.env.BOT_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: 'System bot credentials not configured.',
    });
  }

  try {
    // Insert new bot
    const { data: newBot, error: insertError } = await supabase
      .from('bots')
      .insert([
        {
          user_id: req.user.user_id,
          bot_name: botName,
          bot_email: process.env.BOT_EMAIL,
          bot_password: process.env.BOT_PASSWORD,
          is_active: true,
        },
      ])
      .select('bot_id, bot_name, is_active, created_at')
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: 'Bot created successfully.',
      bot: newBot,
    });
  } catch (err) {
    console.error('Error creating bot:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create bot.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/bot/update/:botId
// Update bot configuration (name only, not credentials for security)
// ---------------------------------------------------------------------------
router.put('/update/:botId', verifyToken, async (req, res) => {
  const { botId } = req.params;
  const { botName } = req.body;

  if (!botName) {
    return res.status(400).json({
      success: false,
      message: 'botName is required.',
    });
  }

  try {
    // Verify bot belongs to user
    const { data: bot, error: checkError } = await supabase
      .from('bots')
      .select('bot_id')
      .eq('bot_id', botId)
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found.',
      });
    }

    // Update bot name
    const { data: updatedBot, error: updateError } = await supabase
      .from('bots')
      .update({
        bot_name: botName,
        updated_at: new Date().toISOString(),
      })
      .eq('bot_id', botId)
      .select('bot_id, bot_name, bot_email, is_active, updated_at');

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: 'Bot updated successfully.',
      bot: updatedBot[0],
    });
  } catch (err) {
    console.error('Error updating bot:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update bot.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/bot/delete/:botId
// Delete a bot configuration
// ---------------------------------------------------------------------------
router.delete('/delete/:botId', verifyToken, async (req, res) => {
  const { botId } = req.params;

  try {
    // Verify bot belongs to user
    const { data: bot, error: checkError } = await supabase
      .from('bots')
      .select('bot_id')
      .eq('bot_id', botId)
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found.',
      });
    }

    // Delete bot
    const { error: deleteError } = await supabase
      .from('bots')
      .delete()
      .eq('bot_id', botId);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Bot deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting bot:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bot.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/test-connection/:botId
// Sends a single test email to verify bot credentials work
// ---------------------------------------------------------------------------
router.post('/test-connection/:botId', verifyToken, async (req, res) => {
  const { botId } = req.params;

  try {
    // Fetch bot from database
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('bot_id, bot_name')
      .eq('bot_id', botId)
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (botError && botError.code !== 'PGRST116') throw botError;

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found.',
      });
    }

    const transporter = createTransporter(process.env.BOT_EMAIL, process.env.BOT_PASSWORD);
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: 'System bot credentials are missing or invalid in backend environment.',
      });
    }
    await transporter.verify();

    // Send test email to the user's email
    await transporter.sendMail({
      from: process.env.BOT_EMAIL,
      to: req.user.email,
      subject: `Botify – Test Connection Successful ✅ (${bot.bot_name})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2563eb;">Botify Email Bot</h2>
          <p>Your bot <strong>${bot.bot_name}</strong> is <strong style="color:#16a34a;">working correctly</strong>.</p>
          <p style="color:#6b7280;font-size:14px;">You can now schedule email campaigns from the Botify dashboard.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${req.user.email}!`,
    });
  } catch (error) {
    console.error('Connection test error:', error);
    const errCode = String(error?.code || '');
    const errResponse = String(error?.response || '').toLowerCase();
    const isGmailBadCredentials = errCode === 'EAUTH' && (
      errResponse.includes('5.7.8') ||
      errResponse.includes('badcredentials') ||
      errResponse.includes('username and password not accepted')
    );

    const message = isGmailBadCredentials
      ? 'Gmail rejected authentication. Use a valid Gmail App Password (16 chars, no spaces) for BOT_PASSWORD, then restart backend.'
      : 'Connection failed. Check system bot credentials in backend.';

    res.status(400).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/email-campaign/:botId
// Schedule (or immediately send) a batch email campaign using bot credentials
// ---------------------------------------------------------------------------
router.post('/email-campaign/:botId', verifyToken, uploadFields, async (req, res) => {
  const { botId } = req.params;
  const { subject, messageBody, scheduledTime, manualRecipients } = req.body;

  // ---- Basic Validation ----
  if (!subject || !messageBody) {
    return res.status(400).json({
      success: false,
      message: 'subject and messageBody are required.',
    });
  }

  let emails = [];
  let recipientNames = {};
  let excelPath = null;

  // Check if manual recipients or file upload
  if (manualRecipients) {
    try {
      const recipients = JSON.parse(manualRecipients);
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one recipient is required.',
        });
      }
      
      // Extract emails and store names
      emails = recipients.map(r => r.email).filter(e => e);
      recipients.forEach(r => {
        recipientNames[r.email] = r.name;
      });

      if (emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid email addresses provided.',
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid manual recipients format.',
      });
    }
  } else if (req.files?.excelFile?.[0]) {
    excelPath = req.files.excelFile[0].path;
    
    // Parse emails from file
    try {
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      for (const row of rows) {
        const emailKey = Object.keys(row).find((k) => k.toLowerCase() === 'email');
        const nameKey = Object.keys(row).find((k) => k.toLowerCase() === 'name');
        
        if (emailKey && row[emailKey]) {
          const email = String(row[emailKey]).trim();
          const name = nameKey ? String(row[nameKey]).trim() : '';
          if (email) {
            emails.push(email);
            if (name) recipientNames[email] = name;
          }
        }
      }

      cleanupFile(excelPath);
    } catch (err) {
      cleanupFile(req.files.excelFile[0].path);
      const attachmentFiles = req.files.attachment || [];
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'Failed to parse the Excel file. Make sure it has an "Email" column.',
      });
    }

    if (emails.length === 0) {
      const attachmentFiles = req.files.attachment || [];
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses found in the uploaded file.',
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: 'Either upload a file or provide manual recipients.',
    });
  }

  // Remove duplicates
  emails = [...new Set(emails)];

  try {
    // Fetch bot from database
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('bot_id, bot_name, is_active')
      .eq('bot_id', botId)
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (botError && botError.code !== 'PGRST116') throw botError;

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found.',
      });
    }

    if (!bot.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This bot is not active.',
      });
    }

    const attachmentFiles = req.files.attachment || [];

    // ---- Build the mail sending function ----
    const sendCampaign = async (campaignId) => {
      // Mark campaign as sending
      await supabase
        .from('email_campaigns')
        .update({ status: 'sending', started_at: new Date().toISOString() })
        .eq('id', campaignId);

      const transporter = createTransporter(process.env.BOT_EMAIL, process.env.BOT_PASSWORD);

      const mailOptions = {
        from: `${bot.bot_name} <${process.env.BOT_EMAIL}>`,
        subject,
        html: messageBody,
      };

      if (attachmentFiles.length > 0) {
        mailOptions.attachments = attachmentFiles.map(f => ({
          filename: f.originalname,
          path: f.path,
        }));
      }

      let sent = 0;
      let failed = 0;

      for (const to of emails) {
        try {
          await transporter.sendMail({ ...mailOptions, to });
          sent++;
        } catch {
          failed++;
        }
      }

      // Clean up files after campaign completes
      if (excelPath) cleanupFile(excelPath);
      attachmentFiles.forEach(file => cleanupFile(file.path));

      // Update campaign record with results
      await supabase
        .from('email_campaigns')
        .update({
          sent_count: sent,
          failed_count: failed,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      console.log(`[Email Campaign] Bot: ${bot.bot_name} – sent: ${sent}, failed: ${failed}`);
    };

    // ---- Schedule or send immediately ----
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);

      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        if (excelPath) cleanupFile(excelPath);
        attachmentFiles.forEach(file => cleanupFile(file.path));
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be a valid future date.',
        });
      }

      // Create campaign record for scheduled send
      const { data: campaign, error: campaignErr } = await supabase
        .from('email_campaigns')
        .insert({
          user_id: req.user.user_id,
          bot_id: parseInt(botId),
          bot_name: bot.bot_name,
          subject,
          recipient_count: emails.length,
          status: 'scheduled',
          scheduled_for: scheduledDate.toISOString(),
        })
        .select('id')
        .single();

      if (campaignErr) {
        console.error('Failed to create campaign record:', campaignErr);
      }

      schedule.scheduleJob(scheduledDate, () => sendCampaign(campaign?.id));

      return res.status(200).json({
        success: true,
        message: `Campaign scheduled for ${scheduledDate.toISOString()} to ${emails.length} recipient(s) using bot "${bot.bot_name}".`,
        recipientCount: emails.length,
        scheduledFor: scheduledDate.toISOString(),
        botName: bot.bot_name,
        campaignId: campaign?.id,
      });
    }

    // Create campaign record for immediate send
    const { data: campaign, error: campaignErr } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: req.user.user_id,
        bot_id: parseInt(botId),
        bot_name: bot.bot_name,
        subject,
        recipient_count: emails.length,
        status: 'pending',
      })
      .select('id')
      .single();

    if (campaignErr) {
      console.error('Failed to create campaign record:', campaignErr);
    }

    // Send immediately (run in background, respond right away)
    sendCampaign(campaign?.id);

    return res.status(200).json({
      success: true,
      message: `Campaign started with bot "${bot.bot_name}"! Sending to ${emails.length} recipient(s).`,
      recipientCount: emails.length,
      botName: bot.bot_name,
      campaignId: campaign?.id,
    });
  } catch (err) {
    console.error('Email campaign error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule campaign.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/campaigns
// Retrieve campaign history for the authenticated user
// ---------------------------------------------------------------------------
router.get('/campaigns', verifyToken, async (req, res) => {
  try {
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      campaigns: campaigns || [],
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign history.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/campaigns/:campaignId
// Retrieve a single campaign's details
// ---------------------------------------------------------------------------
router.get('/campaigns/:campaignId', verifyToken, async (req, res) => {
  const { campaignId } = req.params;

  try {
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', req.user.user_id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
    }

    res.status(200).json({
      success: true,
      campaign,
    });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign details.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ===========================================================================
// WHATSAPP CAMPAIGN ROUTES
// ===========================================================================

// Multer config for WhatsApp Excel upload (reuse same upload dir)
const waUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'excelFile') {
      const allowedExts = ['.xlsx', '.xls', '.csv'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        return cb(new Error('Only .xlsx, .xls, or .csv files are allowed for recipient list.'));
      }
    }
    // messageAttachment can be any file type
    cb(null, true);
  },
}).fields([
  { name: 'excelFile', maxCount: 1 },
  { name: 'messageAttachment', maxCount: 1 },
]);

// ---------------------------------------------------------------------------
// Helper – parse name + whatsapp_number from Excel / CSV
// ---------------------------------------------------------------------------
function normalizeHeaderKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizePhoneValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  // Excel sometimes stores numbers with a trailing .0; strip it safely.
  const withoutDecimal = text.replace(/\.0+$/, '');
  const withoutScientific = withoutDecimal.replace(/E\+/gi, 'e+');

  // Convert scientific-notation-like values (for example 9.1987654321e+11).
  if (/^\d+(\.\d+)?e\+\d+$/i.test(withoutScientific)) {
    const numeric = Number(withoutScientific);
    if (Number.isFinite(numeric)) {
      return String(Math.trunc(numeric));
    }
  }

  return withoutScientific.replace(/[^\d]/g, '');
}

function isLikelyPhoneNumber(value) {
  if (!value) return false;
  const digitsOnly = String(value).replace(/\D/g, '');
  // Accept local and international style numbers.
  return digitsOnly.length >= 8 && digitsOnly.length <= 15;
}

function parseWhatsAppRecipients(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: true,
    blankrows: false,
  });

  const phoneAliases = new Set([
    'whatsappnumber',
    'whatsappno',
    'whatsapp',
    'phone',
    'phonenumber',
    'mobile',
    'mobilenumber',
    'number',
    'contact',
    'contactnumber',
    'recipient',
  ]);
  const nameAliases = new Set(['name', 'fullname', 'customername', 'recipientname']);

  const recipients = [];
  for (const row of rows) {
    const entries = Object.entries(row);
    let name = '';
    let phone = '';

    for (const [key, value] of entries) {
      const normalizedKey = normalizeHeaderKey(key);
      const cleanedValue = String(value || '').trim();
      if (!cleanedValue) continue;

      if (!phone) {
        const looksLikePhoneHeader =
          phoneAliases.has(normalizedKey) || /(whatsapp|wa|phone|mobile|contact|number)/.test(normalizedKey);
        if (looksLikePhoneHeader) {
          const candidatePhone = normalizePhoneValue(cleanedValue);
          if (isLikelyPhoneNumber(candidatePhone)) {
            phone = candidatePhone;
          }
          continue;
        }
      }

      if (!name) {
        const looksLikeNameHeader = nameAliases.has(normalizedKey) || /name/.test(normalizedKey);
        if (looksLikeNameHeader) {
          name = cleanedValue;
        }
      }
    }

    if (phone && isLikelyPhoneNumber(phone)) {
      recipients.push({ name, phone });
    }
  }

  // Fallback: accept headerless files where first column is phone and second is optional name.
  if (recipients.length === 0) {
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false,
    });

    for (const row of rawRows) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const firstCell = String(row[0] ?? '').trim();
      const candidatePhone = normalizePhoneValue(firstCell);
      if (!isLikelyPhoneNumber(candidatePhone)) continue;

      const secondCell = String(row[1] ?? '').trim();
      recipients.push({
        name: secondCell,
        phone: candidatePhone,
      });
    }
  }

  // Deduplicate by phone while preserving first seen name/value.
  const deduped = new Map();
  for (const recipient of recipients) {
    if (!deduped.has(recipient.phone)) {
      deduped.set(recipient.phone, recipient);
    }
  }

  return [...deduped.values()];
}

// ---------------------------------------------------------------------------
// POST /api/bot/whatsapp/init
// Start the WhatsApp Web client (generates QR code)
// ---------------------------------------------------------------------------
router.post('/whatsapp/init', verifyToken, (_req, res) => {
  try {
    whatsappController.initialize();
    res.status(200).json({
      success: true,
      message: 'WhatsApp client initializing. Fetch /whatsapp/qr for the QR code.',
      ...whatsappController.getStatus(),
    });
  } catch (err) {
    console.error('WhatsApp init error:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize WhatsApp client.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/whatsapp/qr
// Return current QR code data-URL (or ready status)
// ---------------------------------------------------------------------------
router.get('/whatsapp/qr', verifyToken, (_req, res) => {
  const status = whatsappController.getStatus();
  res.status(200).json({ success: true, ...status });
});

// ---------------------------------------------------------------------------
// GET /api/bot/whatsapp/status
// Return client connection status
// ---------------------------------------------------------------------------
router.get('/whatsapp/status', verifyToken, (_req, res) => {
  const status = whatsappController.getStatus();
  res.status(200).json({ success: true, ...status });
});

// ---------------------------------------------------------------------------
// POST /api/bot/whatsapp/logout
// Disconnect & destroy the WhatsApp session
// ---------------------------------------------------------------------------
router.post('/whatsapp/logout', verifyToken, async (_req, res) => {
  try {
    await whatsappController.destroy();
    res.status(200).json({ success: true, message: 'WhatsApp session destroyed.' });
  } catch (err) {
    console.error('WhatsApp logout error:', err);
    res.status(500).json({ success: false, message: 'Failed to destroy WhatsApp session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/whatsapp-campaign
// Accept Excel file + messageBody + attachment, run bulk WhatsApp campaign
// ---------------------------------------------------------------------------
router.post('/whatsapp-campaign', verifyToken, (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { messageBody, campaignName, manualRecipients } = req.body;
  const attachmentFiles = req.files?.attachment || [];

  // ── Validation ────────────────────────────────────────────────────────
  if (!messageBody) {
    if (req.files?.excelFile?.[0]) cleanupFile(req.files.excelFile[0].path);
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({ success: false, message: 'messageBody is required.' });
  }

  let recipients = [];

  // Check if manual recipients or file upload
  if (manualRecipients) {
    try {
      const parsedRecipients = JSON.parse(manualRecipients);
      if (!Array.isArray(parsedRecipients) || parsedRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one recipient is required.',
        });
      }
      
      recipients = parsedRecipients.map(r => ({
        phone: r.phone,
        name: r.name || ''
      })).filter(r => r.phone);

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid phone numbers provided.',
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid manual recipients format.',
      });
    }
  } else if (req.files?.excelFile?.[0]) {
    const excelPath = req.files.excelFile[0].path;

    // ── Parse recipients ──────────────────────────────────────────────
    try {
      recipients = parseWhatsAppRecipients(excelPath);
    } catch (parseErr) {
      cleanupFile(excelPath);
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'Failed to parse the Excel file. Use a column like "whatsapp_number", "phone", or upload a single-column phone list.',
      });
    }

    cleanupFile(excelPath);
  } else {
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({
      success: false,
      message: 'Either upload a file or provide manual recipients.',
    });
  }

  if (recipients.length === 0) {
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({
      success: false,
      message: 'No valid recipients found. Add phone numbers with country code.',
    });
  }

  if (!whatsappController.isReady) {
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({
      success: false,
      message: 'WhatsApp client is not connected. Please scan the QR code first.',
    });
  }

  try {
    // Remove duplicates based on phone
    const phoneSet = new Set();
    recipients = recipients.filter(r => {
      if (phoneSet.has(r.phone)) return false;
      phoneSet.add(r.phone);
      return true;
    });

    // ── Create campaign record ────────────────────────────────────────
    const { data: campaign, error: campaignErr } = await supabase
      .from('whatsapp_campaigns')
      .insert({
        user_id: req.user.user_id,
        campaign_name: campaignName || 'Untitled Campaign',
        message_body: messageBody,
        total_recipients: recipients.length,
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (campaignErr) {
      console.error('Failed to create WhatsApp campaign record:', campaignErr);
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(500).json({ success: false, message: 'Failed to create campaign record.' });
    }

    // Respond immediately – the actual sending happens in the background
    res.status(200).json({
      success: true,
      message: `WhatsApp campaign started! Sending to ${recipients.length} recipient(s).`,
      campaignId: campaign.id,
      totalRecipients: recipients.length,
    });

    // ── Background send loop ──────────────────────────────────────────
    let sent = 0;
    let failed = 0;
    const attachmentPaths = attachmentFiles.map(f => f.path);

    for (const recipient of recipients) {
      try {
        // Replace {{name}} placeholder
        const personalised = messageBody.replace(/\{\{name\}\}/gi, recipient.name || '');
        await whatsappController.sendMessage(recipient.phone, personalised, attachmentPaths);
        sent++;
      } catch (sendErr) {
        console.error(`[WA Campaign] Failed to send to ${recipient.phone}:`, sendErr.message);
        failed++;
      }

      // Update progress in DB periodically (every message)
      await supabase
        .from('whatsapp_campaigns')
        .update({ sent_count: sent, failed_count: failed })
        .eq('id', campaign.id);

      // Random delay 3-5 seconds to avoid spam detection
      const delay = 3000 + Math.random() * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // ── Finalise campaign ───────────────────────────────────────────
    await supabase
      .from('whatsapp_campaigns')
      .update({
        sent_count: sent,
        failed_count: failed,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    attachmentFiles.forEach(file => cleanupFile(file.path));
    console.log(`[WA Campaign] Completed – sent: ${sent}, failed: ${failed}`);
  } catch (err) {
    console.error('WhatsApp campaign error:', err);
    attachmentFiles.forEach(file => cleanupFile(file.path));
    // Campaign may already have been recorded – try to mark it failed
    // (response already sent, so we can't respond here)
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/whatsapp-campaigns
// Retrieve WhatsApp campaign history for the authenticated user
// ---------------------------------------------------------------------------
router.get('/whatsapp-campaigns', verifyToken, async (req, res) => {
  try {
    const { data: campaigns, error } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, campaigns: campaigns || [] });
  } catch (err) {
    console.error('Error fetching WhatsApp campaigns:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp campaign history.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/whatsapp-campaigns/:campaignId
// Retrieve a single WhatsApp campaign's details (for live progress)
// ---------------------------------------------------------------------------
router.get('/whatsapp-campaigns/:campaignId', verifyToken, async (req, res) => {
  const { campaignId } = req.params;

  try {
    const { data: campaign, error } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', req.user.user_id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    res.status(200).json({ success: true, campaign });
  } catch (err) {
    console.error('Error fetching WhatsApp campaign:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign details.' });
  }
});

// ---------------------------------------------------------------------------
// EMAIL FORWARDING BOT ROUTES
// Requires separate Supabase instance configured via:
// - EMAIL_FORWARDING_SUPABASE_URL
// - EMAIL_FORWARDING_SUPABASE_SERVICE_KEY
// ---------------------------------------------------------------------------

// Handler to check Email Forwarding Supabase is configured
const checkEmailForwardingSupabase = (req, res, next) => {
  if (!emailForwardingSupabase) {
    return res.status(503).json({
      success: false,
      message: 'Email Forwarding feature is not configured. Please contact administrator.',
    });
  }
  next();
};

// GET - List all email forwarding configurations for the user
router.get('/email-forwarding', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { data: configs, error } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.status(200).json({ success: true, configs: configs || [] });
  } catch (err) {
    console.error('Error fetching email forwarding configs:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch configurations.' });
  }
});

// POST - Create a new email forwarding configuration
router.post('/email-forwarding', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { name, description, email, password, forward_label, recipient_emails, enabled } = req.body;

    // Trim all string fields to prevent issues with spaces
    const trimmedName = name ? name.trim() : null;
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPassword = password ? password.trim() : null;
    const trimmedLabel = forward_label ? forward_label.trim() : 'forward';

    // Validation
    if (!trimmedName || !trimmedEmail || !trimmedPassword || !recipient_emails || !Array.isArray(recipient_emails)) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const { data: config, error: insertError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .insert([{
        user_id: req.user.user_id,
        name: trimmedName,
        description: description ? description.trim() : null,
        email: trimmedEmail,
        password: trimmedPassword, // In production, encrypt this!
        forward_label: trimmedLabel,
        recipient_emails: recipient_emails.map(e => e.trim()),
        enabled: enabled !== false,
        emails_checked: 0,
        emails_forwarded: 0,
      }])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({ success: true, config, message: 'Email forwarding config created.' });
  } catch (err) {
    console.error('Error creating email forwarding config:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create configuration.' });
  }
});

// PUT - Update email forwarding configuration
router.put('/email-forwarding/:configId', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { configId } = req.params;
    const { name, description, email, password, forward_label, recipient_emails, enabled } = req.body;

    // Verify ownership
    const { data: config, error: fetchError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .select('id')
      .eq('id', configId)
      .eq('user_id', req.user.user_id)
      .single();

    if (fetchError || !config) {
      return res.status(404).json({ success: false, message: 'Configuration not found.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (email !== undefined) updateData.email = email.trim();
    if (password !== undefined) updateData.password = password.trim();
    if (forward_label !== undefined) updateData.forward_label = forward_label.trim();
    if (recipient_emails !== undefined) {
      updateData.recipient_emails = Array.isArray(recipient_emails) 
        ? recipient_emails.map(e => e.trim()) 
        : [recipient_emails.trim()];
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const { data: updated, error: updateError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .update(updateData)
      .eq('id', configId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({ success: true, config: updated, message: 'Configuration updated.' });
  } catch (err) {
    console.error('Error updating email forwarding config:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update configuration.' });
  }
});

// DELETE - Delete email forwarding configuration
router.delete('/email-forwarding/:configId', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { configId } = req.params;

    // Verify ownership
    const { data: config, error: fetchError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .select('id')
      .eq('id', configId)
      .eq('user_id', req.user.user_id)
      .single();

    if (fetchError || !config) {
      return res.status(404).json({ success: false, message: 'Configuration not found.' });
    }

    const { error: deleteError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .delete()
      .eq('id', configId);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({ success: true, message: 'Configuration deleted.' });
  } catch (err) {
    console.error('Error deleting email forwarding config:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete configuration.' });
  }
});

// POST - Test email forwarding connection
router.post('/email-forwarding/:configId/test', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { configId } = req.params;

    // Fetch config
    const { data: config, error: fetchError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', req.user.user_id)
      .single();

    if (fetchError || !config) {
      return res.status(404).json({ success: false, message: 'Configuration not found.' });
    }

    // Detect if using OAuth token
    const isOAuth = config.password && config.password.startsWith('1//');
    let transporter;

    if (isOAuth) {
      // OAuth2 configuration for SMTP
      const nodemailer = (await import('nodemailer')).default;
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.email,
          clientId: process.env.EMAIL_FORWARDING_CLIENT_ID,
          clientSecret: process.env.EMAIL_FORWARDING_CLIENT_SECRET,
          refreshToken: config.password
        }
      });
    } else {
      // Regular password authentication
      transporter = createTransporter(config.email, config.password);
    }

    await transporter.verify();

    res.status(200).json({ success: true, message: 'Email connection verified successfully!' });
  } catch (err) {
    console.error('Error testing email forwarding connection:', err.message);
    res.status(400).json({ success: false, message: `Connection test failed: ${err.message}` });
  }
});

// ---------------------------------------------------------------------------
// EMAIL FORWARDING DIAGNOSTICS
// ---------------------------------------------------------------------------

// POST - Test OAuth Token Generation (Diagnostic Endpoint)
router.post('/email-forwarding/test-oauth-token', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { configId } = req.body;

    if (!configId) {
      return res.status(400).json({ success: false, message: 'Configuration ID required.' });
    }

    // Fetch config
    const { data: config, error: fetchError } = await emailForwardingSupabase
      .from('email_forwarding_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', req.user.user_id)
      .single();

    if (fetchError || !config) {
      return res.status(404).json({ success: false, message: 'Configuration not found.' });
    }

    if (!config.password || !config.password.startsWith('1//')) {
      return res.status(400).json({ success: false, message: 'Configuration is not using OAuth.' });
    }

    // Test OAuth credentials
    if (!process.env.EMAIL_FORWARDING_CLIENT_ID || !process.env.EMAIL_FORWARDING_CLIENT_SECRET) {
      return res.status(500).json({ 
        success: false, 
        message: 'Email Forwarding OAuth credentials not configured on server.' 
      });
    }

    // Try to generate access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.EMAIL_FORWARDING_CLIENT_ID,
      process.env.EMAIL_FORWARDING_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({ refresh_token: config.password });
    const result = await oauth2Client.getAccessToken();
    
    if (result.token) {
      res.status(200).json({ 
        success: true, 
        message: 'OAuth token generated successfully!',
        details: {
          email: config.email,
          tokenLength: result.token.length,
          expiryDate: result.res?.data?.expiry_date || 'Unknown'
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate access token from refresh token.' 
      });
    }
  } catch (error) {
    console.error('OAuth token test error:', error.message);
    
    let errorMsg = error.message;
    if (error.response?.status === 400) {
      errorMsg = 'Invalid or expired refresh token. Please re-authenticate with Google.';
    } else if (error.message.includes('Invalid refresh token')) {
      errorMsg = 'The refresh token is no longer valid. Please re-authenticate with Google.';
    }
    
    res.status(400).json({ 
      success: false, 
      message: `OAuth token generation failed: ${errorMsg}` 
    });
  }
});

// ---------------------------------------------------------------------------
// GOOGLE OAUTH ROUTES FOR EMAIL FORWARDING
// ---------------------------------------------------------------------------

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.EMAIL_FORWARDING_CLIENT_ID,
    process.env.EMAIL_FORWARDING_CLIENT_SECRET,
    process.env.EMAIL_FORWARDING_REDIRECT_URI || 'http://localhost:5173/email-forwarding'
  );
}

// GET - Generate OAuth Consent URL
router.get('/email-forwarding/oauth/url', verifyToken, (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Necessary to get a refresh token
      prompt: 'consent',      // Forces Google to send a refresh token
      scope: ['https://mail.google.com/'],
    });
    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate OAuth URL.' });
  }
});

// POST - Handle OAuth Callback (Exchange code for tokens)
router.post('/email-forwarding/oauth/callback', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Authorization code missing.' });

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    // tokens.refresh_token is what we need to store in place of the password
    res.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error('OAuth callback exchange error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to exchange OAuth code.' });
  }
});

// GET - Fetch Email Forwarding Logs
router.get('/email-forwarding-logs', verifyToken, checkEmailForwardingSupabase, async (req, res) => {
  try {
    const { data: logs, error } = await emailForwardingSupabase
      .from('email_forwarding_logs')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('forwarded_at', { ascending: false })
      .limit(500);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.status(200).json({ success: true, logs: logs || [] });
  } catch (error) {
    console.error('Error fetching email forwarding logs:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch logs.' });
  }
});

export default router;
