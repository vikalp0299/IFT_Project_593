# Controllers Directory

This directory contains the business logic layer of the application. Controllers handle request processing, data validation, database operations, and response formatting.

## Files Overview

### `loginController.js`
Handles user authentication and authorization logic.

#### Functions:

**`generateToken(userId, username)`**
- **Purpose**: Creates a JWT token for authenticated users
- **Parameters**: 
  - `userId`: MongoDB ObjectId of the user
  - `username`: User's username
- **Returns**: Signed JWT token with 1-hour expiration
- **Usage**: Called after successful login/registration

**`hashPassword(password)`**
- **Purpose**: Securely hashes passwords using bcrypt
- **Parameters**: Plain text password
- **Returns**: Hashed password with salt (10 rounds)
- **Security**: Uses bcrypt's salting mechanism for protection

**`verifyPassword(password, hashedPassword)`**
- **Purpose**: Compares plain password with hashed version
- **Parameters**: 
  - `password`: Plain text password from user
  - `hashedPassword`: Stored hash from database
- **Returns**: Boolean indicating match
- **Usage**: Used during login authentication

**`authenticateToken(req, res, next)` [Middleware]**
- **Purpose**: Validates JWT tokens on protected routes
- **Process**:
  1. Extracts token from `Authorization: Bearer <token>` header
  2. Verifies token using `JWT_SECRET` from environment
  3. Decodes user information (userId, username)
  4. Attaches `req.user` object to request
  5. Calls `next()` if valid, returns 401/403 if invalid
- **Usage**: Applied to all protected routes requiring authentication

**`loginFunction(req, res)` [Async]**
- **Purpose**: Handles user login requests
- **Accepts**: `identity` (email or username) and `password`
- **Process**:
  1. Validates required fields
  2. Queries database for user by email or username (case-insensitive)
  3. Verifies password using bcrypt
  4. Updates `lastLogin` timestamp
  5. Generates JWT token
  6. Returns token and user data
- **Response**: `{ success, token, username, data: { userId, email, lastLogin } }`
- **Errors**: 
  - 400: Missing credentials
  - 401: Invalid credentials
  - 500: Server error

**`registerFunction(req, res)` [Async]**
- **Purpose**: Handles new user registration
- **Accepts**: `username`, `email`, `password`
- **Validation**:
  - Username: 3-20 characters, alphanumeric + underscores
  - Email: Valid email format
  - Password: Minimum 6 characters
  - Uniqueness: Checks for existing username/email
- **Process**:
  1. Validates input fields
  2. Checks for duplicate users
  3. Hashes password
  4. Creates user in database (lowercase email/username)
  5. Generates JWT token
  6. Returns token and user data
- **Response**: `{ success, message, data: { userId, username, email, token } }`
- **Errors**:
  - 400: Invalid input or format
  - 409: User already exists
  - 500: Server error

**`logoutFunction(req, res)`**
- **Purpose**: Placeholder for logout logic
- **Note**: Currently empty - JWT invalidation happens client-side by removing token from storage
- **Future**: Could implement token blacklisting or refresh token revocation

---

### `fileController.js`
Manages file upload, storage, and retrieval operations using chunked upload pattern.

#### Functions:

**`displayAllFiles(req, res)` [Async]**
- **Purpose**: Retrieves all files belonging to authenticated user
- **Authentication**: Requires valid JWT token (userId from `req.user`)
- **Process**:
  1. Extracts userId from authenticated request
  2. Queries MongoDB using `$or` for `userId` and `uploader` fields
  3. Selects specific fields: `filename`, `originalname`, `size`, `uploadedAt`, `path`, `mimetype`
  4. Sorts by upload date (most recent first)
  5. Returns file list with count
- **Response**: `{ success, count, files: [...] }`
- **Errors**: 500 if database query fails
- **Security**: Only returns files belonging to authenticated user

**`initUpload(req, res)` [Async]**
- **Purpose**: Initializes chunked file upload session
- **Step**: 1 of 3-step upload process
- **Accepts**: `filename` (original filename)
- **Authentication**: Requires valid JWT token
- **Process**:
  1. Validates user authentication
  2. Validates filename parameter
  3. Generates unique uploadId (UUID v4)
  4. Creates temporary directory: `temp_uploads/<uploadId>/`
  5. Returns uploadId to client
- **Response**: `{ success, uploadId, message }`
- **Usage**: Client must store uploadId for subsequent chunk uploads
- **Directory**: `temp_uploads/<uploadId>/` created with recursive option

**`uploadChunk` [Array: Middleware + Handler]**
- **Purpose**: Receives and stores individual file chunks
- **Step**: 2 of 3-step upload process (called multiple times)
- **Structure**: `[multer.single('chunk'), async handler]`
- **Middleware**: Multer with memory storage (stores in buffer)
- **Accepts**: 
  - FormData with `chunk` (file blob)
  - `uploadId` (from init step)
  - `chunkIndex` (sequential number)
- **Authentication**: Requires valid JWT token
- **Process**:
  1. Validates authentication and parameters
  2. Receives chunk in memory buffer
  3. Writes chunk to temp directory: `temp_uploads/<uploadId>/chunk_<index>`
  4. Returns confirmation with chunk index
- **Response**: `{ success, received: chunkIndex, message }`
- **Chunk Size**: Client determines (typically 1-5MB)
- **Storage**: Temporary filesystem storage until completion

**`completeUpload(req, res)` [Async]**
- **Purpose**: Reassembles chunks and finalizes upload
- **Step**: 3 of 3-step upload process
- **Accepts**: 
  - `uploadId` (from init step)
  - `originalName` (original filename)
  - `size` (total file size in bytes)
- **Authentication**: Requires valid JWT token
- **Process**:
  1. Validates authentication and parameters
  2. Verifies temp directory exists
  3. Reads all chunk files from temp directory
  4. Sorts chunks by index (chunk_0, chunk_1, ...)
  5. Creates user-specific directory: `uploads/<userId>/`
  6. Reassembles chunks into final file: `uploads/<userId>/<uploadId>`
  7. Detects MIME type using `mime-types` package
  8. Saves file metadata to MongoDB:
     - `filename`: uploadId (UUID)
     - `originalname`: user's original filename
     - `mimetype`: detected MIME type
     - `size`: file size in bytes
     - `path`: relative path (`uploads/<userId>/<uploadId>`)
     - `userId` & `uploader`: authenticated user's ObjectId (dual fields)
     - `access`: empty array (for future sharing)
     - `uploadedAt`: current timestamp
     - `toHoldTime`: 24 hours from now (for cleanup)
  9. Cleans up temp chunk directory
  10. Returns success with file details
- **Response**: `{ success, message, fileId, filename, path, size }`
- **Directory Structure**:
  ```
  uploads/
  ├── <userId1>/
  │   ├── <uploadId1>
  │   └── <uploadId2>
  └── <userId2>/
      └── <uploadId3>
  ```
- **Security**: 
  - User ID from JWT (server-side only)
  - Path traversal prevention
  - User-specific directories
- **Cleanup**: Removes temp directory after successful reassembly

#### Configuration Constants:

- **`TEMP_UPLOAD_DIR`**: `path.resolve('temp_uploads')` - Temporary storage for chunks
- **`UPLOADS_DIR`**: `path.resolve('uploads')` - Final storage for completed files
- **`upload`**: Multer instance with memory storage configuration

#### Upload Flow Example:

