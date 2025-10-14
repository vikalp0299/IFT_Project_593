# Frontend-Backend Connection Setup

This document explains how the frontend and backend are now connected and how to run them.

## Overview

The application now has a fully connected frontend and backend with the following features:

### Frontend (React + TypeScript)
- **Location**: `front-end/safe-front-end/`
- **Port**: 5173 (Vite default)
- **Features**:
  - Authentication system with React Context
  - API service layer for backend communication
  - Connected components for login/registration
  - Protected routes and authentication state management

### Backend (Node.js + Express)
- **Location**: Root directory
- **Port**: 8000
- **Features**:
  - JWT-based authentication
  - MongoDB integration
  - CORS enabled for frontend communication
  - RESTful API endpoints

## API Endpoints

### Authentication Endpoints
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout

### Request/Response Formats

#### Registration
```json
POST /register
{
  "username": "string",
  "email": "string", 
  "password": "string"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "string",
    "username": "string",
    "email": "string",
    "token": "jwt_token"
  }
}
```

#### Login
```json
POST /login
{
  "username": "string",
  "password": "string"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "string",
    "username": "string",
    "email": "string",
    "token": "jwt_token",
    "lastLogin": "date"
  }
}
```

## How to Run

### 1. Start the Backend Server
```bash
# From the root directory
npm start
```
The backend will start on `http://localhost:8000`

### 2. Start the Frontend Development Server
```bash
# From the front-end/safe-front-end directory
cd front-end/safe-front-end
npm run dev
```
The frontend will start on `http://localhost:5173`

## Frontend Components Connected

### 1. CreateAccount Component
- **Location**: `src/components/CreateAccount.tsx`
- **Connected to**: Backend registration API
- **Features**: Form validation, error handling, success state

### 2. SignInCredentials Component  
- **Location**: `src/components/SignInCredentials.tsx`
- **Connected to**: Backend login API
- **Features**: Authentication, token storage, navigation

### 3. HomePage Component
- **Location**: `src/pages/HomePage.tsx`
- **Connected to**: Authentication context
- **Features**: Shows login status, logout functionality

## Authentication Flow

1. **Registration**: User fills form → API call to `/register` → Token stored → Success page
2. **Login**: User enters credentials → API call to `/login` → Token stored → Redirect to home
3. **Logout**: User clicks logout → API call to `/logout` → Token cleared → Redirect to home

## API Service Layer

### Location: `src/services/api.ts`
- Centralized API communication
- JWT token management
- Error handling
- TypeScript interfaces for type safety

### Key Features:
- Automatic token inclusion in requests
- Local storage for token persistence
- Response/error handling
- Singleton pattern for consistent state

## Authentication Context

### Location: `src/contexts/AuthContext.tsx`
- React Context for global authentication state
- Provides: user info, login/logout functions, loading states
- Used throughout the application for auth state

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (Frontend development server)

## Database

- **MongoDB** with Mongoose ODM
- **User Model**: Username, email, password (hashed), timestamps
- **Connection**: Configured in `db.js`

## Testing

A test script is available at `test-backend.js` to verify API endpoints:
```bash
node test-backend.js
```

## Environment Variables

Make sure you have a `.env` file in the root directory with:
```
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

## Notes

- The frontend UI remains unchanged - only backend connectivity was added
- All authentication state is managed through React Context
- JWT tokens are stored in localStorage for persistence
- CORS is properly configured for development
- Error handling is implemented throughout the flow
