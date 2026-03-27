// ---------------------------------------------------------------------------
// WhatsApp Controller – manages the whatsapp-web.js Client lifecycle
// ---------------------------------------------------------------------------
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';

class WhatsAppController {
  constructor() {
    this.client = null;
    this.qrCodeDataUrl = null;
    this.isReady = false;
    this.isInitializing = false;
    this.statusMessage = 'Not initialized';
    this.initStep = ''; // granular step for frontend UX
  }

  // ── Initialize the WhatsApp Web client ──────────────────────────────────
  initialize() {
    if (this.isInitializing || this.isReady) {
      return;
    }

    this.isInitializing = true;
    this.initStep = 'launching';
    this.statusMessage = 'Launching browser…';

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-zygote',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-timer-throttling',
        ],
      },
    });

    // ── QR Event ────────────────────────────────────────────────────────
    this.client.on('qr', async (qr) => {
      console.log('[WhatsApp] QR code received – scan it to authenticate.');
      this.initStep = 'qr_ready';
      try {
        this.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
      } catch (err) {
        console.error('[WhatsApp] Failed to generate QR data URL:', err);
      }
      this.statusMessage = 'Scan QR code with your phone';
    });

    // ── Loading Screen Event ────────────────────────────────────────────
    this.client.on('loading_screen', (percent) => {
      this.initStep = 'loading_wa';
      this.statusMessage = `Loading WhatsApp… ${percent}%`;
    });

    // ── Ready Event ─────────────────────────────────────────────────────
    this.client.on('ready', () => {
      console.log('[WhatsApp] Client is ready!');
      this.isReady = true;
      this.isInitializing = false;
      this.initStep = 'ready';
      this.qrCodeDataUrl = null;
      this.statusMessage = 'Connected';
    });

    // ── Authenticated Event ─────────────────────────────────────────────
    this.client.on('authenticated', () => {
      console.log('[WhatsApp] Authenticated successfully.');
      this.initStep = 'authenticated';
      this.statusMessage = 'Authenticated – loading chats…';
    });

    // ── Auth Failure Event ──────────────────────────────────────────────
    this.client.on('auth_failure', (msg) => {
      console.error('[WhatsApp] Authentication failure:', msg);
      this.isReady = false;
      this.isInitializing = false;
      this.initStep = 'failed';
      this.statusMessage = 'Auth failed – restart required.';
    });

    // ── Disconnected Event ──────────────────────────────────────────────
    this.client.on('disconnected', (reason) => {
      console.log('[WhatsApp] Disconnected:', reason);
      this.isReady = false;
      this.isInitializing = false;
      this.initStep = '';
      this.qrCodeDataUrl = null;
      this.statusMessage = 'Disconnected';
    });

    this.client.initialize().catch((err) => {
      console.error('[WhatsApp] Initialization error:', err);
      this.isInitializing = false;
      this.initStep = 'failed';
      this.statusMessage = 'Initialization failed.';
    });
  }

  // ── Get current status ──────────────────────────────────────────────────
  getStatus() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      qrCode: this.qrCodeDataUrl,
      status: this.statusMessage,
      initStep: this.initStep,
    };
  }

  // ── Send a single message ───────────────────────────────────────────────
  async sendMessage(phoneNumber, message, mediaPaths = []) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready. Please scan the QR code first.');
    }

    // Normalise number → remove spaces / dashes / plus, ensure @c.us suffix
    const sanitised = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
    const chatId = sanitised.includes('@c.us') ? sanitised : `${sanitised}@c.us`;

    // Check if number is registered on WhatsApp
    const isRegistered = await this.client.isRegisteredUser(chatId);
    if (!isRegistered) {
      throw new Error(`Number ${phoneNumber} is not registered on WhatsApp.`);
    }

    if (mediaPaths && mediaPaths.length > 0) {
      const { MessageMedia } = pkg;
      for (let i = 0; i < mediaPaths.length; i++) {
        try {
          const media = MessageMedia.fromFilePath(mediaPaths[i]);
          const options = (i === 0 && message) ? { caption: message } : {};
          await this.client.sendMessage(chatId, media, options);
        } catch (err) {
          console.error(`[WhatsApp] Failed to load media ${mediaPaths[i]}:`, err.message);
          // Fallback to text message if first media fails
          if (i === 0 && message) {
            await this.client.sendMessage(chatId, message);
          }
        }
      }
    } else {
      if (message) {
        await this.client.sendMessage(chatId, message);
      }
    }
  }

  // ── Destroy the client ──────────────────────────────────────────────────
  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.isInitializing = false;
      this.qrCodeDataUrl = null;
      this.statusMessage = 'Destroyed';
      this.initStep = '';
    }
  }
}

// Export a singleton so every part of the backend shares the same session.
const whatsappController = new WhatsAppController();
export default whatsappController;
