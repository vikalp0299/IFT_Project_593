# Models Directory

This directory contains Mongoose schema definitions for MongoDB collections. Models define the structure, validation, and relationships of data stored in the database.

## Files Overview

### `User.js`
Defines the schema for user accounts and authentication.

#### Schema Fields:

**`username`** (String, required, unique)
- User's unique identifier for login
- **Validation**: 
  - Required field
  - Must be unique across all users
  - Trimmed (whitespace removed)
- **Usage**: Primary identifier for user authentication
- **Storage**: Stored in lowercase for case-insensitive matching

**`email`** (String, required, unique)
- User's email address
- **Validation**:
  - Required field
  - Must be unique across all users
  - Must match email format (validated in controller)
  - Trimmed and stored in lowercase
- **Usage**: Alternative login identifier, communication

**`password`** (String, required)
- User's hashed password
- **Security**: 
  - Never stored as plain text
  - Hashed using bcrypt with 10-round salt
  - Minimum 6 characters (enforced in controller)
- **Note**: Plain password validated in controller before hashing

**`createdAt`** (Date)
- Timestamp of account creation
- **Default**: Current date/time when document is created
- **Usage**: Account age tracking, analytics

**`lastLogin`** (Date, optional)
- Timestamp of most recent successful login
- **Updated**: On each successful login in `loginFunction`
- **Usage**: Activity tracking, security monitoring

#### Model Export:
```javascript
const User = mongoose.model('User', userSchema);
export default User;
```

#### Collection Name:
- MongoDB collection: `users` (Mongoose pluralizes automatically)

#### Example Document:
```json
{
  "_id": ObjectId("..."),
  "username": "johndoe",
  "email": "john@example.com",
  "password": "$2a$10$...",  // bcrypt hash
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "lastLogin": ISODate("2024-01-20T14:22:00Z")
}
```

---

### `File.js`
Defines the schema for uploaded file metadata and access control.

#### Schema Fields:

**`filename`** (String, required)
- Server-generated unique identifier (UUID)
- **Purpose**: Actual name of file stored on filesystem
- **Format**: UUID v4 (e.g., `abc-123-def-456`)
- **Usage**: Prevents filename collisions, enhances security
- **Trimmed**: Yes

**`originalname`** (String, required)
- User's original filename when uploaded
- **Purpose**: Display name for users
- **Example**: `"report.pdf"`, `"photo.jpg"`
- **Usage**: Shown in file lists, download prompts

**`mimetype`** (String, required)
- File's MIME type
- **Detection**: Auto-detected using `mime-types` package
- **Examples**: 
  - `"application/pdf"`
  - `"image/jpeg"`
  - `"text/plain"`
  - `"application/octet-stream"` (unknown)
- **Usage**: File type identification, icon display, download handling

**`size`** (Number, required)
- File size in bytes
- **Type**: Integer (Number)
- **Usage**: Display file size to users, quota management
- **Format**: Convert to KB/MB/GB for display

**`path`** (String, required)
- Relative path to file from project root
- **Format**: `"uploads/<userId>/<uploadId>"`
- **Example**: `"uploads/507f1f77bcf86cd799439011/abc-123-def"`
- **Usage**: File retrieval, access control
- **Security**: Server-generated only (never from client)

**`userId`** (ObjectId, required, ref: 'User')
- Primary reference to file owner
- **Type**: MongoDB ObjectId
- **Reference**: Points to User collection
- **Source**: Extracted from JWT token (`req.user.userId`)
- **Usage**: File ownership queries, access control
- **Index**: Should be indexed for query performance

**`uploader`** (ObjectId, required, ref: 'User')
- Secondary reference to file uploader
- **Type**: MongoDB ObjectId
- **Reference**: Points to User collection
- **Purpose**: Backward compatibility with older code
- **Convention**: Always set to same value as `userId`
- **Note**: Dual field pattern for compatibility

**`access`** (Array of ObjectIds, ref: 'User')
- List of user IDs who can access this file
- **Type**: Array of MongoDB ObjectId references
- **Default**: Empty array `[]`
- **Purpose**: File sharing functionality (future feature)
- **Usage**: 
  - Empty = private (only owner)
  - Contains user IDs = shared with those users
- **Note**: Not yet enforced in controllers

**`uploadedAt`** (Date)
- Timestamp when file was uploaded
- **Default**: Current date/time (`Date.now`)
- **Usage**: Sort files by upload date, activity tracking

