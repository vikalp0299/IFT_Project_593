# Frontend File Edit Workflow - Pseudo Code

## Overview
This document provides pseudo code for implementing the file edit proposal workflow in the frontend.

**Security Model: In-App Editor**
- Users MUST edit files within the application (no download/upload)
- "Edit" button only appears for text files
- File is fetched, decrypted, and displayed in an in-app editor
- This prevents file substitution attacks
- Reviewers see side-by-side comparison with highlighted changes

**File Lifecycle:**
- When a user proposes an edit, they upload a NEW encrypted file version
- The backend stores BOTH the old and new file versions temporarily
- **If approved**: Old file is deleted, new file becomes the current version
- **If rejected**: New file is deleted, old file remains as current version

---

## 1. Edit File Flow (In-App Editor)

### Step 1: Show Edit Button (Only for Text Files)
```javascript
function FileListItem({ file }) {
  // Only show Edit button for text files
  const isTextFile = file.mimetype && file.mimetype.startsWith('text/');
  const canEdit = isTextFile && userHasEditPermission(file);

  return (
    <div className="file-item">
      <span>{file.filename}</span>
      <div className="actions">
        <button onClick={() => downloadFile(file._id)}>Download</button>
        {canEdit && (
          <button onClick={() => openInAppEditor(file._id)}>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Open In-App Editor
```javascript
async function openInAppEditor(fileId) {
  try {
    // 1. Fetch encrypted file from backend
    const response = await fetch(`/api/files/download/${fileId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { encryptedFile, symmetricKey } = await response.json();
    
    // 2. Decrypt the file content
    const decryptedContent = await decryptFile(encryptedFile, symmetricKey);
    
    // 3. Convert to text
    const originalContent = await decryptedContent.text();
    
    // 4. Open editor modal/page with the content
    showEditorModal({
      fileId,
      filename: file.filename,
      originalContent,
      onSave: (newContent) => submitEditProposal(fileId, originalContent, newContent)
    });
    
  } catch (error) {
    showError('Failed to load file for editing: ' + error.message);
  }
}

// Example editor component
function EditorModal({ fileId, filename, originalContent, onSave }) {
  const [content, setContent] = useState(originalContent);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  return (
    <div className="editor-modal">
      <h2>Editing: {filename}</h2>
      
      {/* Simple textarea - or use Monaco Editor for better UX */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        cols={80}
        className="file-editor"
      />
      
      <div className="actions">
        <button 
          onClick={() => onSave(content)}
          disabled={!hasChanges}
        >
          Submit for Approval
        </button>
        <button onClick={closeModal}>Cancel</button>
      </div>
      
      {hasChanges && (
        <div className="warning">
          ⚠️ Changes will require approval from all required organizations
        </div>
      )}
    </div>
  );
}
```

### Step 3: Submit Edit Proposal
```javascript
async function initiateFileEdit(fileId) {
  // 1. Fetch encrypted file from backend
  const response = await fetch(`/api/files/download/${fileId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const encryptedFile = await response.blob();
  
  // 2. Fetch user's private key from private-key-server
  const privateKey = await fetchPrivateKey(userId);
  
  // 3. Decrypt the file content
  const decryptedContent = await decryptFile(encryptedFile, privateKey);
  
  // 4. Convert to text (assuming it's a text file)
  const originalContent = await decryptedContent.text();
  
  // 5. Open editor with original content
  openEditor(fileId, originalContent);
}
```

### Step 3: Submit Edit Proposal
```javascript
async function submitEditProposal(fileId, originalContent, newContent) {
  try {
    // 1. Encrypt the new edited content
    const publicKey = await fetchFilePublicKey(fileId);
    const encryptedNewFile = await encryptFile(newContent, publicKey);
    
    // 2. Upload the new encrypted file version
    const uploadResponse = await uploadProposedVersion(fileId, encryptedNewFile);
    
    // 3. Submit proposal with both decrypted versions
    const response = await fetch(`/api/files/${fileId}/propose-edit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalContent: originalContent,  // Decrypted original (for blockchain)
        newContent: newContent,             // Decrypted new version (for blockchain)
        proposedFilePath: uploadResponse.path  // Path to encrypted new file
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Edit proposal submitted successfully!');
      showNotification('Your organization has automatically approved.');
      showNotification('Waiting for approval from other required organizations...');
      
      // Close editor
      closeEditor();
      
      // Optionally show what was submitted
      showProposalSummary(fileId, result.data.proposalId);
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError('Failed to submit proposal: ' + error.message);
  }
}
```

**Security Benefits of In-App Editor:**
- ✅ User cannot download and substitute a different file
- ✅ Edit button is tied to specific fileId
- ✅ All edits happen within the controlled environment
- ✅ Reviewers see the exact file that was edited

---

## 2. Review Pending Proposals Flow

### Step 1: Fetch Pending Proposals
```javascript
async function fetchPendingProposals() {
  // Get all files that have pending edit proposals for current user's org
  const response = await fetch('/api/files/pending-edits', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    displayPendingFiles(data.files);
    // data.files = [
    //   { _id, filename, uploadedBy, uploadedAt, editAgreementOrganizations },
    //   ...
    // ]
  }
}

function displayPendingFiles(files) {
  // Show list of files with pending proposals
  files.forEach(file => {
    renderFileCard({
      filename: file.filename,
      uploadedBy: file.uploadedBy,
      onReview: () => reviewProposal(file._id)
    });
  });
}
```

### Step 2: Fetch Specific Proposal Details
```javascript
async function reviewProposal(fileId, proposalId) {
  // Fetch proposal details from backend
  const response = await fetch(`/api/files/${fileId}/proposal/${proposalId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    const { file, proposal } = data;
    
    // proposal contains:
    // {
    //   originalContent: "...",
    //   newContent: "...",
    //   proposedBy: "user@example.com",
    //   proposedAt: "2024-01-15T10:30:00.000Z",
    //   filename: "document.txt"
    // }
    
    displayDiffViewer(proposal);
  }
}
```

### Step 3: Display Diff Comparison
```javascript
// Option A: Using a diff library (recommended)
import { diffLines } from 'diff';
import DiffViewer from 'react-diff-viewer';

function displayDiffViewer(proposal) {
  const { originalContent, newContent, proposedBy, proposedAt } = proposal;
  
  // Calculate diff using library
  const differences = diffLines(originalContent, newContent);
  
  return (
    <div className="proposal-review">
      <div className="proposal-header">
        <h3>Edit Proposal</h3>
        <p>Proposed by: {proposedBy}</p>
        <p>Proposed at: {new Date(proposedAt).toLocaleString()}</p>
      </div>
      
      <DiffViewer
        oldValue={originalContent}
        newValue={newContent}
        splitView={true}
        showDiffOnly={false}
        useDarkTheme={false}
      />
      
      <div className="actions">
        <button onClick={() => approveProposal(fileId, proposalId)}>
          Approve
        </button>
        <button onClick={() => rejectProposal(fileId, proposalId)}>
          Reject
        </button>
      </div>
    </div>
  );
}

// Option B: Manual diff calculation (if needed)
function calculateLineDiff(originalContent, newContent) {
  const originalLines = originalContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(originalLines.length, newLines.length);
  
  const changes = [];
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = originalLines[i] || '';
    const newLine = newLines[i] || '';
    
    if (oldLine !== newLine) {
      changes.push({
        lineNumber: i + 1,
        oldContent: oldLine,
        newContent: newLine,
        type: !oldLine ? 'added' : !newLine ? 'deleted' : 'modified'
      });
    }
  }
  
  return changes;
}

// Display custom diff view
function displayCustomDiff(originalContent, newContent) {
  const changes = calculateLineDiff(originalContent, newContent);
  
  return (
    <div className="diff-view">
      {changes.map(change => (
        <div key={change.lineNumber} className={`line ${change.type}`}>
          <span className="line-number">{change.lineNumber}</span>
          <div className="content">
            {change.type !== 'added' && (
              <div className="old-content">- {change.oldContent}</div>
            )}
            {change.type !== 'deleted' && (
              <div className="new-content">+ {change.newContent}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Approve or Reject Proposal
```javascript
async function approveProposal(fileId, proposalId) {
  const response = await fetch(`/api/files/${fileId}/approve-edit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ proposalId })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showNotification('Proposal approved successfully!');
    showNotification('Old file version has been deleted. New version is now active.');
    // Refresh pending proposals list
    fetchPendingProposals();
  } else {
    showError(result.message);
  }
}

async function rejectProposal(fileId, proposalId) {
  // Optionally ask for rejection reason
  const reason = await promptForReason();
  
  const response = await fetch(`/api/files/${fileId}/reject-edit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      proposalId,
      reason: reason || 'No reason provided'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showNotification('Proposal rejected');
    showNotification('Proposed file version has been deleted. Original file remains.');
    fetchPendingProposals();
  } else {
    showError(result.message);
  }
}

function promptForReason() {
  return new Promise((resolve) => {
    // Show modal/dialog to get rejection reason
    showReasonDialog({
      onSubmit: (reason) => resolve(reason),
      onCancel: () => resolve(null)
    });
  });
}
```

**What Happens After Approval/Rejection:**

**On Approval:**
1. ✅ Blockchain records approval from all required organizations
2. ✅ Backend deletes OLD encrypted file from storage
3. ✅ NEW encrypted file becomes the current version
4. ✅ File metadata updated to point to new version
5. ✅ Users now download the new version when accessing the file

**On Rejection:**
1. ❌ Blockchain records rejection
2. ❌ Backend deletes NEW/PROPOSED encrypted file from storage  
3. ❌ OLD encrypted file remains as current version
4. ❌ File metadata unchanged
5. ❌ Users continue to access the original file

---

## 3. Complete Example Component (React)

```javascript
import React, { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer';

function FileEditReview({ fileId, proposalId }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposal();
  }, [fileId, proposalId]);

  async function loadProposal() {
    try {
      const response = await fetch(
        `/api/files/${fileId}/proposal/${proposalId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setProposal(data.proposal);
      }
    } catch (error) {
      console.error('Failed to load proposal:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      const response = await fetch(`/api/files/${fileId}/approve-edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ proposalId })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Proposal approved!');
        // Navigate back or refresh
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleReject() {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
      const response = await fetch(`/api/files/${fileId}/reject-edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ proposalId, reason })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Proposal rejected');
        // Navigate back or refresh
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!proposal) return <div>Proposal not found</div>;

  return (
    <div className="proposal-review-container">
      <div className="proposal-header">
        <h2>Edit Proposal for {proposal.filename}</h2>
        <div className="metadata">
          <p>Proposed by: {proposal.proposedBy}</p>
          <p>Proposed at: {new Date(proposal.proposedAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="diff-container">
        <ReactDiffViewer
          oldValue={proposal.originalContent}
          newValue={proposal.newContent}
          splitView={true}
          showDiffOnly={false}
          leftTitle="Original Version"
          rightTitle="Proposed Changes"
        />
      </div>

      <div className="action-buttons">
        <button className="approve-btn" onClick={handleApprove}>
          ✓ Approve Changes
        </button>
        <button className="reject-btn" onClick={handleReject}>
          ✗ Reject Changes
        </button>
      </div>
    </div>
  );
}

export default FileEditReview;
```

---

## 4. Recommended Libraries

### For Diff Display
```bash
npm install diff
npm install react-diff-viewer
```

### For File Decryption
```javascript
// Use your existing crypto utilities
import { decryptFile } from './crypto-utils';
```

---

## 5. API Endpoints Summary

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/files/:fileId/propose-edit` | POST | Submit edit proposal | `{ originalContent, newContent }` | `{ success, message, proposalId }` |
| `/api/files/pending-edits` | GET | Get files with pending proposals | - | `{ success, files: [...] }` |
| `/api/files/:fileId/proposal/:proposalId` | GET | Get proposal details | - | `{ success, file, proposal }` |
| `/api/files/:fileId/approve-edit` | POST | Approve proposal | `{ proposalId }` | `{ success, message }` |
| `/api/files/:fileId/reject-edit` | POST | Reject proposal | `{ proposalId, reason }` | `{ success, message }` |

---

## 6. CSS Example for Diff View

```css
.proposal-review-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.proposal-header {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.metadata {
  color: #666;
  font-size: 14px;
}

.diff-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.approve-btn {
  background: #4caf50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.reject-btn {
  background: #f44336;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.approve-btn:hover {
  background: #45a049;
}

.reject-btn:hover {
  background: #da190b;
}

/* Custom diff styles if not using library */
.diff-view {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

.line {
  display: flex;
  padding: 2px 0;
}

.line.added {
  background-color: #e6ffec;
}

.line.deleted {
  background-color: #ffebe9;
}

.line.modified {
  background-color: #fff8c5;
}

.line-number {
  width: 50px;
  text-align: right;
  padding-right: 10px;
  color: #666;
  user-select: none;
}

.old-content {
  color: #d73a49;
  text-decoration: line-through;
}

.new-content {
  color: #22863a;
}
```

---

## Notes for Implementation

1. **Security**: Always validate that the user has permission to approve/reject before showing the UI
2. **Error Handling**: Add proper try-catch blocks and user-friendly error messages
3. **Loading States**: Show loading indicators while fetching proposals
4. **Validation**: Validate that files are text files before allowing edit
5. **File Size**: Consider adding warnings for very large files that might be slow to diff
6. **Real-time Updates**: Consider using WebSockets to notify users when proposals are approved/rejected
