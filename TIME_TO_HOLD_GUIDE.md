# Time-to-Hold Feature Documentation

## Overview

The **Time-to-Hold** feature automatically manages temporary file access permissions across organizations. When a file's hold period expires, the system automatically revokes access from all organizations except the uploader's organization.

## How It Works

### Automatic Cleanup Process

1. **Cron Job Schedule**: Runs every 5 minutes
2. **File Selection**: Identifies files where `toHoldTime` has passed
3. **Organization Detection**: Determines the uploader's organization
4. **Access Revocation**: Removes all `accessRights` and `encryptedSymmetricKeys` from other organizations
5. **Logging**: Comprehensive logging of all operations

### File Model Schema

Each file has the following time-to-hold related fields:

```javascript
{
  toHoldTime: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  accessRights: [
    {
      organizationId: ObjectId,
      organizationName: String,
      departmentId: ObjectId,
      departmentName: String
    }
  ],
  encryptedSymmetricKeys: [
    {
      organizationId: ObjectId,
      organizationName: String,
      departmentId: ObjectId,
      encryptedKey: String
    }
  ]
}
```

## API Endpoints

### 1. Get Time-to-Hold Status

**Endpoint**: `GET /api/cron/time-to-hold/status`  
**Authentication**: Required  
**Description**: Returns the current status of files and their hold times

**Response Example**:
```json
{
  "success": true,
  "data": {
    "currentTime": "2025-11-25T10:30:00.000Z",
    "expired": {
      "count": 3,
      "files": [
        {
          "id": "673d8f9a1234567890abcdef",
          "filename": "document.pdf",
          "toHoldTime": "2025-11-24T10:00:00.000Z",
          "uploaderOrg": "acme-corp",
          "organizationsWithAccess": 3,
          "organizations": ["acme-corp", "partner-org", "vendor-inc"]
        }
      ]
    },
    "active": {
      "count": 15,
      "files": [
        {
          "id": "673d8f9a1234567890abcd00",
          "filename": "report.docx",
          "toHoldTime": "2025-11-26T14:00:00.000Z",
          "timeRemaining": 100800000,
          "uploaderOrg": "acme-corp",
          "organizationsWithAccess": 2
        }
      ]
    }
  }
}
```

### 2. Manually Trigger Cleanup

**Endpoint**: `POST /api/cron/time-to-hold/trigger`  
**Authentication**: Required (Admin only)  
**Description**: Manually triggers the cleanup process

**Response Example**:
```json
{
  "success": true,
  "message": "Cleanup process triggered successfully",
  "triggeredBy": "admin_user",
  "triggeredAt": "2025-11-25T10:30:00.000Z"
}
```

### 3. Update File Hold Time

**Endpoint**: `PUT /api/cron/time-to-hold/:fileId`  
**Authentication**: Required (Admin/Manager only)  
**Description**: Updates the toHoldTime for a specific file

**Request Body**:
```json
{
  "toHoldTime": "2025-11-30T12:00:00.000Z"
}
```

**Response Example**:
```json
{
  "success": true,
  "message": "toHoldTime updated successfully",
  "data": {
    "fileId": "673d8f9a1234567890abcdef",
    "filename": "document.pdf",
    "oldToHoldTime": "2025-11-25T10:00:00.000Z",
    "newToHoldTime": "2025-11-30T12:00:00.000Z",
    "updatedBy": "admin_user"
  }
}
```

## Implementation Details

### Cron Job Configuration

**File**: `cron/timeToHoldCleanup.js`

- **Schedule**: `*/5 * * * *` (every 5 minutes)
- **Timezone**: UTC
- **Auto-start**: Runs on server initialization
- **Graceful shutdown**: Stops during server shutdown

### Logging

The system provides comprehensive logging at multiple levels:

#### Startup Logs
```
🚀 [TIME-TO-HOLD CLEANUP] Initializing cron job...
   Schedule: Every 5 minutes (*/5 * * * *)
   Running initial cleanup check...
```

#### Execution Logs
```
🕒 [TIME-TO-HOLD CLEANUP] Starting scheduled cleanup...
📋 [TIME-TO-HOLD CLEANUP] Found 3 expired file(s) to process
🔒 [TIME-TO-HOLD CLEANUP] Processing file: document.pdf (673d8f9a1234567890abcdef)
   Uploader organization: acme-corp (673d8f9a1234567890abc000)
   ✅ Access revoked from 2 organization(s)
   📊 Before: [acme-corp, partner-org, vendor-inc]
   📊 After: [acme-corp]
   🔑 Encrypted keys: 1 remaining
✅ [TIME-TO-HOLD CLEANUP] Completed in 245ms. Processed: 3, Errors: 0
```

#### Error Logs
```
❌ [TIME-TO-HOLD CLEANUP] Error processing file 673d8f9a1234567890abcdef: Error message
```

