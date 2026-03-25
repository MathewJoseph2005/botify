# Botify Workspace Instructions

## Project Overview

**Botify** is a full-stack **multi-messaging bot marketplace platform** where users can buy, sell, and manage bots across multiple messaging platforms (WhatsApp, Telegram, Discord, Email, etc.).

**Current Phase**: Phase 1
- User authentication (signup/login/password reset)
- Role-based access control (Admin, Seller, Buyer)
- Dashboard interfaces for all user roles
- Email bot creation and campaigns
- WhatsApp bot integration
- Marketplace for buying/selling bots

**Documentation**: See [README.md](../../README.md), [SETUP_GUIDE.md](../../SETUP_GUIDE.md), and [QUICK_REFERENCE.md](../../QUICK_REFERENCE.md) for detailed setup and architecture.

---

## Tech Stack

### Frontend
- **React** 19 with **Vite** (bundler)
- **Tailwind CSS** (styling)
- **React Router DOM** v6 (routing)
- **Axios** (HTTP client)
- Token stored in `localStorage`; routes protected by `PrivateRoute` component with role checking

### Backend
- **Node.js** (ESM modules: `"type": "module"` in package.json)
- **Express.js** (framework)
- **Supabase** (PostgreSQL database + auth vectors)
- **JWT** (authentication via `jsonwebtoken`)
- **bcryptjs** (password hashing from signup/login)
- **Telegraf** (Telegram bot SDK)
- **whatsapp-web.js** (WhatsApp client with LocalAuth at `.wwebjs_auth/`)
- **Nodemailer** (email delivery)

### Database (Supabase PostgreSQL)
- **Users** table with `role_id` foreign key
- **Roles** table: 1=Admin, 2=Seller, 3=Buyer
- **Bots** table (stores bot metadata, bot_password, etc.)
- **Marketplace_bots** table (seller listings)
- **Purchases** table (buyer transactions)
- **Email_campaigns**, **whatsapp_campaigns**, **password_reset_tokens** (feature-specific tables)

---

## Project Structure

```
botify/
├── .github/
│   └── copilot-instructions.md    ← This file
│
├── back-end/                      Express server
│   ├── config/
│   │   ├── database.js           Supabase client init
│   │   ├── db-init.sql           (Legacy: PostgreSQL local setup)
│   │   └── *-migration.sql       Feature-specific schema migrations
│   ├── middleware/
│   │   └── auth.js               JWT verification + role checking
│   ├── routes/
│   │   ├── auth.js               Signup/login/verify/password-reset
│   │   ├── bot.js                Email bots + campaigns, WhatsApp lifecycle
│   │   └── marketplace.js        Seller/buyer botops (CRUD, purchase)
│   ├── controllers/
│   │   └── WhatsAppController.js WhatsApp QR session singleton
│   ├── services/
│   │   └── telegramBotFactory.js Telegram bot creation
│   ├── server.js                 Express app entry
│   ├── package.json
│   └── .env.example              (Copy to .env, edit with credentials)
│
├── front-end/                    React + Vite
│   ├── src/
│   │   ├── components/           Reusable UI (BotTable, Modal, etc.)
│   │   ├── pages/                Route pages (LoginPage, DashboardPages, etc.)
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── SellerDashboard.jsx
│   │   │   ├── BuyerDashboard.jsx
│   │   │   ├── EmailBot.jsx      Email bot creation
│   │   │   ├── WhatsAppCampaign.jsx
│   │   │   └── Marketplace.jsx
│   │   ├── context/              Global state (AuthContext)
│   │   ├── utils/                Helpers (api.js for Axios)
│   │   ├── App.jsx               Route definitions
│   │   └── main.jsx              Entry point
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── QUICK_REFERENCE.md            Commands + API endpoints
├── SETUP_GUIDE.md                Detailed first-time setup
└── README.md                      Project overview
```

---

## Development Workflow

### Build & Run Commands

**Backend** (from `back-end/` directory):
```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev    # Uses nodemon + server.js

# Production
npm start      # Node server.js
```

**Frontend** (from `front-end/` directory):
```bash
# Install dependencies
npm install

# Development with HMR
npm run dev    # Vite dev server on http://localhost:3000

# Build for production
npm run build  # Outputs to dist/

# Preview production build
npm run preview
```

**Full-Stack (recommended)**:
1. Open terminal 1: `cd back-end && npm run dev`  → Backend at http://localhost:5000
2. Open terminal 2: `cd front-end && npm run dev` → Frontend at http://localhost:3000

### Environment Setup (Backend)

Copy `.env.example` to `.env` and configure:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=botify
DB_USER=postgres
DB_PASSWORD=<your_password>
JWT_SECRET=<strong_random_secret_key>
NODE_ENV=development

# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJobXV0Lm...

