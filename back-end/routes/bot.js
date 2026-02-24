import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import schedule from 'node-schedule';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import verifyToken from '../middleware/auth.js';
import supabase from '../config/database.js';

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
  { name: 'attachment', maxCount: 1 },
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
    const attachmentFile = req.files.attachment?.[0] || null;

    // ---- Parse emails ----
    let emails;
    try {
      emails = parseEmails(excelPath);
    } catch (err) {
      cleanupFile(excelPath);
      if (attachmentFile) cleanupFile(attachmentFile.path);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse the Excel file. Make sure it has an "Email" column.',
      });
    }

    if (emails.length === 0) {
      cleanupFile(excelPath);
      if (attachmentFile) cleanupFile(attachmentFile.path);
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses found in the uploaded file.',
      });
    }

    // ---- Build the mail sending function ----
    const sendCampaign = async () => {
      const transporter = createTransporter(process.env.BOT_EMAIL, process.env.BOT_PASSWORD);

      const mailOptions = {
        from: `${bot.bot_name} <${process.env.BOT_EMAIL}>`,
        subject,
        html: messageBody,
      };

      if (attachmentFile) {
        mailOptions.attachments = [
          {
            filename: attachmentFile.originalname,
            path: attachmentFile.path,
          },
        ];
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
      if (attachmentFile) cleanupFile(attachmentFile.path);

      console.log(`[Email Campaign] Bot: ${bot.bot_name} – sent: ${sent}, failed: ${failed}`);
    };

    // ---- Schedule or send immediately ----
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);

      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        cleanupFile(excelPath);
        if (attachmentFile) cleanupFile(attachmentFile.path);
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be a valid future date.',
        });
      }

      schedule.scheduleJob(scheduledDate, sendCampaign);

      return res.status(200).json({
        success: true,
        message: `Campaign scheduled for ${scheduledDate.toISOString()} to ${emails.length} recipient(s) using bot "${bot.bot_name}".`,
        recipientCount: emails.length,
        scheduledFor: scheduledDate.toISOString(),
        botName: bot.bot_name,
      });
    }

    // Send immediately (run in background, respond right away)
    sendCampaign();

    return res.status(200).json({
      success: true,
      message: `Campaign started with bot "${bot.bot_name}"! Sending to ${emails.length} recipient(s).`,
      recipientCount: emails.length,
      botName: bot.bot_name,
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

export default router;
