# IPFS Integration for File Storage

## Overview

The backend now uses IPFS (InterPlanetary File System) as the primary storage method for encrypted files, with automatic fallback to local filesystem storage if IPFS is unavailable.

## Features

- **Primary IPFS Storage**: All encrypted files are automatically uploaded to IPFS
- **Automatic Fallback**: If IPFS is unavailable, files are stored locally
- **Seamless Retrieval**: Downloads automatically try IPFS first, then fall back to local storage
- **Backwards Compatible**: Existing files stored locally continue to work
- **IPFS CID Tracking**: File metadata includes IPFS Content Identifiers (CIDs)

## Architecture

### Storage Flow

1. **Upload Process**:
   - File chunks are reassembled
   - File is encrypted with AES-256-GCM
   - System checks if IPFS is available
   - If IPFS available: Upload encrypted file to IPFS and store CID
   - If IPFS unavailable: Store encrypted file locally
   - Local copy is kept as backup even after IPFS upload

2. **Download Process**:
   - Check file metadata for storage type
   - If stored in IPFS: Download from IPFS using CID
   - If IPFS download fails: Fall back to local file
   - If stored locally: Read from local filesystem

### Database Schema

New fields added to File model:
```javascript
{
  ipfsCid: String,           // IPFS Content Identifier (null if local-only)
  storageType: String,       // 'ipfs' or 'local'
  // ... existing fields
}
```

## IPFS Configuration

### Docker Setup

The IPFS node runs in Docker with the following configuration:

```yaml
# docker-compose.yml
services:
  ipfs:
    image: ipfs/kubo:latest
    ports:
      - "4001:4001"     # P2P network
      - "5001:5001"     # API
      - "8080:8080"     # Gateway
```

### Environment Variables

Add to your `.env` file:

```env
# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080
```

### Starting IPFS

```bash
cd IPFS
./start-ipfs.sh
```

Or manually:

```bash
cd IPFS
docker-compose up -d
```

### Verify IPFS is Running

```bash
curl http://localhost:5001/api/v0/id
```

## API Endpoints

No changes to existing API endpoints. The IPFS integration is transparent to the frontend.

## File Upload Flow

```
1. Frontend sends chunked file upload
2. Backend assembles chunks
3. Backend encrypts file
4. Backend checks IPFS availability
   ├─ IPFS available
   │  ├─ Upload to IPFS
   │  ├─ Get CID
   │  ├─ Store metadata with CID
   │  └─ Keep local backup
   └─ IPFS unavailable
      ├─ Store locally
      └─ Store metadata with storageType='local'
5. Return success to frontend
```

## File Download Flow

```
1. Frontend requests file download
2. Backend checks file metadata
   ├─ storageType === 'ipfs'
   │  ├─ Try download from IPFS using CID
   │  │  ├─ Success: Return file
   │  │  └─ Fail: Fall back to local file
   │  └─ Return encrypted file to frontend
   └─ storageType === 'local'
      ├─ Read from local filesystem
      └─ Return encrypted file to frontend
3. Frontend decrypts file client-side
```

## Monitoring & Logs

### IPFS Status Logs

```javascript
// Upload attempt
'IPFS is available, uploading encrypted file...'
'✅ File uploaded to IPFS: QmXxx...'

// Fallback
'⚠️ IPFS not available, using local storage'
'IPFS upload failed, falling back to local storage: [error]'
```

### Download Logs

```javascript
// IPFS download
'Attempting to download file from IPFS: QmXxx...'
'✅ File downloaded from IPFS'

// Fallback
'IPFS download failed, falling back to local storage: [error]'
'Reading file from local storage'
```

## Troubleshooting

### IPFS Not Starting

```bash
# Check Docker logs
docker-compose logs ipfs

# Restart IPFS
docker-compose restart ipfs
```

### Files Not Uploading to IPFS

1. Check IPFS is running: `curl http://localhost:5001/api/v0/id`
2. Check backend logs for IPFS errors
3. Verify ports 4001, 5001, 8080 are not in use by other services

### Cannot Download from IPFS

1. Check IPFS gateway is accessible: `curl http://localhost:8080/ipfs/[CID]`
2. System will automatically fall back to local storage
3. Check file metadata to see `storageType` and `ipfsCid` fields

## Performance Considerations

### Upload Performance

- IPFS uploads add ~500ms-2s to upload time (depending on file size)
- Asynchronous upload prevents blocking
- Local copy serves as immediate backup

### Download Performance

- IPFS downloads are typically faster for frequently accessed files (caching)
- Local fallback ensures availability even if IPFS is slow/down
- First request may be slower, subsequent requests benefit from IPFS caching

### Storage Space

- Files are stored in both IPFS and local filesystem
- To free local space after IPFS upload, uncomment line in `completeUpload`:
  ```javascript
  // Delete local file after successful IPFS upload
  await fs.unlink(finalFilePath).catch(() => {});
  ```

## Security

### File Encryption

- All files are encrypted BEFORE uploading to IPFS
- Symmetric keys are encrypted with department public keys
- IPFS only stores encrypted ciphertext

### Access Control

- Access control is enforced at application level
- Even with IPFS CID, files cannot be decrypted without department private key
- CIDs are stored in database with access controls

## Blockchain Integration

Files uploaded to IPFS include the CID in blockchain metadata:

```javascript
{
  fileId: "...",
  filename: "document.pdf",
  ipfsCid: "QmXxx...",  // Actual IPFS CID
  storageType: "ipfs",
  // ... other metadata
}
```

## Migration Guide

### Existing Files

Existing files stored locally will continue to work:
- `storageType: 'local'`
- `ipfsCid: null`
- Downloads use local filesystem

### New Files

All new uploads attempt IPFS storage:
- `storageType: 'ipfs'` (if successful)
- `ipfsCid: 'QmXxx...'` (actual CID)
- Downloads try IPFS first, fall back to local

No manual migration needed - system is fully backwards compatible.

## Future Enhancements

- [ ] Background job to migrate existing files to IPFS
- [ ] IPFS cluster for high availability
- [ ] Content pinning service integration (Pinata, Infura)
- [ ] Automatic local file cleanup after successful IPFS replication
- [ ] IPFS stats and monitoring dashboard

## References

- [IPFS Documentation](https://docs.ipfs.tech/)
- [IPFS HTTP API](https://docs.ipfs.tech/reference/kubo/rpc/)
- [Docker IPFS](https://hub.docker.com/r/ipfs/kubo)