# Optional: Email, Telegram, etc.
NODEMAILER_EMAIL=...
NODEMAILER_PASSWORD=...
TELEGRAM_BOT_TOKEN=...
```

---

## Key Conventions

### Authentication & Authorization

1. **Password Reset Flow**:
   - User requests reset via `/api/auth/password-reset`
   - Backend creates `password_reset_tokens` record with expiry
   - Frontend navigates to `/reset-password?token=...`
   - User submits new password to `/api/auth/reset-password`

2. **JWT Token Handling**:
   - Backend issues JWT on successful login
   - Frontend stores token in `localStorage`
   - Axios intercepts requests to attach `Authorization: Bearer <token>` header
   - `PrivateRoute` component checks token validity before rendering

3. **Role-Based Access**:
   - Routes protected by `role_id` in JWT payload
   - Admin=1, Seller=2, Buyer=3
   - Middleware `auth.js` enforces role requirements
   - Frontend `PrivateRoute` redirects to `Unauthorized` page if role insufficient

### API Conventions

- **Base URL**: `http://localhost:5000/api` (backend)
- **Request headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Response format**:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Action successful"
  }
  ```
- **Error format**:
  ```json
  {
    "success": false,
    "error": "Description of what went wrong",
    "statusCode": 400
  }
  ```

### Frontend Component Patterns

1. **Context for Global State**: Auth state lives in `AuthContext.jsx`
   - `useAuth()` hook provides `user`, `login()`, `logout()`, `signup()`
   - Token stored/retrieved from `localStorage`

2. **Protected Routes**: `PrivateRoute.jsx` wraps authenticated pages
   - Checks if token exists and role matches requirements
   - Redirects to login if no token, to Unauthorized if wrong role

3. **API Client**: `src/utils/api.js` exports Axios instance
   - Automatically includes auth token in headers
   - Configured for backend base URL

4. **Error Handling**: `ErrorBoundary.jsx` catches React rendering errors
   - Graceful fallback UI for unexpected crashes

### Backend Route Structure

- **`/api/auth/*`**: Signup, login, verify, password reset
- **`/api/bot/*`**: Email bots, campaigns, WhatsApp client lifecycle, Telegram
- **`/api/marketplace/*`**: Seller bot CRUD, buyer browse/purchase
- **`/api/health`**: Server health check (no auth required)

### WhatsApp Integration

- **Client library**: `whatsapp-web.js` with LocalAuth
- **Session storage**: `.wwebjs_auth/` directory (auto-created on first QR scan)
- **Flow**:
  1. Frontend requests WhatsApp connection via `/api/bot/whatsapp/connect`
  2. Backend `WhatsAppController` (singleton) generates QR code
  3. User scans QR with phone
  4. Session persisted to `.wwebjs_auth/`
  5. Subsequent messages sent via authenticated client

---

## Common Development Tasks

### Adding a New Route

1. **Backend**: Create handler in `routes/<domain>.js`
   ```javascript
   router.get('/new-endpoint', auth.verifyToken, auth.requireRole(2), (req, res) => {
     // Seller-only endpoint
     return res.json({ success: true, data: {} });
   });
   ```

2. **Frontend**: Call via `api.js`:
   ```javascript
   const response = await api.get('/bot/new-endpoint');
   ```

3. **Testing**: Use REST client or cURL
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:5000/api/bot/new-endpoint
   ```

### Adding a Database Migration

1. Create a new SQL file in `back-end/config/` named `<feature>-migration.sql`
2. Add table definitions and indexes
3. Document in SETUP_GUIDE.md
4. Execute manually after pulling:
   ```bash
   psql -U postgres -d botify -f config/<feature>-migration.sql
   ```

### Adding a Frontend Page

1. Create `.jsx` file in `src/pages/`
2. Define route in `App.jsx` with appropriate role requirement
3. Wrap with `<PrivateRoute>` if authenticated access needed
4. Use `useAuth()` to access user data
5. Call backend APIs via `api.js`

### Debugging WhatsApp Issues

- Check `.wwebjs_auth/` session persistence
- Verify phone is connected and WhatsApp client active
- Review `WhatsAppController` singleton state in console logs
- If stuck, delete `.wwebjs_auth/` and re-scan QR

---

## Known Limitations & TODOs

### Documentation Mismatch ⚠️
- **README.md** still references local PostgreSQL setup (`psql -U postgres`) 
- **Actual runtime** uses Supabase API client with service key
- **Action**: Update SETUP_GUIDE.md to reflect Supabase-only setup

### Testing
- **No formal test suite** in package.json
- Root `package.json` has placeholder test script
- **Consider adding**: Jest for backend unit tests, Vitest for frontend

### Security
- `bots` table stores `bot_password` in plaintext (sensitive data)
- SQL migrations use broad GRANT statements
- **Priority**: Implement role-specific permissions, encrypt bot credentials

### Features In-Progress
- Bot marketplace filtering/search
- Advanced campaign analytics
- Discord/Slack integration (planned)
- Multi-language support (planned)

---

## Debugging Tips

1. **Backend not starting?**
   - Check `.env` file exists and has correct credentials
   - Verify Supabase URL and service key are valid
   - Check Node.js version (v18+)
   - Look for port 5000 already in use: `lsof -i :5000`

2. **Frontend can't reach backend?**
   - Verify backend is running on `localhost:5000`
   - Check Axios baseURL in `src/utils/api.js` (should be `/api`)
   - Inspect Network tab in DevTools for CORS errors

3. **WhatsApp QR not displaying?**
   - Ensure `.wwebjs_auth/` directory is writable
   - Restart backend to reset singleton state
   - Check browser console for WebSocket errors

4. **JWT token expired?**
   - Frontend redirects to login automatically
   - Check `localStorage` for token expiry time
   - Backup: Clear `localStorage` and re-login

5. **Database migrations failed?**
   - Verify Supabase connection is active
   - Check SQL syntax against Postgres docs
   - Review migration logs in Supabase dashboard

---

## Related Documentation

- **Setup**: See [SETUP_GUIDE.md](../../SETUP_GUIDE.md) for first-time environment setup
- **API Reference**: See [QUICK_REFERENCE.md](../../QUICK_REFERENCE.md) for endpoint list and payloads
- **Core Architecture**: [README.md](../../README.md) for project vision and tech rationale

---

## Questions or Issues?

Refer to the error messages and debugging tips above. If still stuck:
1. Check existing issues in the repo
2. Verify all prerequisites are installed (Node 18+, PostgreSQL/Supabase access)
3. Review server/browser console logs for specific error codes
