# Quick Test Guide - File Edit Proposals

## Prerequisites
- 3 organizations on blockchain (Org1, Org2, Org3)
- Text file with `editAgreementRequired: true`
- JWT tokens for users from each organization

---

## Test Scenario: 3-Org Multi-Sig Edit Approval

### Step 1: Propose Edit (Org1 User)

```bash
curl -X POST http://localhost:3000/files/FILE_ID/propose-edit \
  -H "Authorization: Bearer ORG1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalContent": "This is the original document content.",
    "newContent": "This is the UPDATED document content.",
    "encryptedNewFile": "<base64 encrypted file>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "proposalId": "proposal-FILE_ID-1234567890",
  "message": "Edit proposal created and auto-approved by your organization",
  "data": {
    "proposalId": "proposal-FILE_ID-1234567890",
    "proposer": "Org1MSP",
    "autoApproved": true
  }
}
```

**Database Verification:**
```javascript
db.files.findOne({ _id: ObjectId("FILE_ID") })
// Should show:
// activeProposalId: "proposal-FILE_ID-1234567890"
// proposedFilePath: "/path/to/new/encrypted/file"
// oldFilePath: "/path/to/original/file"
```

---

### Step 2: Check Pending Edits (Org2 User)

```bash
curl -X GET http://localhost:3000/files/pending-edits \
  -H "Authorization: Bearer ORG2_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "pendingEdits": [{
      "fileId": "FILE_ID",
      "filename": "important_document.txt",
      "mimetype": "text/plain",
      "uploadedBy": { "username": "user1", "email": "user1@org1.com" },
      "uploadedAt": "2024-12-10T09:00:00Z",
      "proposalId": "proposal-FILE_ID-1234567890",
      "requiredOrganizations": [
        { "organizationId": "ORG1_ID", "blockchainOrgName": "Org1" },
        { "organizationId": "ORG2_ID", "blockchainOrgName": "Org2" },
        { "organizationId": "ORG3_ID", "blockchainOrgName": "Org3" }
      ]
    }]
  }
}
```

---

### Step 3: View Proposal Details (Org2 User)

```bash
curl -X GET http://localhost:3000/files/FILE_ID/proposal/proposal-FILE_ID-1234567890 \
  -H "Authorization: Bearer ORG2_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "FILE_ID",
    "proposalId": "proposal-FILE_ID-1234567890",
    "filename": "important_document.txt",
    "mimetype": "text/plain",
    "originalContent": "This is the original document content.",
    "newContent": "This is the UPDATED document content.",
    "proposedBy": "Org1MSP",
    "proposedAt": "2024-12-10T10:00:00Z",
    "approvals": {
      "Org1MSP": true,
      "Org2MSP": false,
      "Org3MSP": false
    },
    "requiredOrgs": ["Org1MSP", "Org2MSP", "Org3MSP"],
    "approvalStatus": [...]
  }
}
```

**Frontend should display:**
- Side-by-side comparison of originalContent vs newContent
- List of approvals (Org1 ✅, Org2 ❌, Org3 ❌)
- Approve and Reject buttons

---

### Step 4: Approve (Org2 User)

```bash
curl -X POST http://localhost:3000/files/FILE_ID/approve-edit \
  -H "Authorization: Bearer ORG2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": "proposal-FILE_ID-1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "fullyApproved": false,
  "message": "Your approval has been recorded. Waiting for other organizations.",
  "data": {
    "fileId": "FILE_ID",
    "proposalId": "proposal-FILE_ID-1234567890",
    "approver": "Org2MSP",
    "result": "Approval added from Org2MSP. Still pending: Org3MSP"
  }
}
```

**Blockchain Verification:**
```bash
kubectl hlf chaincode query --config=network-config.yaml \
  --user=Org2-admin-default --peer=Org2-peer0.default \
  --chaincode=asset --channel=test \
  --fcn=GetEditApprovals -a '["FILE_ID"]'
```

