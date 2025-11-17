# Private Key Management Server

This server handles the storage, retrieval, and permission management of encrypted private keys for departments.

## Features

- **Store Private Keys**: POST endpoint to store encrypted private keys with department, username, and email
- **Check Key Existence**: GET endpoint to check if a private key exists for a department
- **Retrieve Private Keys**: GET endpoint to retrieve private keys with authentication and permission checks
- **Permission Management**: Add/remove users from permission lists for department access

## Setup

1. Install dependencies:
```bash
cd private-key-server
npm install
```

2. Configure environment variables (uses same `.env` as main server):
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key (same as main server)
- `PRIVATE_KEY_SERVER_PORT`: Port for this server (default: 8001)
- `FRONTEND_URL`: Frontend URL for CORS

3. Start the server:
```bash
npm start
# or for development
npm run dev
```

The server will run on `http://localhost:8001` by default.

## API Endpoints

### Private Key Endpoints

#### POST /private-key
Store an encrypted private key.

**Request Body:**
```json
{
  "privateKey": "encrypted_private_key_string",
  "departmentName": "Engineering",
  "username": "john_doe",
  "userEmail": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Private key stored successfully",
  "data": {
    "id": "...",
    "departmentName": "engineering",
    "username": "john_doe",
    "userEmail": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validation:**
- Returns 409 if private key already exists for the department
- All fields are required

#### GET /private-key/check/:departmentName
Check if a private key exists for a department.

**Response:**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "departmentName": "engineering"
  }
}
```

#### GET /private-key/:departmentName
Retrieve a private key (requires authentication).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Access Rules:**
- If user belongs to the same department → access granted
- If user from different department → check permission list
- If user is in permission list → access granted
- Otherwise → access denied (403)

**Response:**
```json
{
  "success": true,
  "message": "Private key retrieved successfully",
  "data": {
    "privateKey": "encrypted_private_key_string",
    "departmentName": "engineering",
    "storedBy": {
      "username": "john_doe",
      "userEmail": "john@example.com"
    },
    "storedAt": "2024-01-01T00:00:00.000Z",
    "accessedVia": "same_department" | "permission_list"
  }
}
```

### Permission Management Endpoints

#### POST /permissions
Add a user to the permission list for a department (requires authentication).

**Request Body:**
```json
{
  "departmentName": "Engineering",
  "userId": "user_id_here",
  "username": "jane_doe",
  "userEmail": "jane@example.com"
}
```

**Note:** At least one of `userId`, `username`, or `userEmail` is required.

**Response:**
```json
{
  "success": true,
  "message": "User added to permission list successfully",
  "data": {
    "departmentName": "engineering",
    "user": {
      "userId": "...",
      "username": "jane_doe",
      "userEmail": "jane@example.com"
    },
    "addedAt": "2024-01-01T00:00:00.000Z",
    "totalUsers": 1
  }
}
```

#### DELETE /permissions
Remove a user from the permission list (requires authentication).

**Request Body:**
```json
{
  "departmentName": "Engineering",
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User removed from permission list successfully",
  "data": {
    "departmentName": "engineering",
    "removedUser": {
      "userId": "...",
      "username": "jane_doe",
      "userEmail": "jane@example.com"
    },
    "remainingUsers": 0
  }
}
```

#### GET /permissions/:departmentName
Get the permission list for a department (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "departmentName": "engineering",
    "allowedUsers": [
      {
        "userId": "...",
        "username": "jane_doe",
        "userEmail": "jane@example.com",
        "firstName": "Jane",
        "lastName": "Doe",
        "role": "Employee",
        "department": "Marketing",
        "addedAt": "2024-01-01T00:00:00.000Z",
        "addedBy": "..."
      }
    ],
    "totalUsers": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Codes

- `MISSING_FIELDS`: Required fields are missing
- `KEY_EXISTS`: Private key already exists for department
- `KEY_NOT_FOUND`: Private key not found
- `ACCESS_DENIED`: Access denied (not in same department or permission list)
- `NOT_IN_PERMISSION_LIST`: User is not in the permission list
- `USER_NOT_FOUND`: User not found
- `PERMISSION_NOT_FOUND`: Permission list not found
- `USER_ALREADY_EXISTS`: User already in permission list
- `USER_NOT_IN_LIST`: User not found in permission list
- `NO_TOKEN`: Authentication token missing
- `INVALID_TOKEN`: Invalid or expired token
- `AUTH_ERROR`: Authentication error

## Database Models

### PrivateKey
- `privateKey`: Encrypted private key string
- `departmentName`: Department name (unique, indexed)
- `username`: Username who stored the key
- `userEmail`: Email of user who stored the key
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Permission
- `departmentName`: Department name (unique, indexed)
- `allowedUsers`: Array of allowed users with userId, username, userEmail, addedAt, addedBy
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Security

- Private keys are stored as-is (assumed to be encrypted before sending)
- JWT authentication required for retrieving keys and managing permissions
- Department-based access control
- Permission list for cross-department access
- User validation before adding to permission list

## Integration

This server runs separately from the main application server but uses the same:
- MongoDB database
- JWT secret for authentication
- User model for user validation

Make sure both servers can access the same MongoDB instance and use the same JWT_SECRET.


