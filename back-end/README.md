# Botify Backend

Backend server for Botify - Multi-Messaging Bot Marketplace Platform

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcryptjs for password hashing

## Setup Instructions

### 1. Install Dependencies

```bash
cd back-end
npm install
```

### 2. Database Setup

Make sure PostgreSQL is installed and running on your system.

Create a new database:
```bash
psql -U postgres
CREATE DATABASE botify;
\q
```

Run the database initialization script:
```bash
psql -U postgres -d botify -f config/db-init.sql
```

### 3. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and update with your actual database credentials:
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

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Register a new user
  - Body: `{ name, email, password, phone?, role }`
  - role: 'admin', 'seller', or 'buyer'

- **POST** `/api/auth/login` - Login user
  - Body: `{ email, password }`
  - Returns: JWT token and user info

- **GET** `/api/auth/verify` - Verify JWT token
  - Headers: `Authorization: Bearer <token>`
  - Returns: User info

### Health Check

- **GET** `/api/health` - Check if API is running

## Database Schema

### Tables

1. **roles**
   - role_id (PK)
   - role_name (admin, seller, buyer)
   - description
   - created_at

2. **users**
   - user_id (PK)
   - name
   - email (unique)
   - password_hash
   - phone
   - role_id (FK to roles)
   - created_at

## Security Features

- Password hashing using bcryptjs
- JWT-based authentication
- Token expiration (7 days)
- Protected routes with middleware
- Input validation
- SQL injection prevention using parameterized queries

## Project Structure

```
back-end/
├── config/
│   ├── database.js          # PostgreSQL connection
│   └── db-init.sql          # Database schema
├── middleware/
│   └── auth.js              # JWT verification middleware
├── routes/
│   └── auth.js              # Authentication routes
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
└── server.js                # Main server file
```