**Expected Blockchain State:**
```json
{
  "editProposal": {
    "proposedMetadata": "{\"originalContent\":\"...\",\"newContent\":\"...\"}",
    "proposedBy": "Org1MSP",
    "proposedAt": "2024-12-10T10:00:00Z"
  },
  "editApprovals": {
    "Org1MSP": true,
    "Org2MSP": true,
    "Org3MSP": false
  },
  "requiredOrgs": ["Org1MSP", "Org2MSP", "Org3MSP"]
}
```

---

### Step 5: Final Approval (Org3 User)

```bash
curl -X POST http://localhost:3000/files/FILE_ID/approve-edit \
  -H "Authorization: Bearer ORG3_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": "proposal-FILE_ID-1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "fullyApproved": true,
  "message": "Edit proposal fully approved and applied",
  "data": {
    "fileId": "FILE_ID",
    "proposalId": "proposal-FILE_ID-1234567890",
    "approver": "Org3MSP",
    "result": "File updated with approval from all required organizations"
  }
}
```

**File System Verification:**
```bash
# Old file should be deleted
ls /path/to/oldFilePath  # Should not exist

# Proposed file should be moved to main path
cat /path/to/file/path  # Should show new content (encrypted)
```

**Database Verification:**
```javascript
db.files.findOne({ _id: ObjectId("FILE_ID") })
// Should show:
// activeProposalId: null
// proposedFilePath: null
// oldFilePath: null
// path: "<original path with new content>"
```

---

## Alternative Test: Rejection Scenario

### Reject Proposal (Any Org)

```bash
curl -X POST http://localhost:3000/files/FILE_ID/reject-edit \
  -H "Authorization: Bearer ORG2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": "proposal-FILE_ID-1234567890",
    "reason": "Changes not appropriate for this document"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Edit proposal rejected. Proposed changes have been discarded.",
  "data": {
    "fileId": "FILE_ID",
    "proposalId": "proposal-FILE_ID-1234567890",
    "rejector": "Org2MSP",
    "reason": "Changes not appropriate for this document",
    "result": "Proposal rejected and cleared from blockchain"
  }
}
```

**File System Verification:**
```bash
# Proposed file should be deleted
ls /path/to/proposedFilePath  # Should not exist

# Original file should remain unchanged
cat /path/to/file/path  # Should show original content
```

**Database Verification:**
```javascript
db.files.findOne({ _id: ObjectId("FILE_ID") })
// Should show:
// activeProposalId: null
// proposedFilePath: null
// oldFilePath: null
// path: "<original path unchanged>"
```

**Blockchain Verification:**
```bash
kubectl hlf chaincode query --config=network-config.yaml \
  --user=Org1-admin-default --peer=Org1-peer0.default \
  --chaincode=asset --channel=test \
  --fcn=GetEditApprovals -a '["FILE_ID"]'
```

**Expected Result:**
```json
{
  "editProposal": null,
  "editApprovals": {},
  "requiredOrgs": []
}
```

---

## Error Cases to Test

### 1. Non-Text File
```bash
curl -X POST http://localhost:3000/files/IMAGE_FILE_ID/propose-edit \
  -H "Authorization: Bearer ORG1_TOKEN" \
  -d '{ ... }'

# Expected: 400 Bad Request
# Message: "Only text files can be edited"
```

### 2. Duplicate Proposal
```bash
# Create first proposal
curl -X POST http://localhost:3000/files/FILE_ID/propose-edit ...

# Try to create second proposal
curl -X POST http://localhost:3000/files/FILE_ID/propose-edit ...

# Expected: 400 Bad Request
# Message: "This file already has an active edit proposal"
```

### 3. Unauthorized Access
```bash
curl -X GET http://localhost:3000/files/FILE_ID/proposal/PROPOSAL_ID \
  -H "Authorization: Bearer ORG4_TOKEN"  # Org not in editAgreementOrganizations

# Expected: 403 Forbidden
# Message: "You do not have permission to view this proposal"
```

