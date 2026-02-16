# Botify Phase 1 - Setup Guide

This guide will help you set up and run the Botify platform (Phase 1).

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js (v18 or higher) installed
- ✅ PostgreSQL installed and running
- ✅ WSL (Windows Subsystem for Linux) if on Windows
- ✅ A code editor (VS Code recommended)

## Step-by-Step Setup

### Part 1: Database Setup

#### 1. Create the Database

Open your PostgreSQL terminal:

**On Windows (WSL):**
```bash
wsl
sudo service postgresql start
sudo -u postgres psql
```

**On Linux/Mac:**
```bash
psql -U postgres
```

Then create the database:
```sql
CREATE DATABASE botify;
\q
```

#### 2. Initialize Database Schema

Run the initialization script:

**On Windows (WSL):**
```bash
wsl bash -c "cd /home/mathew/botify/back-end && psql -U postgres -d botify -f config/db-init.sql"
```

**On Linux/Mac:**
```bash
cd back-end
psql -U postgres -d botify -f config/db-init.sql
```

This will create:
- `roles` table with 3 default roles (admin, seller, buyer)
- `users` table for storing user information

#### 3. Verify Database Setup

```bash
psql -U postgres -d botify
\dt  # List all tables
\q
```

You should see `roles` and `users` tables.

### Part 2: Backend Setup

#### 1. Navigate to Backend Directory

```bash
cd back-end
```

#### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` file with your actual credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=botify
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
NODE_ENV=development
```

**Important:** Change `JWT_SECRET` to a strong random string for security!

#### 3. Verify Dependencies

Dependencies are already installed. Verify by checking:
```bash
ls node_modules
```

If needed, reinstall:
```bash
npm install
```

#### 4. Start Backend Server

**Development mode (recommended):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
🚀 Botify Backend Server is running on port 5000
📡 API available at http://localhost:5000/api
🏥 Health check: http://localhost:5000/api/health
```

#### 5. Test Backend API

Open a browser or use curl:
```bash
curl http://localhost:5000/api/health
```

You should see: `{"success":true,"message":"Botify API is running!",...}`

### Part 3: Frontend Setup

Open a **new terminal** (keep the backend running).

#### 1. Navigate to Frontend Directory

```bash
cd front-end
```

#### 2. Verify Dependencies

Dependencies are already installed. Verify:
```bash
ls node_modules
```

If needed, reinstall:
```bash
npm install
```

#### 3. Start Frontend Development Server

**On Windows (WSL):**
```bash
wsl bash -c "cd /home/mathew/botify/front-end && npm run dev"
```

**On Linux/Mac:**
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

#### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Testing the Application

### 1. Create Your First User

1. Click **"Sign Up"** button
2. Fill in the form:
   - **Name:** John Doe
   - **Email:** admin@botify.com
   - **Phone:** +1234567890 (optional)
   - **Role:** Admin (or Seller/Buyer)
   - **Password:** password123
   - **Confirm Password:** password123
3. Click **"Create Account"**

You'll be automatically logged in and redirected to your dashboard!

### 2. Test Login

1. Logout (click "Logout" button in navigation)
2. Click **"Login"**
3. Enter your credentials:
   - **Email:** admin@botify.com
   - **Password:** password123
4. Click **"Sign In"**

### 3. Explore Dashboards

Based on your role, you'll see different dashboards:

- **Admin Dashboard:** User management, bot reviews, statistics
- **Seller Dashboard:** My bots, sales, revenue tracking
- **Buyer Dashboard:** Purchased bots, marketplace recommendations

### 4. Test Different Roles

Create accounts with different roles to see how the platform adapts:
- Admin: admin@botify.com
- Seller: seller@botify.com  
- Buyer: buyer@botify.com

## Project Structure Overview

```
botify/
├── back-end/                    # Express.js API Server
│   ├── config/
│   │   ├── database.js         # PostgreSQL connection
│   │   └── db-init.sql         # Database schema
│   ├── middleware/
│   │   └── auth.js             # JWT verification
│   ├── routes/
│   │   └── auth.js             # Auth endpoints
│   ├── .env                    # Environment variables (create this)
│   ├── .env.example            # Template
│   └── server.js               # Main server
│
└── front-end/                   # React + Vite App
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx      # Navigation bar
    │   │   └── PrivateRoute.jsx # Route protection
    │   ├── pages/
    │   │   ├── LandingPage.jsx  # Home page
    │   │   ├── Login.jsx        # Login form
    │   │   ├── Signup.jsx       # Signup form
    │   │   ├── Marketplace.jsx  # Bot marketplace
    │   │   ├── AdminDashboard.jsx
    │   │   ├── SellerDashboard.jsx
    │   │   └── BuyerDashboard.jsx
    │   ├── utils/
    │   │   └── api.js           # API & auth utilities
    │   ├── App.jsx              # Main app & routing
    │   ├── main.jsx             # Entry point
    │   └── index.css            # Tailwind CSS
    ├── index.html
    └── vite.config.js
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/verify` - Verify JWT token

### Health Check
- `GET /api/health` - Check if API is running

## Features Implemented ✅

- ✅ User Registration with role selection
- ✅ User Login with JWT authentication
- ✅ Password hashing (bcryptjs)
- ✅ Protected routes (role-based access)
- ✅ Responsive landing page
- ✅ Navigation bar
- ✅ Admin dashboard
- ✅ Seller dashboard  
- ✅ Buyer dashboard
- ✅ Auto-redirect based on user role
- ✅ Token persistence (localStorage)
- ✅ Logout functionality

## Troubleshooting

### Backend Issues

**Problem:** Database connection error
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start
```

**Problem:** Port 5000 already in use
```bash
# Change PORT in .env file to another port (e.g., 5001)
PORT=5001
```

### Frontend Issues

**Problem:** Cannot connect to backend
- Verify backend is running on port 5000
- Check browser console for errors
- Verify proxy settings in `vite.config.js`

**Problem:** Dependencies not installed
```bash
cd front-end
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

**Problem:** Tables not created
```bash
# Re-run the initialization script
psql -U postgres -d botify -f config/db-init.sql
```

**Problem:** Can't connect to PostgreSQL
```bash
# Check PostgreSQL is listening
sudo netstat -plnt | grep 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Next Steps

Now that Phase 1 is complete, you can:

1. **Test the authentication flow** thoroughly
2. **Create multiple users** with different roles
3. **Explore the dashboards** for each role
4. **Review the code** to understand the architecture
5. **Plan Phase 2** features (marketplace, payments, etc.)

## Development Commands

### Backend
```bash
cd back-end
npm run dev      # Development with auto-reload
npm start        # Production mode
```

### Frontend
```bash
cd front-end
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Security Notes

⚠️ **Important for Production:**
1. Change `JWT_SECRET` to a strong random string
2. Use environment-specific `.env` files
3. Enable HTTPS
4. Add rate limiting
5. Implement CSRF protection
6. Add input sanitization
7. Set up proper CORS policies
8. Use strong PostgreSQL passwords

## Support

For detailed information:
- Backend: See `back-end/README.md`
- Frontend: See `front-end/README.md`
- Main docs: See `README.md`

## Success Criteria

You've successfully set up Botify Phase 1 if you can:
1. ✅ Start both backend and frontend servers
2. ✅ Create a new user account
3. ✅ Login with credentials
4. ✅ See role-specific dashboard
5. ✅ Logout and login again
6. ✅ Access different pages (Landing, Marketplace, Dashboard)

---

**Congratulations!** 🎉 You've successfully set up Botify Phase 1!
