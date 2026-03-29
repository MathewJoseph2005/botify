# Manual Entry Feature Guide

## Overview

Both the **Email Bot** and **WhatsApp Bot** pages now support two methods for sending campaigns:
1. **📁 Upload File Mode** - Excel/CSV file with recipient lists
2. **✏️ Manual Entry Mode** - Type in recipients directly

---

## Email Bot - Manual Entry

### How to Use

1. Navigate to **Email Bot Manager** page
2. Create or select a bot
3. Fill in the campaign details:
   - **Subject** - Email subject line
   - **Message Body** - HTML content
4. Click on **✏️ Manual Entry** tab under Recipients section
5. Enter recipients:
   - **Name** - Recipient's name (optional for emails)
   - **Email** - Recipient's email address (required)
6. Click **+ Add Recipient** to add more
7. (Optional) Add attachments
8. (Optional) Set a scheduled time
9. Click **📧 Send Campaign**

### File Format (Alternative)

If using **📁 Upload File** mode:
- Excel/CSV file with columns: `Name`, `Email`
- The system will parse both columns for recipients

### Features

- ✅ Add/remove recipients dynamically
- ✅ Real-time recipient counter
- ✅ Support for up to 10,000+ recipients per campaign
- ✅ Attachments work with both modes
- ✅ Scheduled sending supported
- ✅ Name-based personalization

---

## WhatsApp Bot - Manual Entry

### How to Use

1. Navigate to **WhatsApp Bot Manager** page
2. Create or select a bot
3. Connect WhatsApp by scanning QR code (if not already connected)
4. Fill in the campaign details:
   - **Message Body** - Your WhatsApp message
5. Click on **✏️ Manual Entry** tab under Recipients section
6. Enter recipients:
   - **Name** - Recipient's name (for personalization with {{name}} placeholder)
   - **Phone** - Phone number with country code (e.g., +1234567890)
7. Click **+ Add Recipient** to add more
8. (Optional) Add media attachment
9. (Optional) Set a scheduled time
10. Click **📱 Send Campaign**

### Phone Number Format

**Important:** Include the country code!
- ✅ Correct: `+1 (555) 123-4567`
- ✅ Correct: `+44 20 7946 0958`
- ✅ Correct: `+91 98765 43210`
- ❌ Wrong: `555 123-4567` (missing country code)

### File Format (Alternative)

If using **📁 Upload File** mode:
- Excel/CSV file with columns: `Name`, `Phone` (or `WhatsApp Number`)
- Phone numbers must include country code

### Features

- ✅ Add/remove recipients dynamically
- ✅ Real-time recipient counter
- ✅ {{name}} placeholder for personalization
- ✅ Automatic delays (3-5 seconds) between messages to avoid spam filters
- ✅ Media attachments supported
- ✅ Scheduled sending support

### Example Message with Personalization

```
Hi {{name}}, 

Thanks for your interest! We just launched something amazing.

Check it out: https://example.com/promo

Best regards
```

When sent to John Doe, becomes:
```
Hi John, 

Thanks for your interest! We just launched something amazing.

Check it out: https://example.com/promo

Best regards
```

---

## Comparison: Manual Entry vs File Upload

| Feature | Manual Entry | File Upload |
|---------|-------------|------------|
| Best for | Small lists (1-50) | Large lists (100+) |
| Setup Time | 2-5 min | 1 min |
| Error Checking | Real-time validation | After upload |
| Bulk Paste | ❌ | ✅ (Excel) |
| Quick Testing | ✅ | ⭐ |
| Large Campaigns | ⭐ | ✅ |
| Data Portability | ❌ | ✅ |

---

## Validation Rules

### Email Bot
- ✅ **Name**: Required, any text
- ✅ **Email**: Required, must be valid format (user@domain.com)
- ❌ At least 1 recipient required

### WhatsApp Bot
- ✅ **Name**: Optional (used for {{name}} placeholder)
- ✅ **Phone**: Required, must start with + and country code
- ❌ At least 1 recipient required

---

## Error Messages

### Common Issues

| Error | Solution |
|-------|----------|
| "No valid email addresses" | Check email format (name@example.com) |
| "Phone number format invalid" | Include country code: +1234567890 |
| "Recipient already exists" | Phone/email duplicates are auto-removed |
| "Message body required" | Add your message content |

---

## Tips & Best Practices

### Email Campaigns
1. **Test first** → Send to yourself before bulk sending
2. **Subject line** → Keep under 50 characters for better open rates
3. **Name field** → Improves personalization (use {{name}} in body)
4. **Attachments** → Limit to 10 files, 10MB each total
5. **Scheduling** → Queue campaigns during off-peak hours

### WhatsApp Campaigns
1. **Country Code** → Always include +
2. **Timing** → Send during business hours in recipient's timezone
3. **Message Length** → Keep under 160 characters for reliability
4. **{{name}} placeholder** → Makes messages feel personal
5. **Test Message** → Send to a friend first
6. **Rate Limiting** → System adds 3-5 sec delays to avoid spam filters

---

## Troubleshooting

### Email Issues
- **Emails not sending?** Check BOT_EMAIL and BOT_PASSWORD in .env
- **Attachments fail?** Ensure files exist and are under 10MB each
- **Scheduled delivery?** Set time in future (must be UTC or local timezone)

### WhatsApp Issues
- **"Client not connected"?** Scan QR code first: Go to settings and re-scan
- **"Invalid phone number"?** Country code required (e.g., +1 not 1)
- **Messages delayed?** Normal - 3-5 sec between messages to prevent spam

---

## API Reference

### Manual Entry Payload

**Email Campaign:**
```json
{
  "subject": "Welcome!",
  "messageBody": "<p>Hello {{name}}</p>",
  "manualRecipients": "[{\"name\":\"John\",\"email\":\"john@example.com\"}]",
  "scheduledTime": "2026-03-30T10:00:00Z"
}
```

**WhatsApp Campaign:**
```json
{
  "messageBody": "Hi {{name}}, welcome!",
  "campaignName": "Welcome Campaign",
  "manualRecipients": "[{\"name\":\"John\",\"phone\":\"+1234567890\"}]",
  "scheduledTime": "2026-03-30T10:00:00Z"
}
```

---

## Questions?

For issues or feature requests, check:
1. Campaign History section for delivery status
2. Console logs for API errors
3. Backend logs for real-time campaign progress