**`toHoldTime`** (Date)
- Timestamp when file should be deleted
- **Default**: 24 hours from upload (`Date.now + 24h`)
- **Purpose**: Automatic cleanup of temporary files
- **Usage**: Cron job for file expiration
- **Note**: Cleanup mechanism not yet implemented

#### Model Export:
```javascript
const File = mongoose.model('File', fileSchema);
export default File;
```

#### Collection Name:
- MongoDB collection: `files`

#### Example Document:
```json
{
  "_id": ObjectId("..."),
  "filename": "abc-123-def-456",
  "originalname": "quarterly-report.pdf",
  "mimetype": "application/pdf",
  "size": 2457600,  // bytes (2.4 MB)
  "path": "uploads/507f1f77bcf86cd799439011/abc-123-def-456",
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "uploader": ObjectId("507f1f77bcf86cd799439011"),
  "access": [],  // or [ObjectId("..."), ObjectId("...")]
  "uploadedAt": ISODate("2024-01-20T15:45:00Z"),
  "toHoldTime": ISODate("2024-01-21T15:45:00Z")  // 24h later
}
```

---

## Relationships

### User → Files (One-to-Many)
```javascript
// Find all files uploaded by a user
const userFiles = await File.find({ userId: user._id });

// Find user who uploaded a file
const file = await File.findById(fileId).populate('userId');
console.log(file.userId.username);  // Access user data
```

### File Sharing (Many-to-Many potential)
```javascript
// Share file with multiple users
await File.findByIdAndUpdate(fileId, {
  $push: { access: { $each: [userId1, userId2] } }
});

// Find files shared with a user
const sharedFiles = await File.find({
  access: { $in: [userId] }
});
```

---

## Querying Patterns

### Find User Files (Using Dual Fields)
```javascript
// Backward compatible query (checks both userId and uploader)
const files = await File.find({
  $or: [
    { userId: authenticatedUserId },
    { uploader: authenticatedUserId }
  ]
}).sort({ uploadedAt: -1 });
```

### File Search with Filters
```javascript
// Find PDFs uploaded by user in last 7 days
const recentPDFs = await File.find({
  userId: userId,
  mimetype: 'application/pdf',
  uploadedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
});
```

### User Lookup
```javascript
// Case-insensitive login lookup
const user = await User.findOne({
  $or: [
    { username: identity.toLowerCase() },
    { email: identity.toLowerCase() }
  ]
});
```

---

## Validation

### Schema-Level Validation
- **Required fields**: Enforced by Mongoose (returns validation error)
- **Unique constraints**: Enforced by MongoDB indexes
- **Type checking**: Mongoose validates data types

### Controller-Level Validation
Additional validation happens in controllers:
- Email format (regex)
- Password strength (length, complexity)
- File size limits
- Filename sanitization

---

## Indexes

### Recommended Indexes:
```javascript
// User model
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

// File model
db.files.createIndex({ userId: 1 });  // Fast user file queries
db.files.createIndex({ uploadedAt: -1 });  // Sort by date
db.files.createIndex({ toHoldTime: 1 });  // Expiration cleanup
```

---

## Security Considerations

### Password Storage
- **Never** store plain text passwords
- Always hash with bcrypt before saving
- Salt rounds: 10 (configurable)

### File Path Security
- Paths are server-generated (never from client)
- User ID from verified JWT token
- UUID prevents path traversal attacks

### User Data Privacy
- Files are user-isolated by default
- Query filters always include userId
- Access array allows controlled sharing

---

## ES Module Convention
All model files use ES modules:
```javascript
import mongoose from 'mongoose';  // ✓ Correct
const mongoose = require('mongoose');  // ✗ Wrong

export default User;  // ✓ Correct
module.exports = User;  // ✗ Wrong
```

---

## Future Enhancements

### Planned Features:
1. **File Sharing**: Implement `access` array enforcement
2. **File Expiration**: Cron job using `toHoldTime`
3. **File Versioning**: Track file revisions
4. **Storage Quotas**: User disk space limits
5. **File Categories**: Add tags/folders
6. **Encryption**: Store encrypted files with keys

### Potential Schema Changes:
```javascript
// Future fields
isEncrypted: { type: Boolean, default: false },
encryptionKey: { type: String },  // encrypted with user's key
category: { type: String, enum: ['document', 'image', 'video', 'other'] },
tags: [{ type: String }],
version: { type: Number, default: 1 },
previousVersions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }]
```
