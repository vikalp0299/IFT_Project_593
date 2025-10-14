# Project IFT - Secure File Sharing System

## Architecture Overview

This is a **multi-component secure file sharing system** with:
- **Backend API** (Express.js): User auth, chunked file uploads, MongoDB storage
- **React Frontend** (TypeScript + Vite): Registration, login, and file management UI
- **IPFS Integration**: Distributed file storage with peer-to-peer synchronization
- **Client-Side Encryption**: RSA-OAEP encryption using Web Crypto API and IndexedDB

### Key Components & Data Flow

```
User → React Frontend → Express API → MongoDB (metadata) + Local Storage (files)
                                   ↓
                                 IPFS Network (distributed backup)
```

**File Upload Flow**: Client chunks large files → Backend reassembles in `temp_uploads/` → Moves to `uploads/` → Metadata stored in MongoDB with `userId` reference

**Authentication Flow**: JWT-based auth with bcrypt password hashing → Token required in `Authorization: Bearer <token>` header for protected routes

## Project Structure

- **`/` (root)**: Main Express server (`server.js`), MongoDB connection (`db.js`)
- **`/models/`**: Mongoose schemas (`User.js`, `File.js`) - note dual `userId`/`uploader` fields in File model
- **`/controller/`**: Business logic for file operations and auth
- **`/router/`**: Express route definitions (prefix `/api` for file routes, root for auth)
- **`/front-end/safe-front-end/`**: React + TypeScript + shadcn/ui components
- **`/file_encryption/`**: Standalone RSA encryption tool (Web Crypto API demo)
- **`/IPFS/`**: Docker-based IPFS nodes with P2P pinning logic

## Critical Patterns & Conventions

### 1. ES Modules Only
All JavaScript files use ES modules (`import`/`export`). No CommonJS `require()`.
```javascript
import express from 'express';  // ✓
const express = require('express');  // ✗
```

### 2. File Model's Dual User Reference
Files have **both** `userId` and `uploader` fields (same ObjectId) for backward compatibility:
```javascript
// File.js
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
```
When creating files, set both to the authenticated user's ID.

### 3. Chunked File Upload Pattern
Large file uploads use a 3-step process:
1. `POST /api/uploads/init` → Returns `uploadId` (UUID), creates temp directory
2. `POST /api/uploads/chunk` → Upload each chunk with `uploadId` + `chunkIndex`
3. `POST /api/uploads/complete` → Reassembles chunks in order, moves to `/uploads/`

See `controller/fileController.js` for implementation details.

### 4. JWT Authentication Middleware
Protected routes use `authenticateToken` middleware from `loginController.js`:
```javascript
const token = req.headers['authorization']?.split(' ')[1];
// Adds req.user = { userId, username } to request
```

### 5. IPFS Peer Connection Fix
IPFS nodes require manual peer connection due to NAT issues. See `IPFS/node_app/server.js`:
- Local node connects to remote via `/ip4/<LAN_IP>/tcp/4001/p2p/<PEER_ID>`
- Use `axios` to call `/api/v0/id` endpoint directly (bypasses IPFS client bug)
- Always connect peers before pinning CIDs

### 6. Frontend Routing Convention
React Router paths:
- `/` → Welcome/Home screen
- `/signin` → Sign-in options
- `/signin-credentials` → Actual login form
- `/create-account` → User registration
- `/organization-registration` → Organization setup

Components use shadcn/ui primitives (see `src/components/ui/`).

### 7. Encryption Module (Standalone)
`file_encryption/` is a **separate demo** showing client-side encryption:
- Generates RSA-2048 key pairs in browser
- Stores keys in IndexedDB (private key encrypted with PBKDF2-derived AES key)
- Not integrated with main Express API (yet)

## Development Workflows

### Start Backend Server
```bash
cd /home/Blockchain/Desktop/Project_IFT/dev
npm start  # Runs nodemon with .env file
```
Listens on port `8000` (or `PORT` from `.env`).

### Start Frontend Dev Server
```bash
cd front-end/safe-front-end
npm run dev  # Vite dev server
```

### Start IPFS Nodes
```bash
cd IPFS
docker-compose up  # Local node on ports 4001, 5001, 8080
```
Remote node runs same image on different machine (update IP in `docker-compose.yml`).

### Environment Variables
Create `.env` in project root:
```
MONGO_URI=mongodb://localhost:27017/login-backend
JWT_SECRET=<your-secret-key>
PORT=8000
```

## Integration Points

### MongoDB Connection
- Uses Mongoose with `useNewUrlParser` and `useUnifiedTopology` options
- Connection handled in `db.js`, called from `server.js`
- Default: `localhost:27017/login-backend`

### File Storage
- Temporary chunks: `temp_uploads/<uploadId>/chunk_<index>`
- Final files: `uploads/<uploadId>` (no original filename preserved)
- Static file serving: `public/` directory via `express.static()`

### IPFS Integration
- IPFS client connects to HTTP API on port 5001
- Files pinned to multiple nodes for redundancy
- CID returned to client for retrieval via IPFS gateway

## Common Gotchas

1. **File model access control**: The `access` array field is defined but not enforced in controllers yet
2. **Password requirements**: Backend validates ≥6 chars and email format; frontend may have different rules
3. **IPFS LAN IP**: Update `192.168.1.209` in IPFS server code to match your network
4. **Logout not implemented**: `logoutFunction` is empty (JWT invalidation happens client-side)
5. **CORS**: Currently open (`*`) in IPFS routes; tighten for production

## Key Files to Reference

- **Auth flow**: `controller/loginController.js` + `router/loginRouter.js`
- **File upload**: `controller/fileController.js` (see `uploadChunk` middleware pattern)
- **Schema validation**: `models/User.js` and `models/File.js`
- **Frontend routing**: `front-end/safe-front-end/src/App.tsx`
- **IPFS P2P logic**: `IPFS/node_app/server.js` (peer connection workaround)

When adding features, maintain ES module syntax, follow the controller→router→server layering, and ensure JWT middleware is applied to protected routes.
