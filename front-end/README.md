# Botify Frontend

Frontend application for Botify - Multi-Messaging Bot Marketplace Platform

## Tech Stack

- React 19
- Vite (Build tool)
- Tailwind CSS
- React Router DOM
- Axios

## Setup Instructions

### 1. Install Dependencies

```bash
cd front-end
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will run on `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

### 4. Preview Production Build

```bash
npm run preview
```

## Features

### Authentication
- User signup with role selection (Admin, Seller, Buyer)
- User login with JWT authentication
- Automatic redirection based on user role
- Token stored in localStorage
- Protected routes with authentication middleware

### Pages

1. **Landing Page** (`/`)
   - Hero section with platform introduction
   - Feature highlights
   - Call-to-action buttons
   - Statistics showcase

2. **Login** (`/login`)
   - Email and password authentication
   - Remember me functionality
   - Redirect to role-specific dashboard on success

3. **Signup** (`/signup`)
   - User registration with role selection
   - Email validation
   - Password confirmation
   - Phone number (optional)

4. **Marketplace** (`/marketplace`)
   - Browse available bots (coming soon)

5. **Admin Dashboard** (`/dashboard/admin`)
   - User management
   - Bot review and approval
   - Platform statistics
   - Recent activity

6. **Seller Dashboard** (`/dashboard/seller`)
   - My bots listing
   - Sales statistics
   - Revenue tracking
   - Create new bots

7. **Buyer Dashboard** (`/dashboard/buyer`)
   - Purchased bots
   - Active bots management
   - Recommended bots
   - Bot configuration

## Project Structure

```
front-end/
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Navigation bar
│   │   └── PrivateRoute.jsx     # Protected route wrapper
│   ├── pages/
│   │   ├── LandingPage.jsx      # Home page
│   │   ├── Login.jsx            # Login page
│   │   ├── Signup.jsx           # Signup page
│   │   ├── Marketplace.jsx      # Marketplace page
│   │   ├── AdminDashboard.jsx   # Admin dashboard
│   │   ├── SellerDashboard.jsx  # Seller dashboard
│   │   ├── BuyerDashboard.jsx   # Buyer dashboard
│   │   └── Unauthorized.jsx     # 403 page
│   ├── utils/
│   │   └── api.js               # API utilities and axios config
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## API Integration

The frontend connects to the backend API at `http://localhost:5000/api`

API requests are handled through the `api.js` utility file which includes:
- Axios instance with base URL
- Request interceptor to add JWT tokens
- Authentication helper functions
- User management in localStorage

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom color scheme** with primary blue theme
- **Responsive design** for mobile, tablet, and desktop
- **Custom components** with hover effects and transitions

## Routes

- `/` - Landing page (public)
- `/login` - Login page (public)
- `/signup` - Signup page (public)
- `/marketplace` - Marketplace (public)
- `/dashboard` - Redirect to role-specific dashboard
- `/dashboard/admin` - Admin dashboard (protected, role: admin)
- `/dashboard/seller` - Seller dashboard (protected, role: seller)
- `/dashboard/buyer` - Buyer dashboard (protected, role: buyer)
- `/unauthorized` - 403 error page

## Environment Variables

The frontend is configured to proxy API requests to the backend server.
See `vite.config.js` for proxy configuration.
