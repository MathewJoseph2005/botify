import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import schedule from 'node-schedule';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import verifyToken from '../middleware/auth.js';
import supabase from '../config/database.js';
import whatsappController from '../controllers/WhatsAppController.js';

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
// Helper – create a nodemailer transporter from user-supplied credentials
// ---------------------------------------------------------------------------
function createTransporter(senderEmail, appPassword) {
  // Detect the SMTP host from the sender email domain
  const domain = senderEmail.split('@')[1]?.toLowerCase();
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
      user: senderEmail,
      pass: appPassword, // app-specific password
    },
  });
}

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

    // Add system email to each bot
    const botsWithEmail = bots.map(bot => ({
      ...bot,
      bot_email: process.env.BOT_EMAIL
    }));

    res.status(200).json({
      success: true,
      bots: botsWithEmail || [],
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
      .select('bot_id, bot_name, is_active, created_at');

    if (insertError) throw insertError;

    // Add system email to response
    const botWithEmail = {
      ...newBot[0],
      bot_email: process.env.BOT_EMAIL
    };

    res.status(201).json({
      success: true,
      message: 'Bot created successfully.',
      bot: botWithEmail,
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
    res.status(400).json({
      success: false,
      message: 'Connection failed. Check system bot credentials in backend.',
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
  const { subject, messageBody, scheduledTime } = req.body;

  // ---- Basic Validation ----
  if (!subject || !messageBody) {
    return res.status(400).json({
      success: false,
      message: 'subject and messageBody are required.',
    });
  }

  if (!req.files?.excelFile?.[0]) {
    return res.status(400).json({
      success: false,
      message: 'An Excel/CSV file with recipient emails is required.',
    });
  }

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

    const excelPath = req.files.excelFile[0].path;
    const attachmentFiles = req.files.attachment || [];

    // ---- Parse emails ----
    let emails;
    try {
      emails = parseEmails(excelPath);
    } catch (err) {
      cleanupFile(excelPath);
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'Failed to parse the Excel file. Make sure it has an "Email" column.',
      });
    }

    if (emails.length === 0) {
      cleanupFile(excelPath);
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses found in the uploaded file.',
      });
    }

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
      cleanupFile(excelPath);
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
        cleanupFile(excelPath);
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
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Only .xlsx, .xls, or .csv files are allowed.'));
    }
    cb(null, true);
  },
}).single('excelFile');

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
  const { messageBody, campaignName } = req.body;
  const attachmentFiles = req.files?.attachment || [];

  // ── Validation ────────────────────────────────────────────────────────
  if (!messageBody) {
    if (req.files?.excelFile?.[0]) cleanupFile(req.files.excelFile[0].path);
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({ success: false, message: 'messageBody is required.' });
  }

  if (!req.files || !req.files.excelFile || !req.files.excelFile[0]) {
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({
      success: false,
      message: 'An Excel/CSV file with recipient data is required.',
    });
  }

  const excelPath = req.files.excelFile[0].path;
  const attachmentPaths = attachmentFiles.map(f => f.path);

  if (!whatsappController.isReady) {
    cleanupFile(excelPath);
    attachmentFiles.forEach(file => cleanupFile(file.path));
    return res.status(400).json({
      success: false,
      message: 'WhatsApp client is not connected. Please scan the QR code first.',
    });
  }

  try {
    // ── Parse recipients ──────────────────────────────────────────────
    let recipients;
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

    if (recipients.length === 0) {
      cleanupFile(excelPath);
      attachmentFiles.forEach(file => cleanupFile(file.path));
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found. Add phone numbers with 8-15 digits (with country code) in a phone/whatsapp column or first column.',
      });
    }

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
      cleanupFile(excelPath);
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

    cleanupFile(excelPath);
    attachmentFiles.forEach(file => cleanupFile(file.path));
    console.log(`[WA Campaign] Completed – sent: ${sent}, failed: ${failed}`);
  } catch (err) {
    console.error('WhatsApp campaign error:', err);
    cleanupFile(excelPath);
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

export default router;
