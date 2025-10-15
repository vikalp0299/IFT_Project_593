# Router Directory

This directory contains Express.js route definitions that map HTTP endpoints to controller functions. Routers handle URL routing, middleware application, and HTTP method handling.

## Files Overview

### `loginRouter.js`
Handles authentication-related routes (registration, login, logout).

#### Route Definitions:

**`POST /register`**
- **Controller**: `registerFunction`
- **Purpose**: Create new user account
- **Authentication**: None required (public endpoint)
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securePassword123"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
  ```
- **Errors**: 
  - 400: Invalid input or format
  - 409: Username/email already exists
  - 500: Server error
- **Usage**: Called from registration form

**`POST /login`**
- **Controller**: `loginFunction`
- **Purpose**: Authenticate user and issue JWT token
- **Authentication**: None required (public endpoint)
- **Request Body**:
  ```json
  {
    "identity": "johndoe",  // or "john@example.com"
    "password": "securePassword123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "username": "johndoe",
    "data": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "lastLogin": "2024-01-20T15:45:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Missing credentials
  - 401: Invalid credentials
  - 500: Server error
- **Usage**: Called from login form

**`POST /logout`**
- **Controller**: `logoutFunction`
- **Purpose**: Logout user (placeholder)
- **Authentication**: None currently
- **Note**: Currently not implemented
- **Client-Side**: Logout handled by removing JWT token from storage
- **Future**: Could implement token blacklisting or refresh token revocation

#### Router Configuration:
```javascript
import express from 'express';
import { loginFunction, logoutFunction, registerFunction } from '../controller/loginController.js';

const loginRouter = express.Router();

loginRouter.post('/register', registerFunction);
loginRouter.post('/login', loginFunction);
loginRouter.post('/logout', logoutFunction);

export default loginRouter;
```

#### Mounting:
- Mounted at root level in `server.js`
- Routes accessible as: `/register`, `/login`, `/logout`

---

### `fileRouter.js`
Handles file management routes (list, upload, download).

#### Route Definitions:

**`GET /files`** 🔒 Protected
- **Controller**: `displayAllFiles`
- **Purpose**: Retrieve all files belonging to authenticated user
- **Authentication**: **Required** - `authenticateToken` middleware
- **Headers Required**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  ```
- **Request**: No body required
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "count": 3,
    "files": [
      {
        "_id": "...",
        "filename": "abc-123-def",
        "originalname": "report.pdf",
        "size": 2457600,
        "uploadedAt": "2024-01-20T15:45:00Z",
        "path": "uploads/507f1f77.../abc-123-def",
        "mimetype": "application/pdf"
      },
      // ... more files
    ]
  }
  ```
- **Errors**:
  - 401: No token or invalid token
  - 403: Token expired
  - 500: Server error
- **Usage**: Called on page load and refresh button click

**`POST /uploads/init`** 🔒 Protected
- **Controller**: `initUpload`
- **Purpose**: Initialize chunked file upload session
- **Step**: 1 of 3 in upload process
- **Authentication**: **Required** - `authenticateToken` middleware
- **Headers Required**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "filename": "document.pdf"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "uploadId": "abc-123-def-456",
    "message": "Upload initialized"
  }
  ```
- **Errors**:
  - 400: Missing filename
  - 401: Authentication required
  - 500: Server error
- **Usage**: First call when user selects file to upload

**`POST /uploads/chunk`** 🔒 Protected
- **Controller**: `uploadChunk` (array: multer middleware + handler)
- **Purpose**: Upload individual file chunk
- **Step**: 2 of 3 in upload process (called multiple times)
- **Authentication**: **Required** - `authenticateToken` middleware
- **Headers Required**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: multipart/form-data
  ```
- **Request Body** (FormData):
  ```
  chunk: <Blob/File>       // Binary chunk data
  uploadId: abc-123-def-456
  chunkIndex: 0            // Sequential number
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "received": 0,
    "message": "Chunk 0 uploaded"
  }
  ```
- **Errors**:
  - 400: Missing uploadId, chunkIndex, or chunk
  - 401: Authentication required
  - 500: Server error
- **Usage**: Called repeatedly for each file chunk (typically 1-5MB each)

**`POST /uploads/complete`** 🔒 Protected
- **Controller**: `completeUpload`
- **Purpose**: Finalize upload, reassemble chunks, save metadata
- **Step**: 3 of 3 in upload process
- **Authentication**: **Required** - `authenticateToken` middleware
- **Headers Required**:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "uploadId": "abc-123-def-456",
    "originalName": "document.pdf",
    "size": 2457600
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "File uploaded successfully",
    "fileId": "507f1f77bcf86cd799439011",
    "filename": "document.pdf",
    "path": "uploads/userId/abc-123-def-456",
    "size": 2457600
  }
  ```
- **Errors**:
  - 400: Missing uploadId or originalName
  - 401: Authentication required
  - 404: Upload session not found
  - 500: Server error
- **Usage**: Final call after all chunks uploaded

#### Router Configuration:
```javascript
import express from 'express';
import { authenticateToken } from '../controller/loginController.js';
import { completeUpload, displayAllFiles, initUpload, uploadChunk } from '../controller/fileController.js';

const router = express.Router();

// Protected routes - require JWT authentication
router.get('/files', authenticateToken, displayAllFiles);
router.post('/uploads/init', authenticateToken, initUpload);
router.post('/uploads/chunk', authenticateToken, uploadChunk);
router.post('/uploads/complete', authenticateToken, completeUpload);

export default router;
```

#### Mounting:
- Mounted with `/api` prefix in `server.js`
- Routes accessible as: `/api/files`, `/api/uploads/init`, etc.

---

## Middleware Flow

### Protected Route Flow (File Routes):
