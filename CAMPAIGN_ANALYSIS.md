# Botify Campaign Code Analysis

## Overview
This document provides a detailed analysis of how WhatsApp and email campaigns currently handle files, attachments, and recipients in the Botify codebase.

---

## 1. Email Campaign Implementation

### File Upload & Attachment Handling

**Location:** [back-end/routes/bot.js](back-end/routes/bot.js#L1-L50)

**Multer Configuration:**
```javascript
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
```

**Key Points:**
- **Max File Size:** 10 MB per file
- **Recipient File:** Restricted to `.xlsx`, `.xls`, `.csv` only
- **Attachment File:** Any file type accepted (image, PDF, docs, etc.)
- **Storage:** Uploaded files stored in `back-end/uploads/` directory with unique names (timestamp + random hash)

### Endpoint: POST /api/bot/email-campaign/:botId

**Location:** [back-end/routes/bot.js](back-end/routes/bot.js#L360-L530)

**Request Parameters:**
- `subject` (required) - Email subject line
- `messageBody` (required) - Email HTML content
- `scheduledTime` (optional) - ISO datetime string for scheduled send
- `excelFile` (required) - FormData file upload with recipient list
- `attachment` (optional) - FormData file upload for email attachment

**Recipient Parsing:**
```javascript
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
```

**Current Process:**
1. Validates bot exists and is active
2. Parses Excel file for "Email" column
3. Deduplicates email addresses
4. Creates campaign record in `email_campaigns` table
5. Runs sending loop in background with ForEach loop (no delay between emails by default)
6. Cleans up uploaded files after completion

**Attachment Implementation:**
```javascript
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

// Send to each recipient
for (const to of emails) {
  try {
    await transporter.sendMail({ ...mailOptions, to });
    sent++;
  } catch {
    failed++;
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign started with bot \"Bot Name\"! Sending to 100 recipient(s).",
  "recipientCount": 100,
  "botName": "Bot Name",
  "campaignId": 123
}
```

### Frontend: [front-end/src/pages/EmailBot.jsx](front-end/src/pages/EmailBot.jsx)

**Form Fields:**
- Bot selection dropdown
- Subject text input
- Message Body textarea (HTML supported)
- Recipient List file input (`.xlsx`, `.xls`, `.csv`)
- Attachment file input (optional)
- Scheduled Time datetime picker (optional)

**Form Submission:**
```javascript
const formData = new FormData();
formData.append('subject', subject);
formData.append('messageBody', messageBody);
if (scheduledTime) formData.append('scheduledTime', scheduledTime);
formData.append('excelFile', excelFile);
if (attachment) formData.append('attachment', attachment);

const response = await botAPI.emailCampaign(selectedBotId, formData);
```

**Campaign History Display:** Shows sent count, failed count, status, and created date

---

## 2. WhatsApp Campaign Implementation

### File Upload & Attachment Handling

**Location:** [back-end/routes/bot.js](back-end/routes/bot.js#L645-L670)

**Multer Configuration:**
```javascript
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
```

**Same pattern as email:** 10 MB max, Excel/CSV for recipients, any type for attachments

### Recipient Parsing: parseWhatsAppRecipients()

**Location:** [back-end/routes/bot.js](back-end/routes/bot.js#L678-L770)

**Sophisticated Phone Number & Name Extraction:**
```javascript
function parseWhatsAppRecipients(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: true,
    blankrows: false,
  });

  const phoneAliases = new Set([
    'whatsappnumber', 'whatsappno', 'whatsapp', 'phone', 'phonenumber',
    'mobile', 'mobilenumber', 'number', 'contact', 'contactnumber', 'recipient',
  ]);
  const nameAliases = new Set(['name', 'fullname', 'customername', 'recipientname']);

  // Returns: [{ name: "John Doe", phone: "1234567890" }, ...]
}
```

**Key Features:**
1. **Phone Number Normalization:**
   - Removes spaces, dashes, parentheses, plus signs
   - Converts scientific notation (e.g., `9.1987654321e+11` → `91987654321`)
   - Validates 8-15 digits (international format)

2. **Flexible Column Detection:**
   - Looks for phone columns by multiple aliases
   - Looks for name columns (defaults to empty if not found)
   - Case-insensitive header matching
   - Removes special characters from header validation

3. **Fallback Logic:**
   - If headers not recognized, tries first column as phone, second as name
   - Deduplicates by phone number while preserving first seen name

4. **Return Format:**
```javascript
[
  { name: "John Doe", phone: "1234567890" },
  { name: "Jane Smith", phone: "9876543210" },
  { name: "", phone: "5555555555" }, // no name provided
]
```

### Endpoint: POST /api/bot/whatsapp-campaign

**Location:** [back-end/routes/bot.js](back-end/routes/bot.js#L780-L900)

**Request Parameters:**
- `messageBody` (required) - Message text (supports `{{name}}` personalization)
- `campaignName` (optional) - Campaign identifier
- `excelFile` (required) - FormData file with phone numbers
- `messageAttachment` (optional) - FormData file to send with messages

**Current Process:**
1. Validates WhatsApp client is connected
2. Parses Excel file for phone numbers & names
3. Creates campaign record with status "sending"
4. **Responds immediately to client** (non-blocking)
5. Runs sending loop in background:
   - Personalizes message with recipient name
   - Sends message with or without attachment
   - Applies 3-5 second random delay between sends (spam mitigation)
   - Updates campaign progress in DB after each message
6. Marks campaign as "completed" when done

**Attachment Support:**
```javascript
let attachmentPath = req.files.messageAttachment ? req.files.messageAttachment[0].path : null;

// In send loop:
if (attachmentPath) {
  await whatsappController.sendMessageWithMedia(recipient.phone, personalised, attachmentPath);
} else {
  await whatsappController.sendMessage(recipient.phone, personalised);
}
```

**Response (immediate):**
```json
{
  "success": true,
  "message": "WhatsApp campaign started! Sending to 50 recipient(s).",
  "campaignId": 456,
  "totalRecipients": 50
}
```

### WhatsAppController Attachment Methods

**Location:** [back-end/controllers/WhatsAppController.js](back-end/controllers/WhatsAppController.js)

**Method: sendMessage()**
```javascript
async sendMessage(phoneNumber, message) {
  if (!this.isReady) throw new Error('WhatsApp client is not ready...');
  
  const sanitised = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
  const chatId = sanitised.includes('@c.us') ? sanitised : `${sanitised}@c.us`;
  
  const isRegistered = await this.client.isRegisteredUser(chatId);
  if (!isRegistered) throw new Error(`Number ${phoneNumber} is not registered on WhatsApp.`);
  
  await this.client.sendMessage(chatId, message);
}
```

**Method: sendMessageWithMedia()**
```javascript
async sendMessageWithMedia(phoneNumber, message, filePath) {
  if (!this.isReady) throw new Error('WhatsApp client is not ready...');
  
  const sanitised = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
  const chatId = sanitised.includes('@c.us') ? sanitised : `${sanitised}@c.us`;
  
  const isRegistered = await this.client.isRegisteredUser(chatId);
  if (!isRegistered) throw new Error(`Number ${phoneNumber} is not registered on WhatsApp.`);
  
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  
  const fileName = path.basename(filePath);
  const media = { url: filePath, filename: fileName };
  
  if (message.trim()) {
    await this.client.sendMessage(chatId, message, { media });
  } else {
    await this.client.sendMessage(chatId, media);
  }
}
```

**Key Points:**
- Validates phone number registration on WhatsApp
- Checks file exists before sending
- Sends file as media attachment via whatsapp-web.js
- Supports caption text with media

### Frontend: [front-end/src/pages/WhatsAppCampaign.jsx](front-end/src/pages/WhatsAppCampaign.jsx)

**Form Fields:**
- Campaign Name input
- Message Body textarea with personalization hint (`{{name}}`)
- Recipient List Excel file input
- Message Attachment file input (optional, with file type icons)

**Attachment Selection:**
```javascript
const handleMessageAttachmentSelect = (e) => {
  if (e.target.files[0]) {
    setMessageAttachment(e.target.files[0]);
  }
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗂️';
  if (['mp3', 'wav', 'flac', 'm4a'].includes(ext)) return '🎵';
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return '🎬';
  return '📎';
};
```

**Form Submission:**
```javascript
const formData = new FormData();
formData.append('excelFile', excelFile);
formData.append('messageBody', messageBody);
formData.append('campaignName', campaignName || 'Untitled Campaign');
if (messageAttachment) {
  formData.append('messageAttachment', messageAttachment);
}

const res = await whatsappAPI.sendCampaign(formData);
```

**Campaign Progress Polling:**
- Polls `/api/bot/whatsapp-campaigns/:campaignId` every 2 seconds during send
- Displays sent count, failed count, total recipients, and progress percentage
- Stops polling when campaign status is "completed" or "failed"

---

## 3. Comparative Summary

| Feature | Email | WhatsApp |
|---------|-------|----------|
| **Recipient Column** | `"Email"` (case-insensitive) | Phone aliases (flexible) |
| **Recipient Validation** | Minimal (string check) | 8-15 digit validation, WhatsApp registry check |
| **Attachment Support** | Yes, any file type | Yes, any file type |
| **Personalization** | Not currently used | `{{name}}` replacement |
| **Delay Between Sends** | None (fast loop) | 3-5 seconds random (spam mitigation) |
| **Response Type** | Sync (waits for campaign) | Async (responds immediately) |
| **Scheduling Support** | Yes (node-schedule) | No |

---

## 4. API Endpoints Summary

### Email Campaign Endpoints
- **POST** `/api/bot/email-campaign/:botId` - Send bulk email campaign
- **GET** `/api/bot/campaigns` - List all user's email campaigns
- **GET** `/api/bot/campaigns/:campaignId` - Get single email campaign details

### WhatsApp Campaign Endpoints
- **POST** `/api/bot/whatsapp-campaign` - Send bulk WhatsApp campaign
- **GET** `/api/bot/whatsapp-campaigns` - List all WhatsApp campaigns
- **GET** `/api/bot/whatsapp-campaigns/:campaignId` - Get single campaign details (live progress)

### WhatsApp Connection Endpoints
- **POST** `/api/bot/whatsapp/init` - Initialize WhatsApp client & generate QR
- **GET** `/api/bot/whatsapp/qr` - Get current QR code
- **GET** `/api/bot/whatsapp/status` - Get connection status
- **POST** `/api/bot/whatsapp/logout` - Disconnect & destroy session

---

## 5. Database Schema

### email_campaigns table
```
- id (primary key)
- user_id
- bot_id
- bot_name
- subject
- recipient_count
- sent_count
- failed_count
- status (scheduled, pending, sending, completed)
- scheduled_for (datetime, nullable)
- started_at
- completed_at
- created_at
- updated_at
```

### whatsapp_campaigns table
```
- id (primary key)
- user_id
- campaign_name
- message_body
- total_recipients
- sent_count
- failed_count
- status (sending, completed)
- started_at
- completed_at
- created_at
```

---

## 6. File Handling Best Practices (Current)

**Cleanup:**
- Files cleaned up after campaign completes (both success and failure)
- Uses `cleanupFile()` helper that safely deletes file if exists

**Storage:**
- Temporary files stored in `back-end/uploads/` directory
- Unique names prevent collisions: `${Date.now()}-${Math.random()}-${originalname}`
- Files are NOT persisted after campaign

**Limitations:**
- No resume/retry for failed sends (files deleted immediately)
- No ability to re-run campaign with same attachment (file gone)
- No audit trail of sent attachments

---

## 7. Implementation Notes for Enhancement

### Recipients File Format Currently Supported

**Email:** Excel/CSV with at least one column named "Email" (case-insensitive)
```
Email
john@example.com
jane@example.com
```

**WhatsApp:** Excel/CSV with phone column (flexible name) + optional name column
```
Phone      | Name
1234567890 | John Doe
9876543210 | Jane Smith
5555555555 | (no name)
```

### Attachment File Support

**Both campaigns:** Accept any file type (10 MB max)
- Images (jpg, png, gif, webp)
- Documents (pdf, doc, docx)
- Spreadsheets (xls, xlsx, csv)
- Archives (zip, rar, 7z)
- Media (mp3, mp4, etc.)

---

## 8. Known Gaps / Areas for Improvement

1. **Email Campaign:**
   - No delay between sends (may trigger spam filters)
   - No retry logic for failed emails
   - No support for multiple attachments (only 1)
   - Attachment persistence not tracked
   - No campaign preview before send

2. **WhatsApp Campaign:**
   - No scheduling support (email has this)
   - Limited campaign metadata (no description, etc.)
   - No ability to add caption + file (only one or the other if both provided)
   - File cleanup after campaign may be premature for audit purposes

3. **General:**
   - No file upload progress tracking in UI
   - No validation of file contents before send
   - Limited error messages for malformed recipient files
   - No campaign templates/drafts
