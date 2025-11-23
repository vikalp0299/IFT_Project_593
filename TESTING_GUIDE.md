# Frontend Testing Guide - File Edit Proposals

## Quick Start

### 1. Start Backend Server
```bash
cd /Users/warlord/Desktop/IFT_Project_593
npm start
```
Backend runs on: `http://localhost:3000`

### 2. Start Frontend Development Server
```bash
cd /Users/warlord/Desktop/IFT_Project_593/front-end/safe-front-end
npm run dev
```
Frontend runs on: `http://localhost:5173` (or next available port)

## Test Workflow

### Scenario: Multi-Organization File Edit Approval

#### Setup (Already Complete)
- ✅ Blockchain: `test` channel with `asset` chaincode
- ✅ Organizations: `sun` and `vik`
- ✅ Backend: All 5 edit proposal endpoints working
- ✅ Frontend: Complete UI implementation

#### Step 1: Create Test File (User from sun organization)
1. Login to frontend as `sun` user
2. Navigate to User Home Page
3. Click "Upload File"
4. Upload a `.txt` file
5. **Important:** Enable "Require multi-signature for edits"
6. Select required organizations: `sun` and `vik`
7. Share with at least one department
8. Upload file

#### Step 2: Edit the File (sun user)
1. On User Home Page, find the uploaded text file
2. Click the **"Edit"** button (only visible for text files)
3. Make changes in the textarea
4. Click **"Preview Changes"**
5. Review the diff:
   - Green lines = added
   - Red lines = removed
   - Yellow/Blue lines = modified
6. Click **"Submit Proposal"**
7. **Result:** Proposal created, `sun` automatically approved

#### Step 3: View Pending Approvals (vik user)
1. Logout from `sun` account
2. Login as user from `vik` organization
3. Click **"📋 Pending Approvals"** button in header
4. See the file with pending proposal
5. Click **"Review Proposal"**

#### Step 4: Review and Approve (vik user)
1. View approval status grid:
   - `sun`: ✓ Approved (green)
   - `vik`: ⏳ Pending (yellow)
2. View changes summary:
   - X lines added
   - Y lines removed
   - Z lines modified
3. Scroll through detailed diff viewer
4. Click **"Approve"** button
5. **Result:** Proposal approved by `vik`

#### Step 5: Verify Activation
1. Proposal should automatically activate (all required orgs approved)
2. Backend logs should show:
   - ActivateProposal chaincode function called
   - Old file replaced with new file
   - Proposal status updated on blockchain
3. File content should now reflect the edited version

### Alternative: Reject Proposal
In Step 4, instead of approving:
1. Click **"Reject"** button
2. Enter rejection reason (required)
3. Click **"Confirm Rejection"**
4. **Result:** Proposal cancelled, approvals cleared

## Testing Individual Components

### Test Text Editor
**URL:** `/edit-file/:fileId`
```
Expected behavior:
- Loads file content in textarea
- Shows "Preview Changes" button when content is modified
- Displays diff view in preview mode
- Shows summary statistics (added/removed/modified lines)
- Submits proposal successfully
```

### Test Pending Approvals List
**URL:** `/pending-approvals`
```
Expected behavior:
- Lists all files with pending proposals for user's organization
- Shows file metadata (name, size, type)
- Shows proposer information
- Shows current approval status
- Shows list of organizations that have approved
- "Review Proposal" button navigates to review page
```

### Test Proposal Review
**URL:** `/proposal-review/:fileId/:proposalId`
```
Expected behavior:
- Displays file information
- Shows approval status for all required organizations
- Shows changes summary with statistics
- Displays detailed diff viewer
- Approve button adds organization's approval
- Reject button requires reason input
- Successfully submits approval/rejection
```

## API Endpoints Reference

### Get File Content (for editing)
```bash
curl -X GET http://localhost:3000/files/:fileId/content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Edit Proposal
```bash
curl -X POST http://localhost:3000/files/:fileId/propose-edit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "originalContent=Original file text" \
  -F "newContent=Modified file text" \
  -F "encryptedNewFile=@new-file.txt"
