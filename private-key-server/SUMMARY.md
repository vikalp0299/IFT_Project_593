# Private Key Management Server - Summary

## Overview

A separate Express server that manages encrypted private keys for departments with authentication and permission-based access control.

## Server Structure

```
private-key-server/
├── config.js                 # Server configuration
├── server.js                 # Main server file
├── package.json              # Dependencies
├── README.md                 # Full documentation
├── QUICKSTART.md             # Quick start guide
├── models/
│   ├── PrivateKey.js         # Private key model
│   ├── Permission.js         # Permission model
│   └── User.js               # User model (copied from main app)
├── controllers/
│   ├── privateKeyController.js   # Private key CRUD operations
│   └── permissionController.js   # Permission management
├── routes/
│   ├── privateKeyRoutes.js   # Private key routes
│   └── permissionRoutes.js   # Permission routes
└── middleware/
    └── auth.js               # JWT authentication middleware
```

## API Endpoints

### Private Key Endpoints

1. **POST /private-key**
   - Store encrypted private key
   - Requires: privateKey, departmentName, username, userEmail
   - Validation: Prevents duplicate keys for same department
   - No authentication required

2. **GET /private-key/check/:departmentName**
   - Check if private key exists for department
   - Returns: { exists: true/false }
   - No authentication required

3. **GET /private-key/:departmentName**
   - Retrieve private key
   - Requires: JWT authentication
   - Access rules:
     - Same department → Access granted
     - Different department → Check permission list
     - In permission list → Access granted
     - Otherwise → Access denied (403)

### Permission Management Endpoints

1. **POST /permissions**
   - Add user to permission list
   - Requires: JWT authentication, departmentName, userId/username/userEmail
   - Validates user exists before adding

2. **DELETE /permissions**
   - Remove user from permission list
   - Requires: JWT authentication, departmentName, userId/username/userEmail

3. **GET /permissions/:departmentName**
   - Get permission list for department
   - Requires: JWT authentication
   - Returns: List of allowed users with details

## Database Models

### PrivateKey
- `privateKey` (String): Encrypted private key
- `departmentName` (String): Department name (unique, indexed)
- `username` (String): Username who stored the key
- `userEmail` (String): Email of user who stored the key
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last update timestamp

### Permission
- `departmentName` (String): Department name (unique, indexed)
- `allowedUsers` (Array): List of allowed users
  - `userId` (ObjectId): User ID
  - `username` (String): Username
  - `userEmail` (String): User email
  - `addedAt` (Date): When user was added
  - `addedBy` (ObjectId): Who added the user
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last update timestamp

## Security Features

1. **JWT Authentication**: All sensitive endpoints require valid JWT tokens
2. **Department-based Access**: Users in same department get automatic access
3. **Permission Lists**: Cross-department access via permission lists
4. **User Validation**: Users are validated before adding to permission lists
5. **Duplicate Prevention**: Only one private key per department

## Integration

- **Database**: Shares MongoDB with main application
- **Authentication**: Uses same JWT_SECRET as main server
- **User Model**: Uses same User model for authentication
- **Port**: Runs on port 8001 (configurable via PRIVATE_KEY_SERVER_PORT)

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `MISSING_FIELDS`: Required fields missing
- `KEY_EXISTS`: Private key already exists
- `KEY_NOT_FOUND`: Private key not found
- `ACCESS_DENIED`: Access denied
- `NOT_IN_PERMISSION_LIST`: User not in permission list
- `USER_NOT_FOUND`: User not found
- `NO_TOKEN`: Authentication token missing
- `INVALID_TOKEN`: Invalid or expired token

## Usage Flow

1. **Store Private Key**:
   - Frontend encrypts private key
   - Sends to POST /private-key
   - Server validates and stores

2. **Check Key Existence**:
   - Frontend checks GET /private-key/check/:departmentName
   - Determines if key needs to be stored

3. **Retrieve Private Key**:
   - Frontend sends GET /private-key/:departmentName with JWT token
   - Server checks department and permissions
   - Returns private key if authorized

4. **Manage Permissions**:
   - Admin adds users to permission list via POST /permissions
   - Admin can remove users via DELETE /permissions
   - Admin can view permission list via GET /permissions/:departmentName

## Next Steps

1. Install dependencies: `npm install`
2. Configure environment variables in `.env`
3. Start server: `npm start`
4. Integrate with frontend
5. Test all endpoints
6. Set up permission management UI

## Notes

- Private keys are assumed to be encrypted before sending to server
- Server stores keys as-is (no additional encryption)
- Department names are case-insensitive (stored in lowercase)
- User identification supports userId, username, or userEmail
- Permission lists are department-specific


