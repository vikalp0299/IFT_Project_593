import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add private-key-server token if available
  const privateKeySession = localStorage.getItem('privateKeyServerSession');
  if (privateKeySession) {
    try {
      const session = JSON.parse(privateKeySession);
      if (session.token) {
        config.headers['X-Private-Key-Token'] = session.token;
      }
    } catch (e) {
      console.error('Failed to parse privateKeyServerSession:', e);
    }
  }
  
  return config;
});

export interface FileMetadata {
  _id: string;
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedBy: {
    _id: string;
    username: string;
    email: string;
  };
  uploadedAt: string;
  editAgreementRequired: boolean;
  editAgreementOrganizations?: Array<{
    organizationId: string;
    blockchainOrgName: string;
  }>;
  activeProposalId?: string;
  proposedFilePath?: string;
  oldFilePath?: string;
}

export interface ProposalDetails {
  fileId: string;
  proposalId: string;
  filename: string;
  mimetype: string;
  originalContent: string;
  newContent: string;
  proposedBy: string;
  proposedAt: string;
  approvals: Record<string, boolean>;
  requiredOrgs: string[];
  approvalStatus: Array<{
    org: string;
    approved?: boolean;
  }>;
}

export interface PendingEdit {
  fileId: string;
  filename: string;
  mimetype: string;
  fileSize: number;
  uploadedBy: {
    username: string;
    email: string;
  };
  uploadedAt: string;
  proposalId: string;
  proposedBy: string;
  status: string;
  approvals: string[];
  requiredOrganizations: Array<{
    organizationId: string;
    blockchainOrgName: string;
  }>;
}

// Get all files accessible to user
export const getFiles = async (): Promise<FileMetadata[]> => {
  const response = await axiosInstance.get('/api/getfiles');
  return response.data.files || [];
};

// Get file content (for text files) - uses download endpoint and decrypts
// Note: This requires the user to be authenticated with private-key-server
export const getFileContent = async (
  fileId: string,
  privateKeyServerToken: string
): Promise<string> => {
  try {
    // Use the existing download endpoint which returns encrypted file data
    const response = await axiosInstance.get(`/api/download/${fileId}`);
    
    console.log('Download response:', response.data);
    
    if (!response.data || !response.data.success || !response.data.data) {
      throw new Error('Failed to retrieve file data');
    }

    const {
      encryptedFile,
      encryptedSymmetricKey,
      iv,
      authTag,
      organizationId,
      organizationName,
      departmentId,
      departmentName,
      privateKeyServerUrl,
    } = response.data.data;

    console.log('File download response:', {
      hasEncryptedFile: !!encryptedFile,
      hasEncryptedSymmetricKey: !!encryptedSymmetricKey,
      hasIv: !!iv,
      hasAuthTag: !!authTag,
      organizationId,
      organizationName,
      departmentId,
      departmentName,
      privateKeyServerUrl,
    });

    if (!encryptedFile || !encryptedSymmetricKey || !iv || !authTag) {
      throw new Error('File encryption data is missing');
    }

    if (!privateKeyServerUrl) {
      throw new Error('Private-key-server URL is not configured for your organization');
    }

    // Step 1: Contact private-key-server to decrypt the symmetric key
    console.log('Contacting private-key-server to decrypt symmetric key...');
    console.log('Decryption request payload:', {
      organizationId,
      organizationName,
      departmentId,
      departmentName,
      hasEncryptedSymmetricKey: !!encryptedSymmetricKey,
    });
    
    const decryptResponse = await fetch(
      `${privateKeyServerUrl}/private-key/decrypt-symmetric-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${privateKeyServerToken}`,
        },
        body: JSON.stringify({
          encryptedSymmetricKey,
          organizationId,
          organizationName,
          departmentId,
          departmentName,
        }),
      }
    );

    if (!decryptResponse.ok) {
      let errorData: any = {};
      try {
        const text = await decryptResponse.text();
        if (text) {
          errorData = JSON.parse(text);
        }
      } catch (parseError) {
        // ignore
      }
      
      console.error('Private-key-server error:', errorData);
      
      if (decryptResponse.status === 401) {
        throw new Error('Not authenticated with private-key-server. Please connect to Private-Key-Server from the home page.');
      } else if (decryptResponse.status === 403) {
        throw new Error(errorData.message || 'Access denied: You do not have permission to decrypt this file');
      } else {
        throw new Error(errorData.message || `Private-key-server returned status ${decryptResponse.status}`);
      }
    }

    const decryptData = await decryptResponse.json();
    if (!decryptData.success || !decryptData.data?.symmetricKey) {
      throw new Error('Symmetric key not found in response from private-key-server');
    }

    const decryptedSymmetricKey = decryptData.data.symmetricKey;
    console.log('Successfully decrypted symmetric key');

    // Step 2: Decrypt file client-side using the decrypted symmetric key
    const { decryptFile } = await import('../utils/fileDecryption');
    const decryptedBlob = await decryptFile(
      encryptedFile,
      decryptedSymmetricKey,
      iv,
      authTag
    );

    // Convert blob to text
    const text = await decryptedBlob.text();
    console.log('Successfully decrypted file, length:', text.length);
    return text;
  } catch (error: any) {
    console.error('Error in getFileContent:', error);
    throw error;
  }
};


// Download file
export const downloadFile = async (fileId: string): Promise<Blob> => {
  const response = await axiosInstance.get(`/api/download/${fileId}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Propose file edit
export const proposeFileEdit = async (
  fileId: string,
  originalContent: string,
  newContent: string,
  encryptedNewFileBase64: string
): Promise<{ success: boolean; proposalId: string; message: string }> => {
  console.log('proposeFileEdit called with:', {
    fileId,
    originalContentLength: originalContent.length,
    newContentLength: newContent.length,
    encryptedFileLength: encryptedNewFileBase64.length,
  });

  const payload = {
    originalContent,
    newContent,
    encryptedNewFile: encryptedNewFileBase64,
  };

  console.log('Sending POST request to:', `/api/${fileId}/propose-edit`);
  console.log('Payload:', payload);

  try {
    const response = await axiosInstance.post(
      `/api/${fileId}/propose-edit`,
      payload
    );
    console.log('Response received:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('proposeFileEdit error:', error);
    console.error('Error response data:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
};

// Approve file edit
export const approveFileEdit = async (
  fileId: string,
  proposalId: string
): Promise<{ success: boolean; fullyApproved: boolean; message: string }> => {
  const response = await axiosInstance.post(`/api/${fileId}/approve-edit`, {
    proposalId,
  });
  return response.data;
};

// Reject file edit
export const rejectFileEdit = async (
  fileId: string,
  proposalId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post(`/api/${fileId}/reject-edit`, {
    proposalId,
    reason,
  });
  return response.data;
};

// Get pending edits for approval
export const getPendingEdits = async (): Promise<PendingEdit[]> => {
  const response = await axiosInstance.get('/api/pending-edits');
  return response.data.data.pendingEdits;
};

// Get proposal details
export const getProposalDetails = async (
  fileId: string,
  proposalId: string
): Promise<ProposalDetails> => {
  const response = await axiosInstance.get(
    `/api/${fileId}/proposal/${proposalId}`
  );
  return response.data.data;
};

export default {
  getFiles,
  getFileContent,
  downloadFile,
  proposeFileEdit,
  approveFileEdit,
  rejectFileEdit,
  getPendingEdits,
  getProposalDetails,
};