```

### Approve Edit
```bash
curl -X POST http://localhost:3000/files/:fileId/approve-edit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": "PROPOSAL_ID"}'
```

### Reject Edit
```bash
curl -X POST http://localhost:3000/files/:fileId/reject-edit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": "PROPOSAL_ID", "reason": "Rejection reason"}'
```

### Get Pending Approvals
```bash
curl -X GET http://localhost:3000/files/pending-edits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Proposal Details
```bash
curl -X GET http://localhost:3000/files/:fileId/proposal/:proposalId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Debugging Tips

### Check Browser Console
```javascript
// All API calls are logged
// Look for:
// - Request URLs
// - Response data
// - Error messages
```

### Check Network Tab
```
Filter by XHR/Fetch requests
Look for:
- /files/:fileId/content
- /files/:fileId/propose-edit
- /files/:fileId/approve-edit
- /files/:fileId/reject-edit
- /files/pending-edits
- /files/:fileId/proposal/:proposalId
```

### Common Issues

#### "Edit" button not showing
- **Cause:** File is not a text file
- **Check:** `file.mimetype` should start with `text/`
- **Solution:** Only upload `.txt` files for testing

#### Pending approvals list is empty
- **Cause:** No files with active proposals requiring user's org
- **Solution:** Create a proposal from another organization

#### Approval doesn't activate proposal
- **Cause:** Not all required organizations have approved yet
- **Check:** Backend logs for activation attempt
- **Solution:** Ensure all required orgs have approved

#### API returns 401 Unauthorized
- **Cause:** JWT token expired or missing
- **Solution:** Re-login to get fresh token

#### Diff viewer shows no changes
- **Cause:** Original and new content are identical
- **Solution:** Make actual changes to file content

## Blockchain Verification

### Check Proposal on Blockchain
```bash
# SSH into blockchain pod
kubectl exec -it <fabric-pod> -- bash

# Query proposal
peer chaincode query \
  -C test \
  -n asset \
  -c '{"Args":["GetEditApprovals","FILE_ID","PROPOSAL_ID"]}'
```

### Expected Blockchain Response
```json
{
  "proposalId": "PROPOSAL_ID",
  "proposedBy": "sunMSP",
  "approvals": {
    "sunMSP": true,
    "vikMSP": true
  },
  "requiredOrgs": ["sunMSP", "vikMSP"],
  "status": "active"  // or "pending"
}
```

## Success Criteria

- ✅ Edit button appears only on text files
- ✅ Text editor loads file content correctly
- ✅ Diff calculation shows accurate changes
- ✅ Proposal submission succeeds
- ✅ Proposer's org is auto-approved
- ✅ Pending approvals list shows the file
- ✅ Review page displays all proposal details
- ✅ Diff viewer renders correctly
- ✅ Approval adds organization to approved list
- ✅ Rejection cancels proposal
- ✅ Full approval activates proposal
- ✅ File content updates after activation

## Performance Notes

- Large files (>1MB) may take longer to load
- Diff calculation is done client-side (instant for <10K lines)
- File encryption/decryption happens on backend
- API requests typically complete in <500ms

## Browser DevTools

### Recommended Extensions
- React Developer Tools - Inspect component state
- Redux DevTools - If using Redux (not needed here)

### Storage Inspection
```
Application Tab → Local Storage
- Look for JWT token
- Check user data
```

### Network Throttling
```
Network Tab → Throttling
- Test with slow 3G to simulate real-world
- Ensure loading states work correctly
```

## End-to-End Test Script

```bash
# 1. Start backend
cd /Users/warlord/Desktop/IFT_Project_593
npm start &

# 2. Start frontend
cd front-end/safe-front-end
npm run dev &

# 3. Open browser
open http://localhost:5173

# 4. Follow test workflow above
# - Login as sun user
# - Upload text file with multi-sig
# - Edit file
# - Submit proposal
# - Logout
# - Login as vik user
# - View pending approvals
# - Approve proposal
# - Verify activation
```

## Contact/Support

For issues or questions:
1. Check backend logs: `npm start` output
2. Check frontend console: Browser DevTools
3. Check blockchain logs: `kubectl logs <pod-name>`
4. Review implementation docs: `FRONTEND_EDIT_IMPLEMENTATION.md`

---

**Last Updated:** November 22, 2025
**Status:** Ready for Testing
**Backend:** ✅ Complete
**Frontend:** ✅ Complete
**Blockchain:** ✅ Deployed and Functional
