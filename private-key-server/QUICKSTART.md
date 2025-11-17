# Quick Start Guide - Private Key Management Server

## Prerequisites

- Node.js >= 16.0.0
- MongoDB running and accessible
- Main application server's `.env` file with:
  - `MONGO_URI` or `MONGODB_URI`
  - `JWT_SECRET`

## Installation

1. Navigate to the private-key-server directory:
```bash
cd private-key-server
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The server uses the same `.env` file as the main application (in the root directory). Make sure it contains:

```env
MONGO_URI=mongodb://localhost:27017/safe-app
JWT_SECRET=your-jwt-secret-key
PRIVATE_KEY_SERVER_PORT=8001  # Optional, defaults to 8001
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:8001` by default.

## Testing the Server

### 1. Health Check
```bash
curl http://localhost:8001/health
```

### 2. Store Private Key
```bash
curl -X POST http://localhost:8001/private-key \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "encrypted_private_key_here",
    "departmentName": "Engineering",
    "username": "john_doe",
    "userEmail": "john@example.com"
  }'
```

### 3. Check if Key Exists
```bash
curl http://localhost:8001/private-key/check/Engineering
```

### 4. Get Private Key (requires authentication)
```bash
curl http://localhost:8001/private-key/Engineering \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Add User to Permission List
```bash
curl -X POST http://localhost:8001/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentName": "Engineering",
    "userEmail": "jane@example.com"
  }'
```

### 6. Get Permission List
```bash
curl http://localhost:8001/permissions/Engineering \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Integration with Main Server

This server runs independently but shares:
- **Database**: Same MongoDB instance
- **Authentication**: Same JWT_SECRET for token verification
- **User Model**: Uses the same User model for authentication

Make sure both servers can access the same MongoDB instance.

## Port Configuration

By default, the server runs on port **8001**. The main application server runs on port **8000**.

To change the port, set `PRIVATE_KEY_SERVER_PORT` in your `.env` file or pass it as an environment variable:

```bash
PRIVATE_KEY_SERVER_PORT=9001 npm start
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env` file
- Verify network connectivity to MongoDB

### Authentication Errors
- Ensure `JWT_SECRET` matches the main server's JWT_SECRET
- Verify token is valid and not expired
- Check token format: `Bearer <token>`

### User Model Not Found
- Ensure User model is copied to `private-key-server/models/User.js`
- Check import paths in controllers and middleware

## Next Steps

1. Start the main application server (port 8000)
2. Start the private key server (port 8001)
3. Integrate with frontend to use the private key endpoints
4. Set up permission management for cross-department access