### Security Considerations

1. **Access Control**: Only uploader's organization retains access
2. **Encryption Keys**: Symmetric keys for other organizations are removed
3. **Audit Trail**: All operations are logged with timestamps and user details
4. **Admin Override**: Admins can manually trigger cleanup or extend hold times

## Usage Examples

### Setting Custom Hold Time When Uploading

When uploading a file through the frontend, you can specify a custom `toHoldTime`:

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('toHoldTime', new Date(Date.now() + 48 * 60 * 60 * 1000)); // 48 hours

await axios.post('/api/upload', formData);
```

### Extending Hold Time (Admin/Manager)

```javascript
await axios.put(`/api/cron/time-to-hold/${fileId}`, {
  toHoldTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Extend by 7 days
});
```

### Checking Status

```javascript
const response = await axios.get('/api/cron/time-to-hold/status');
console.log('Expired files:', response.data.expired.count);
console.log('Active files:', response.data.active.count);
```

### Manual Cleanup (Admin Only)

```javascript
await axios.post('/api/cron/time-to-hold/trigger');
```

## Testing

### Test Scenario 1: Create and Expire a File

```javascript
// 1. Upload a file with short hold time
const file = await uploadFile({ toHoldTime: new Date(Date.now() + 60000) }); // 1 minute

// 2. Share with another organization
await shareFile(file.id, 'partner-org');

// 3. Wait for expiration
await sleep(70000); // 70 seconds

// 4. Check status
const status = await getTimeToHoldStatus();
// File should appear in 'expired' list

// 5. Trigger cleanup
await triggerManualCleanup();

// 6. Verify access revoked
const fileData = await getFile(file.id);
// Should only have uploader's organization in accessRights
```

### Test Scenario 2: Extend Hold Time

```javascript
// 1. Upload a file
const file = await uploadFile({ toHoldTime: new Date(Date.now() + 60000) });

// 2. Extend before expiration
await updateToHoldTime(file.id, new Date(Date.now() + 86400000)); // Extend to 24 hours

// 3. Verify extension
const status = await getTimeToHoldStatus();
// File should appear in 'active' list with new time
```

## Monitoring

### Key Metrics to Monitor

1. **Processing Time**: Average cleanup execution time
2. **File Count**: Number of expired files per cleanup cycle
3. **Error Rate**: Failures during cleanup
4. **Access Revocations**: Number of organizations removed per file

### Log Analysis

Search for these patterns in logs:

```bash
# Successful cleanups
grep "TIME-TO-HOLD CLEANUP.*Completed" logs/app.log

# Errors
grep "TIME-TO-HOLD CLEANUP.*Error" logs/error.log

# Manual triggers
grep "Manual cleanup triggered" logs/app.log
```

## Troubleshooting

### Issue: Cron job not starting

**Check**:
1. Server logs for initialization errors
2. `node-cron` package installation
3. MongoDB connection status

**Solution**:
```bash
npm install node-cron
npm start
```

### Issue: Files not being cleaned up

**Check**:
1. Verify `toHoldTime` is in the past
2. Ensure file has multiple organizations in `accessRights`
3. Check cron job is running: `GET /api/cron/time-to-hold/status`

**Solution**:
```javascript
// Manually trigger cleanup
POST /api/cron/time-to-hold/trigger
```

### Issue: Wrong organization's access retained

**Check**:
1. Verify uploader's organization is correctly set
2. Check user-organization association

**Solution**:
Review `uploader` field and populate user organization data correctly.

## Performance Considerations

### Optimization Tips

1. **Batch Processing**: Process files in batches if volume is high
2. **Indexing**: Ensure `toHoldTime` field is indexed
3. **Query Optimization**: Use `$expr` to filter files with multiple access rights
4. **Parallel Processing**: Consider parallel processing for large file sets

### Recommended Indexes

```javascript
// File collection indexes
db.files.createIndex({ toHoldTime: 1 });
db.files.createIndex({ uploader: 1 });
db.files.createIndex({ 'accessRights.organizationId': 1 });
```

## Future Enhancements

1. **Configurable Schedule**: Allow admins to configure cleanup frequency
2. **Notification System**: Alert users before access expiration
3. **Grace Period**: Implement grace period before final cleanup
4. **Audit Logs**: Store access revocation history in separate collection
5. **Batch API**: Process multiple files in a single API call
6. **Dashboard**: Visual interface for monitoring hold times

## Related Files

- `cron/timeToHoldCleanup.js` - Main cron job implementation
- `router/cronRouter.js` - API endpoints for management
- `models/File.js` - File schema with toHoldTime field
- `server.js` - Cron job initialization

## Support

For issues or questions:
1. Check server logs in `logs/` directory
2. Review this documentation
3. Contact system administrator
4. File issue on GitHub repository
