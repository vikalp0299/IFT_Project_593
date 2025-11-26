# Time-to-Hold Feature - Quick Reference

## What is Time-to-Hold?

Automatically revokes file access from other organizations after a specified time period, keeping only the uploader's organization access.

## Key Features

✅ **Automatic Cleanup**: Runs every 5 minutes  
✅ **Selective Revocation**: Only removes access from non-uploader organizations  
✅ **Encrypted Key Management**: Removes encryption keys along with access  
✅ **Comprehensive Logging**: Full audit trail of all operations  
✅ **Manual Control**: Admin APIs for testing and management  

## Quick Start

### 1. The cron job starts automatically with the server

```bash
npm start
# You'll see: ⏰ Time-to-hold cleanup cron job started (runs every 5 minutes)
```

### 2. Check status via API

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/cron/time-to-hold/status
```

### 3. Manually trigger cleanup (Admin only)

```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8080/api/cron/time-to-hold/trigger
```

### 4. Run test suite

```bash
node cron/testTimeToHold.js
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cron/time-to-hold/status` | User | View expired and active files |
| POST | `/api/cron/time-to-hold/trigger` | Admin | Manually trigger cleanup |
| PUT | `/api/cron/time-to-hold/:fileId` | Admin/Manager | Update hold time for file |

## How Access Revocation Works

### Before Cleanup
```
File: document.pdf
├── Uploader: user@acme-corp
├── toHoldTime: 2025-11-24 10:00:00 (EXPIRED)
├── accessRights:
│   ├── acme-corp (uploader's org)
│   ├── partner-org
│   └── vendor-inc
└── encryptedSymmetricKeys:
    ├── acme-corp: key1
    ├── partner-org: key2
    └── vendor-inc: key3
```

### After Cleanup
```
File: document.pdf
├── Uploader: user@acme-corp
├── toHoldTime: 2025-11-24 10:00:00 (EXPIRED)
├── accessRights:
│   └── acme-corp (uploader's org) ✅
└── encryptedSymmetricKeys:
    └── acme-corp: key1 ✅
```

## Log Output Examples

### Normal Operation
```
🕒 [TIME-TO-HOLD CLEANUP] Starting scheduled cleanup...
📋 [TIME-TO-HOLD CLEANUP] Found 2 expired file(s) to process
🔒 [TIME-TO-HOLD CLEANUP] Processing file: document.pdf (673d...)
   Uploader organization: acme-corp (673d...)
   ✅ Access revoked from 2 organization(s)
   📊 Before: [acme-corp, partner-org, vendor-inc]
   📊 After: [acme-corp]
   🔑 Encrypted keys: 1 remaining
✅ [TIME-TO-HOLD CLEANUP] Completed in 145ms. Processed: 2, Errors: 0
```

### No Files to Process
```
🕒 [TIME-TO-HOLD CLEANUP] Starting scheduled cleanup...
✅ [TIME-TO-HOLD CLEANUP] No expired files found
```

## Configuration

### Default Hold Time
Files default to 24 hours from upload:
```javascript
toHoldTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
```

### Cron Schedule
Runs every 5 minutes:
```javascript
const SCHEDULE = '*/5 * * * *';
```

### Customize (in `cron/timeToHoldCleanup.js`)
```javascript
// Change to every 10 minutes
const SCHEDULE = '*/10 * * * *';

// Change to every hour
const SCHEDULE = '0 * * * *';

// Change to every day at midnight
const SCHEDULE = '0 0 * * *';
```

## Troubleshooting

### Problem: Cron job not running
**Solution**: Check server startup logs for "Time-to-hold cleanup cron job started"

### Problem: Files not being cleaned
**Check**:
1. Is `toHoldTime` in the past?
2. Does file have multiple organizations in `accessRights`?
3. Is MongoDB connection active?

**Quick fix**: Manually trigger cleanup via API

### Problem: Wrong organization's access removed
**Check**: Verify `uploader` field points to correct user with correct organization

## File Structure

```
IFT_Project_593/
├── cron/
│   ├── timeToHoldCleanup.js    # Main cron job
│   └── testTimeToHold.js       # Test suite
├── router/
│   └── cronRouter.js           # API endpoints
├── models/
│   └── File.js                 # toHoldTime field
├── server.js                   # Cron initialization
└── TIME_TO_HOLD_GUIDE.md       # Full documentation
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Cron job initialization message appears
- [ ] Status API returns current state
- [ ] Manual trigger works (admin only)
- [ ] Test script creates and cleans test files
- [ ] Logs show cleanup operations
- [ ] Only uploader's org retains access after cleanup
- [ ] Encrypted keys are properly removed

## Monitoring Commands

```bash
# View recent logs
tail -f logs/app.log | grep "TIME-TO-HOLD"

# Count successful cleanups today
grep "TIME-TO-HOLD CLEANUP.*Completed" logs/app.log | grep "$(date +%Y-%m-%d)" | wc -l

# Check for errors
grep "TIME-TO-HOLD CLEANUP.*Error" logs/error.log
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start server: `npm start`
3. ✅ Verify cron job started in logs
4. ✅ Test with: `node cron/testTimeToHold.js`
5. ✅ Check status API
6. ✅ Monitor logs for automatic cleanups

## Support

For detailed documentation, see `TIME_TO_HOLD_GUIDE.md`

---

**Last Updated**: November 25, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
