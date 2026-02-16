# Botify Quick Reference

## Quick Start Commands

### 1. Database Setup (One-time)
```bash
# Create database
wsl
sudo service postgresql start
sudo -u postgres psql
CREATE DATABASE botify;
\q

# Initialize schema
wsl bash -c "cd /home/mathew/botify/back-end && psql -U postgres -d botify -f config/db-init.sql"
```

### 2. Backend Setup (One-time)
```bash
cd back-end
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Run Backend
```bash
cd back-end
wsl bash -c "cd /home/mathew/botify/back-end && npm run dev"
```

### 4. Run Frontend (New Terminal)
```bash
cd front-end
wsl bash -c "cd /home/mathew/botify/front-end && npm run dev"
```

## Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## File Structure

```
botify/
├── back-end/              Backend (Express + PostgreSQL)
│   ├── config/           Database config
│   ├── middleware/       Auth middleware
│   ├── routes/           API routes
│   ├── .env             Environment variables ⚠️ CREATE THIS
│   └── server.js        Main server
│
├── front-end/            Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  Reusable components
│   │   ├── pages/       Page components
│   │   └── utils/       API utilities
│   ├── index.html
│   └── vite.config.js
│
├── README.md            Overview
└── SETUP_GUIDE.md       Detailed setup instructions
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "buyer"
  }
  ```

- `POST /api/auth/login` - Login
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/verify` - Verify Token
  - Header: `Authorization: Bearer <token>`

## User Roles

1. **Admin** (role_id: 1) - Platform administration
2. **Seller** (role_id: 2) - Create and sell bots
3. **Buyer** (role_id: 3) - Purchase and use bots

## Pages & Routes

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/marketplace` - Bot marketplace

### Protected Routes
- `/dashboard/admin` - Admin dashboard (role: admin only)
- `/dashboard/seller` - Seller dashboard (role: seller only)
- `/dashboard/buyer` - Buyer dashboard (role: buyer only)

## Environment Variables (.env)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=botify
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
NODE_ENV=development
```

## Database Schema

### roles table
- role_id (PK)
- role_name (admin/seller/buyer)
- description
- created_at

### users table
- user_id (PK)
- name
- email (unique)
- password_hash
- phone
- role_id (FK)
- created_at

## Common Issues & Solutions

### Backend won't start
```bash
# Check PostgreSQL is running
sudo service postgresql status
sudo service postgresql start

# Check port 5000 is free
netstat -ano | findstr :5000
```

### Frontend won't start
```bash
# Reinstall dependencies
cd front-end
rm -rf node_modules package-lock.json
npm install
```

### Database connection failed
```bash
# Verify database exists
psql -U postgres -l | grep botify

# Recreate if needed
psql -U postgres
CREATE DATABASE botify;
\q
```

## Testing Checklist

✅ Backend server running on port 5000  
✅ Frontend server running on port 3000  
✅ Can access landing page  
✅ Can create new user  
✅ Can login  
✅ Redirected to correct dashboard  
✅ Can logout  
✅ Can login again  

## Tech Stack

**Frontend:**
- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Axios

**Backend:**
- Node.js
- Express.js
- PostgreSQL
- JWT
- bcryptjs

## Useful Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# List running node processes
ps aux | grep node

# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

## Development Workflow

1. Start PostgreSQL
2. Start backend server (terminal 1)
3. Start frontend server (terminal 2)  
4. Open http://localhost:3000
5. Make changes and test
6. Ctrl+C to stop servers when done

## Need Help?

- **Detailed Setup:** See `SETUP_GUIDE.md`
- **Backend Docs:** See `back-end/README.md`
- **Frontend Docs:** See `front-end/README.md`
- **Project Overview:** See `README.md`