### 4. Invalid Proposal ID
```bash
curl -X POST http://localhost:3000/files/FILE_ID/approve-edit \
  -H "Authorization: Bearer ORG2_TOKEN" \
  -d '{ "proposalId": "invalid-proposal-id" }'

# Expected: 400 Bad Request
# Message: "Proposal ID mismatch or proposal not found"
```

---

## Monitoring Commands

### Check MongoDB State
```javascript
// All files with active proposals
db.files.find({ activeProposalId: { $ne: null } })

// Specific file
db.files.findOne({ _id: ObjectId("FILE_ID") }, {
  originalname: 1,
  activeProposalId: 1,
  proposedFilePath: 1,
  oldFilePath: 1,
  editAgreementOrganizations: 1
})
```

### Check Blockchain State
```bash
# Query specific file
kubectl hlf chaincode query --config=network-config.yaml \
  --user=Org1-admin-default --peer=Org1-peer0.default \
  --chaincode=asset --channel=test \
  --fcn=GetEditApprovals -a '["FILE_ID"]' | jq

# Query file metadata
kubectl hlf chaincode query --config=network-config.yaml \
  --user=Org1-admin-default --peer=Org1-peer0.default \
  --chaincode=asset --channel=test \
  --fcn=ReadAsset -a '["FILE_ID"]' | jq
```

### Check File System
```bash
# List files in storage
ls -lh /path/to/encrypted/files/

# Check specific file exists
test -f /path/to/file && echo "File exists" || echo "File missing"

# Compare file sizes
ls -lh /path/to/{oldFilePath,proposedFilePath,path}
```

---

## Performance Tests

### Concurrent Approvals
```bash
# Test multiple orgs approving simultaneously
parallel -j 3 "curl -X POST http://localhost:3000/files/FILE_ID/approve-edit -H 'Authorization: Bearer {}' -d '{\"proposalId\":\"PROPOSAL_ID\"}'" ::: ORG1_TOKEN ORG2_TOKEN ORG3_TOKEN

# Should handle gracefully, only one should trigger file update
```

### Large File Edit
```bash
# Test with large text file (5MB+)
dd if=/dev/urandom bs=1M count=5 | base64 > large_text.txt

# Propose edit with large content
# Monitor memory and CPU usage
```

### Multiple Files
```bash
# Create proposals for 10 different files
for i in {1..10}; do
  curl -X POST http://localhost:3000/files/FILE_${i}/propose-edit ...
done

# GET /pending-edits should return all 10
```

---

## Troubleshooting

### Proposal Stuck
```javascript
// Clear stuck proposal manually
db.files.updateOne(
  { _id: ObjectId("FILE_ID") },
  { $set: { 
    activeProposalId: null,
    proposedFilePath: null,
    oldFilePath: null
  }}
)

// Also clear from blockchain (if possible via admin)
```

### File Cleanup Failed
```bash
# Manually clean up orphaned files
find /path/to/encrypted/files -name "*.proposed" -mtime +7 -delete
find /path/to/encrypted/files -name "*.old" -mtime +7 -delete
```

### Blockchain Query Timeout
```bash
# Increase timeout in blockChainFunctionHandler
# Or check Kubernetes pods
kubectl get pods -n default | grep hlf
kubectl logs -n default <peer-pod-name>
```

---

**Quick Reference Summary:**
1. Propose → Auto-approved by proposer
2. View Details → Check originalContent vs newContent
3. Approve × N → Each required org approves
4. Final Approve → File updated, cleanup happens
5. OR Reject → Proposal cancelled, new file deleted

**Key Files:**
- Implementation: `/controller/fileController.js`
- Blockchain Handler: `/blockchain/controllers/blockChainFunctionHandler.js`
- Documentation: `/EDIT_IMPLEMENTATION_COMPLETE.md`
