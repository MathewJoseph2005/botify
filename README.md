# Botify - Multi-Messaging Bot Marketplace Platform

A comprehensive platform for buying, selling, and managing messaging bots across multiple platforms (WhatsApp, Telegram, Discord, etc.)

## Project Overview

**Phase 1** (Current Implementation):
- User authentication and authorization
- Role-based access control (Admin, Seller, Buyer)
- Landing page with hero section
- Dashboard interfaces for all user roles

## Tech Stack

### Frontend
- React 19 with Vite
- Tailwind CSS
- React Router DOM
- Axios

### Backend
- Node.js with Express.js
- PostgreSQL
- JWT Authentication
- bcryptjs

## Project Structure

```
botify/
├── back-end/               # Backend server
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API routes
│   ├── .env.example       # Environment variables template
│   ├── server.js          # Main server file
│   └── package.json
│
├── front-end/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── package.json           # Root package.json
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- npm or yarn

### 1. Clone and Setup

```bash
# Navigate to project directory
cd botify
```

### 2. Backend Setup

```bash
# Navigate to backend
cd back-end

# Install dependencies
npm install

# Create database
psql -U postgres
CREATE DATABASE botify;
\q

# Initialize database schema
psql -U postgres -d botify -f config/db-init.sql

# Setup environment variables
cp .env.example .env
# Edit .env with your actual database credentials

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal
cd front-end

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## Default User Roles

The system supports three user roles:

1. **Admin** (role_id: 1)
   - Platform administration
   - User management
   - Bot review and approval
   - View all statistics

2. **Seller** (role_id: 2)
   - Create and manage bots
   - View sales and analytics
   - Track revenue

3. **Buyer** (role_id: 3)
   - Browse marketplace
   - Purchase bots
   - Manage purchased bots
   - Configure bot settings

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Health Check
- `GET /api/health` - Check API status

## Features Implemented

✅ User authentication (signup/login)  
✅ JWT-based authorization  
✅ Password hashing with bcryptjs  
✅ Role-based access control  
✅ Protected routes  
✅ Landing page with hero section  
✅ Navigation bar  
✅ Login/Signup forms  
✅ Admin dashboard  
✅ Seller dashboard  
✅ Buyer dashboard  
✅ Responsive design  

## Environment Variables

### Backend (.env)
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=botify
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_secure_random_jwt_secret_key
NODE_ENV=development
```

## Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT tokens with 7-day expiration
- Protected API routes with middleware
- Input validation
- SQL injection prevention (parameterized queries)
- CORS enabled
- Secure token storage in localStorage

## Database Schema

### roles table
- role_id (PK)
- role_name (admin, seller, buyer)
- description
- created_at

### users table
- user_id (PK)
- name
- email (unique)
- password_hash
- phone
- role_id (FK to roles)
- created_at

## Development

### Backend Development
```bash
cd back-end
npm run dev  # Runs with nodemon for auto-reload
```

### Frontend Development
```bash
cd front-end
npm run dev  # Runs Vite dev server
```

## Building for Production

### Backend
```bash
cd back-end
npm start
```

### Frontend
```bash
cd front-end
npm run build
npm run preview
```

## Testing the Application

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000`
3. Click "Sign Up" and create an account
4. Select your role (Admin, Seller, or Buyer)
5. After signup, you'll be redirected to your role-specific dashboard
6. Try logging out and logging back in

## Future Enhancements (Phase 2+)

- Bot marketplace with CRUD operations
- Payment integration
- Bot deployment system
- Analytics and reporting
- User reviews and ratings
- Search and filtering
- Bot categories and tags
- Messaging platform integrations
- Admin approval workflow
- Seller verification system

## Contributing

This is Phase 1 of the Botify platform. Future phases will add more features and functionality.

## License

ISC

## Support

For issues or questions, please refer to the individual README files in the `back-end` and `front-end` directories.
