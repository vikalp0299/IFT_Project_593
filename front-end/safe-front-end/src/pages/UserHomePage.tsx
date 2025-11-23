import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { decryptFile, downloadBlob } from '../utils/fileDecryption';
import './UserHomePage.css';

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

interface FileData {
  id: string;
  filename: string;
  originalname: string;
  size: number;
  uploadedAt: string;
  path: string;
  mimetype: string;
  uploader: {
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  isShared?: boolean;
  isEncrypted?: boolean;
  accessRights?: Array<{
    organizationName: string;
    departmentName: string;
  }>;
  sharedBy?: {
    organizationName: string;
    departmentName: string;
  };
}

interface OrganizationSummary {
  id: string;
  name: string;
  displayName: string;
}

interface DepartmentSummary {
  id: string;
  name: string;
  displayName: string;
}

interface AccessAssignment {
  organizationId: string;
  organizationName: string;
  organizationDisplayName: string;
  departmentId: string;
  departmentName: string;
  departmentDisplayName: string;
}

export const UserHomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesSharedByMyDepartment, setFilesSharedByMyDepartment] = useState<FileData[]>([]);
  const [filesSharedWithMyDepartment, setFilesSharedWithMyDepartment] = useState<FileData[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ttlDays, setTtlDays] = useState('1');
  const [ttlHours, setTtlHours] = useState('0');
  const [ttlMinutes, setTtlMinutes] = useState('0');
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [selectedAccessOrgId, setSelectedAccessOrgId] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentSummary[]>([]);
  const [selectedAccessDepartmentId, setSelectedAccessDepartmentId] = useState('');
  const [accessAssignments, setAccessAssignments] = useState<AccessAssignment[]>([]);
  const [accessErrors, setAccessErrors] = useState<string | null>(null);
  const [editAgreementRequired, setEditAgreementRequired] = useState(false);
  const [selectedAgreementOrgIds, setSelectedAgreementOrgIds] = useState<string[]>([]);
  const [sharedByPage, setSharedByPage] = useState(1);
  const [sharedWithPage, setSharedWithPage] = useState(1);
  const [userPrivateKeyServerSession, setUserPrivateKeyServerSession] = useState<{
    baseUrl: string;
    token: string;
    user: {
      id: string;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      department: string;
      organizationName: string;
    };
  } | null>(null);
  const [isPrivateKeyServerModalOpen, setIsPrivateKeyServerModalOpen] = useState(false);
  const [privateKeyServerLoginData, setPrivateKeyServerLoginData] = useState({
    username: '',
    password: '',
  });
  const [isPrivateKeyServerLoggingIn, setIsPrivateKeyServerLoggingIn] = useState(false);
  const [privateKeyServerLoginError, setPrivateKeyServerLoginError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/signin');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    
    // Load private-key-server session from localStorage
    const storedSession = localStorage.getItem('privateKeyServerSession');
    if (storedSession) {
      try {
        setUserPrivateKeyServerSession(JSON.parse(storedSession));
      } catch (e) {
        console.warn('Failed to parse stored session', e);
      }
    }
    
    setLoading(false);
    fetchFiles();
    // Ensure user is registered on private-key-server
    ensurePrivateKeyServerAuth();
  }, [navigate]);

  // Ensure user is registered and logged into private-key-server
  const ensurePrivateKeyServerAuth = async () => {
    try {
      if (!user) return;

      // Get user's full profile including department from main server
      let userDepartment = '';
      try {
        const userProfileResponse = await authService.authenticatedRequest<{
          department?: string;
          organizationName?: string;
        }>('/auth/me');
        
        if (userProfileResponse.success && userProfileResponse.data) {
          userDepartment = userProfileResponse.data.department || '';
        }
      } catch (profileError) {
        console.warn('Could not fetch user profile:', profileError);
      }

      // Get local server URL for user's organization
      const localServerResponse = await authService.authenticatedRequest<{
        baseUrl: string;
        isActive: boolean;
      }>('/org/local-server');

      if (!localServerResponse.success || !localServerResponse.data?.baseUrl) {
        console.warn('Private-key-server not configured for organization');
        return;
      }

      const privateKeyServerUrl = localServerResponse.data.baseUrl;
      
      // Check if user exists on private-key-server
      try {
        const { privateKeyServerClient } = await import('../services/privateKeyServerClient');
        
        const userStatus = await privateKeyServerClient.getUserStatus(
          privateKeyServerUrl,
          user.organizationName,
          user.username
        );

        if (!userStatus.success || !userStatus.data?.exists) {
          // User doesn't exist - register them
          if (userDepartment) {
            try {
              // Generate a temporary password for registration
              const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              
              const registerResponse = await privateKeyServerClient.registerUser(privateKeyServerUrl, {
                username: user.username,
                email: user.email,
                password: tempPassword,
                firstName: user.firstName,
                lastName: user.lastName,
                jobTitle: user.role || 'Employee',
                phone: '',
                departmentName: userDepartment,
                organizationName: user.organizationName || '',
                role: user.role || 'Employee',
              });

              if (registerResponse.success && registerResponse.data?.token) {
                // Auto-login after registration
                const sessionData = {
                  baseUrl: privateKeyServerUrl,
                  token: registerResponse.data.token,
                  user: registerResponse.data.user,
                };
                setUserPrivateKeyServerSession(sessionData);
                // Store in localStorage for access from other pages
                localStorage.setItem('privateKeyServerSession', JSON.stringify(sessionData));
                console.log('User registered and logged into private-key-server');
                return;
              }
            } catch (registerError: any) {
              console.warn('Could not register user on private-key-server:', registerError.message);
            }
          }
        } else {
          // User exists - try to login (we'll use a default password or prompt user)
          // For now, we'll use the main server JWT token for authentication
          // But we can add a login flow if needed
          console.log('User exists on private-key-server');
        }
      } catch (error: any) {
        console.warn('Error checking user status on private-key-server:', error.message);
      }
    } catch (error) {
      console.warn('Error ensuring private-key-server authentication:', error);
      // Don't block the UI - user can still try to download using main server JWT
    }
  };

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      setError(null);
      
      const response = await authService.authenticatedRequest<{
        filesSharedByMyDepartment: { count: number; files: FileData[] };
        filesSharedWithMyDepartment: { count: number; files: FileData[] };
        totalCount: number;
      }>('/api/getfiles');
      
      if (response.success && response.data) {
        setFilesSharedByMyDepartment(response.data.filesSharedByMyDepartment?.files || []);
        setFilesSharedWithMyDepartment(response.data.filesSharedWithMyDepartment?.files || []);
        // Reset pagination when files change
        setSharedByPage(1);
        setSharedWithPage(1);
      } else {
        setError(response.message || 'Failed to fetch files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setFilesLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      setOrganizationsLoading(true);
      const response = await authService.fetchOrganizations(true);
      if (response.success && response.data?.organizations) {
        const normalizedOrgs: OrganizationSummary[] = response.data.organizations
          .map((org: { id?: string; _id?: string; organizationId?: string; name?: string; displayName?: string }) => {
            const resolvedId = org.id || org._id || org.organizationId || '';
            const resolvedName = org.name?.trim() || '';
            const resolvedDisplayName = org.displayName?.trim() || resolvedName;
            return {
              id: resolvedId,
              name: resolvedName,
              displayName: resolvedDisplayName || resolvedName,
            };
          })
          .filter((org) => org.id && org.name);
        setAvailableOrganizations(normalizedOrgs);
      } else {
        setAvailableOrganizations([]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setAvailableOrganizations([]);
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handlePrivateKeyServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPrivateKeyServerLoggingIn(true);
    setPrivateKeyServerLoginError(null);

    try {
      if (!user) {
        throw new Error('User information not available');
      }

      // Get local server URL for user's organization
      const localServerResponse = await authService.authenticatedRequest<{
        baseUrl: string;
        isActive: boolean;
      }>('/org/local-server');

      if (!localServerResponse.success || !localServerResponse.data?.baseUrl) {
        throw new Error('Private-key-server not configured for your organization');
      }

      const privateKeyServerUrl = localServerResponse.data.baseUrl;
      const { privateKeyServerClient } = await import('../services/privateKeyServerClient');

      const loginResponse = await privateKeyServerClient.loginUser(
        privateKeyServerUrl,
        {
          username: privateKeyServerLoginData.username,
          password: privateKeyServerLoginData.password,
        },
        {
          organizationName: user.organizationName,
        }
      );

      if (loginResponse.success && loginResponse.data?.token) {
        const sessionData = {
          baseUrl: privateKeyServerUrl,
          token: loginResponse.data.token,
          user: loginResponse.data.user,
        };
        setUserPrivateKeyServerSession(sessionData);
        // Store in localStorage for access from other pages
        localStorage.setItem('privateKeyServerSession', JSON.stringify(sessionData));
        setPrivateKeyServerLoginData({ username: '', password: '' });
        setIsPrivateKeyServerModalOpen(false);
        console.log('Successfully logged into private-key-server');
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Private-key-server login error:', error);
      setPrivateKeyServerLoginError(
        error.message || 'Failed to login to private-key-server. Please check your credentials.'
      );
    } finally {
      setIsPrivateKeyServerLoggingIn(false);
    }
  };

  const handlePrivateKeyServerLogout = async () => {
    if (!userPrivateKeyServerSession) return;

    try {
      const { privateKeyServerClient } = await import('../services/privateKeyServerClient');
      await privateKeyServerClient.logoutUser(
        userPrivateKeyServerSession.baseUrl,
        userPrivateKeyServerSession.token
      );
    } catch (error) {
      console.warn('Failed to logout from private-key-server:', error);
    } finally {
      setUserPrivateKeyServerSession(null);
      localStorage.removeItem('privateKeyServerSession');
    }
  };

  const handleUploadClick = () => {
    setUploadModalOpen(true);
    loadOrganizations().catch(() => undefined);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          setSelectedFile(file);
        }
      }
    }
  };

  const handleSelectAccessOrganization = async (organizationId: string) => {
    setSelectedAccessOrgId(organizationId);
    setSelectedAccessDepartmentId('');
    setAvailableDepartments([]);
    if (!organizationId) {
      return;
    }
    const org = availableOrganizations.find((o) => o.id === organizationId);
    if (!org) {
      return;
    }
    try {
      const response = await authService.fetchOrganizationDepartments(org.name);
      if (response.success && response.data?.departments) {
        setAvailableDepartments(
          response.data.departments.map((dept) => ({
            id: dept.id,
            name: dept.name,
            displayName: dept.displayName,
          }))
        );
      } else {
        setAvailableDepartments([]);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
      setAvailableDepartments([]);
    }
  };

  const handleAddAccessRule = () => {
    setAccessErrors(null);
    if (!selectedAccessOrgId || !selectedAccessDepartmentId) {
      setAccessErrors('Select both organization and department.');
      return;
    }
    const org = availableOrganizations.find((o) => o.id === selectedAccessOrgId);
    const dept = availableDepartments.find((d) => d.id === selectedAccessDepartmentId);
    if (!org || !dept) {
      setAccessErrors('Invalid organization or department selection.');
      return;
    }
    const duplicate = accessAssignments.some(
      (entry) =>
        entry.organizationId === org.id && entry.departmentId === dept.id
    );
    if (duplicate) {
      setAccessErrors('This organization and department are already included.');
      return;
    }
    setAccessAssignments((prev) => [
      ...prev,
      {
        organizationId: org.id,
        organizationName: org.name,
        organizationDisplayName: org.displayName,
        departmentId: dept.id,
        departmentName: dept.name,
        departmentDisplayName: dept.displayName,
      },
    ]);
    setSelectedAccessDepartmentId('');
  };

  const handleRemoveAccessRule = (organizationId: string, departmentId: string) => {
    setAccessAssignments((prev) =>
      prev.filter(
        (entry) =>
          !(
            entry.organizationId === organizationId &&
            entry.departmentId === departmentId
          )
      )
    );
  };

  const handleToggleAgreementOrg = (organizationId: string) => {
    setSelectedAgreementOrgIds((prev) =>
      prev.includes(organizationId)
        ? prev.filter((id) => id !== organizationId)
        : [...prev, organizationId]
    );
  };

  const handleCloseModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setTtlDays('1');
    setTtlHours('0');
    setTtlMinutes('0');
    setSelectedAccessOrgId('');
    setAvailableDepartments([]);
    setSelectedAccessDepartmentId('');
    setAccessAssignments([]);
    setAccessErrors(null);
    setEditAgreementRequired(false);
    setSelectedAgreementOrgIds([]);
    setIsDragging(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (isUploading) {
      return; // Prevent double upload
    }

    setAccessErrors(null);
    if (accessAssignments.length === 0) {
      setAccessErrors('Add at least one organization and department.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus('Initializing upload...');

      const initResponse = await authService.authenticatedRequest<{ uploadId: string }>('/api/uploads/init', {
        method: 'POST',
        body: JSON.stringify({ filename: selectedFile.name }),
      });

      if (!initResponse.success || !initResponse.data?.uploadId) {
        throw new Error(initResponse.message || 'Failed to initialize upload');
      }

      const uploadId = initResponse.data.uploadId;
      const chunkSize = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);

      setUploadStatus(`Uploading chunks (0/${totalChunks})...`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', i.toString());

        const chunkResponse = await fetch('http://localhost:8000/api/uploads/chunk', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authService.getAccessToken()}`,
          },
          body: chunkFormData,
        });

        if (!chunkResponse.ok) {
          throw new Error(`Failed to upload chunk ${i}`);
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalChunks) * 80); // 80% for chunks
        setUploadProgress(progress);
        setUploadStatus(`Uploading chunks (${i + 1}/${totalChunks})...`);
      }

      setUploadStatus('Encrypting and finalizing...');
      setUploadProgress(85);

      const holdMs =
        (parseInt(ttlDays || '0', 10) * 24 * 60 * 60 +
          parseInt(ttlHours || '0', 10) * 60 * 60 +
          parseInt(ttlMinutes || '0', 10) * 60) *
        1000;

      const accessRightsPayload = accessAssignments.map((entry) => ({
        organizationId: entry.organizationId,
        organizationName: entry.organizationName,
        organizationDisplayName: entry.organizationDisplayName,
        departmentId: entry.departmentId,
        departmentName: entry.departmentName,
        departmentDisplayName: entry.departmentDisplayName,
      }));

      const agreementPayload =
        editAgreementRequired && selectedAgreementOrgIds.length > 0
          ? selectedAgreementOrgIds
              .map((orgId) => {
                const org = availableOrganizations.find((o) => o.id === orgId);
                if (!org) {
                  return null;
                }
                return {
                  organizationId: org.id,
                  organizationName: org.name,
                };
              })
              .filter(
                (entry): entry is { organizationId: string; organizationName: string } =>
                  entry !== null
              )
          : [];

      const completeResponse = await authService.authenticatedRequest('/api/uploads/complete', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          originalName: selectedFile.name,
          size: selectedFile.size,
          timeToHoldMs: holdMs > 0 ? holdMs : undefined,
          accessRights: accessRightsPayload,
          editAgreementRequired,
          editAgreementOrganizations: agreementPayload,
        }),
      });

      if (completeResponse.success) {
        setUploadProgress(100);
        setUploadStatus('Upload complete!');
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        alert('File uploaded successfully!');
        handleCloseModal();
        fetchFiles();
      } else {
        throw new Error(completeResponse.message || 'Failed to complete upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('Upload failed');
      alert(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: FileData) => {
    try {
      // Step 1: Get encrypted file and encrypted symmetric key from main server
      const response = await authService.authenticatedRequest<{
        encryptedFile: string;
        encryptedSymmetricKey: string;
        organizationId: string;
        organizationName: string;
        departmentId: string;
        departmentName: string;
        userOrganizationId: string;
        userOrganizationName: string;
        userDepartmentName: string;
        iv: string;
        authTag: string;
        algorithm: string;
        filename: string;
        mimetype: string;
        privateKeyServerUrl: string;
      }>(`/api/download/${file.id}`, {
        method: 'GET',
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to download file');
      }

      const {
        encryptedFile,
        encryptedSymmetricKey,
        organizationId,
        organizationName,
        departmentId,
        departmentName,
        userOrganizationId,
        userOrganizationName,
        userDepartmentName,
        iv,
        authTag,
        filename,
        mimetype,
        privateKeyServerUrl,
      } = response.data;

      // Check if file is encrypted
      if (!encryptedFile || !encryptedSymmetricKey || !iv || !authTag) {
        throw new Error('File encryption data is missing');
      }

      if (!privateKeyServerUrl) {
        throw new Error('Private-key-server URL is not configured for your organization');
      }

      // Step 2: Contact private-key-server directly to decrypt the symmetric key
      // Use private-key-server user token for authentication
      let decryptedSymmetricKey: string;
      
      // Must have private-key-server user token - users must be logged into private-key-server
      if (!userPrivateKeyServerSession?.token) {
        throw new Error('Not authenticated with private-key-server. Please ensure you are logged in.');
      }
      
      const authToken = userPrivateKeyServerSession.token;
      
      try {
        const decryptResponse = await fetch(
          `${privateKeyServerUrl}/private-key/decrypt-symmetric-key`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`, // Send token (either private-key-server user token or main server JWT)
            },
            body: JSON.stringify({
              encryptedSymmetricKey,
              organizationId,
              organizationName,
              departmentId,
              departmentName,
              // Note: User info is NOT sent - private-key-server gets it from JWT token for security
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
            // If parsing fails, use empty object
          }
          
          if (decryptResponse.status === 401) {
            throw new Error(errorData.message || 'Not authenticated with private-key-server. Please ensure you are logged in.');
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

        decryptedSymmetricKey = decryptData.data.symmetricKey;
      } catch (error) {
        console.error('Error decrypting symmetric key via private-key-server:', error);
        throw new Error(
          `Failed to decrypt symmetric key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Step 3: Decrypt file client-side using the decrypted symmetric key
      try {
        const decryptedBlob = await decryptFile(encryptedFile, decryptedSymmetricKey, iv, authTag);
        downloadBlob(decryptedBlob, filename || file.originalname);
      } catch (decryptError) {
        console.error('File decryption error:', decryptError);
        throw new Error(
          `Failed to decrypt file: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`
        );
      }
    } catch (err) {
      console.error('Download error:', err);
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Helper function to render file list with pagination
  const renderFileList = (
    fileList: FileData[], 
    emptyMessage: string, 
    showDownloadButton: boolean,
    sectionId: string,
    currentPage: number,
    setCurrentPage: (page: number) => void
  ) => {
    const filesPerPage = 10;
    const totalPages = Math.ceil(fileList.length / filesPerPage);
    const indexOfLastFile = currentPage * filesPerPage;
    const indexOfFirstFile = indexOfLastFile - filesPerPage;
    const currentFiles = fileList.slice(indexOfFirstFile, indexOfLastFile);

    if (fileList.length === 0) {
      return (
        <div className="files-empty">
          <div className="empty-icon">📁</div>
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="files-list-container">
        <div className="files-list">
          {currentFiles.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <h3 className="file-name">{file.originalname}</h3>
                  <div className="file-meta-grid">
                    {file.uploader && (
                      <div className="file-meta-item">
                        <span className="file-meta-label">Uploaded by:</span>
                        <span className="file-meta-value">
                          {file.uploader.firstName} {file.uploader.lastName} ({file.uploader.username})
                        </span>
                      </div>
                    )}
                    {file.sharedBy && (
                      <div className="file-meta-item">
                        <span className="file-meta-label">Shared by:</span>
                        <span className="file-meta-value">
                          {file.sharedBy.organizationName} - {file.sharedBy.departmentName}
                        </span>
                      </div>
                    )}
                    {file.accessRights && file.accessRights.length > 0 && (
                      <div className="file-meta-item">
                        <span className="file-meta-label">Shared with:</span>
                        <div className="file-access-rights">
                          {file.accessRights.map((access, idx) => (
                            <span key={idx} className="access-badge">
                              {access.organizationName} - {access.departmentName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="file-meta-item">
                      <span className="file-meta-label">Size:</span>
                      <span className="file-meta-value">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="file-meta-item">
                      <span className="file-meta-label">Uploaded:</span>
                      <span className="file-meta-value">{formatDate(file.uploadedAt)}</span>
                    </div>
                    {file.isEncrypted && (
                      <div className="file-meta-item">
                        <span className="file-encrypted">🔒 Encrypted</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="file-actions">
                {file.mimetype && file.mimetype.startsWith('text/') && (
                  <button
                    onClick={() => navigate(`/edit-file/${file.id}`)}
                    className="edit-button"
                    title="Edit file"
                  >
                    <span className="edit-icon">✏️</span>
                    <span className="edit-text">Edit</span>
                  </button>
                )}
                {showDownloadButton && (
                  <button
                    onClick={() => handleDownload(file)}
                    className="download-button-gradient"
                    title="Download file"
                  >
                    <span className="download-icon">⬇️</span>
                    <span className="download-text">Download</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="user-homepage-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-homepage-container">
      {/* Private-Key-Server Authentication Modal */}
      {isPrivateKeyServerModalOpen && (
        <div className="modal-overlay pks-modal-overlay" onClick={() => !isPrivateKeyServerLoggingIn && setIsPrivateKeyServerModalOpen(false)}>
          <div className="modal-content pks-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Authenticate with Private-Key-Server</h2>
              <button
                className="modal-close-button"
                onClick={() => setIsPrivateKeyServerModalOpen(false)}
                disabled={isPrivateKeyServerLoggingIn}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePrivateKeyServerLogin} className="modal-form">
              <div className="form-group">
                <label htmlFor="pks-username">Username</label>
                <input
                  id="pks-username"
                  type="text"
                  value={privateKeyServerLoginData.username}
                  onChange={(e) =>
                    setPrivateKeyServerLoginData({ ...privateKeyServerLoginData, username: e.target.value })
                  }
                  required
                  disabled={isPrivateKeyServerLoggingIn}
                  placeholder="Enter your username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="pks-password">Password</label>
                <input
                  id="pks-password"
                  type="password"
                  value={privateKeyServerLoginData.password}
                  onChange={(e) =>
                    setPrivateKeyServerLoginData({ ...privateKeyServerLoginData, password: e.target.value })
                  }
                  required
                  disabled={isPrivateKeyServerLoggingIn}
                  placeholder="Enter your password"
                />
              </div>
              {privateKeyServerLoginError && (
                <div className="error-message">{privateKeyServerLoginError}</div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setIsPrivateKeyServerModalOpen(false)}
                  disabled={isPrivateKeyServerLoggingIn}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={isPrivateKeyServerLoggingIn}>
                  {isPrivateKeyServerLoggingIn ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="user-homepage-header">
        <div className="header-content">
          <h1>Welcome, {user?.firstName} {user?.lastName}</h1>
          <p className="organization-name">{user?.organizationName}</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/pending-approvals')} 
            className="pending-approvals-button"
            title="View pending file edit approvals"
          >
            📋 Pending Approvals
          </button>
          {userPrivateKeyServerSession ? (
            <div className="private-key-server-status">
              <span className="status-indicator connected">●</span>
              <span>Connected to Private-Key-Server</span>
              <button
                onClick={handlePrivateKeyServerLogout}
                className="button-small button-secondary"
                title="Disconnect from private-key-server"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsPrivateKeyServerModalOpen(true)}
              className="button-primary"
              title="Authenticate with private-key-server to enable file downloads"
            >
              Connect to Private-Key-Server
            </button>
          )}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="user-homepage-main">
        <div className={`user-content ${
          filesSharedByMyDepartment.length === 0 && 
          filesSharedWithMyDepartment.length === 0 && 
          !filesLoading && 
          !error 
            ? 'centered-layout' 
            : 'normal-layout'
        }`}>
          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={handleUploadClick} className="action-button upload-button">
              <span className="button-icon">📤</span>
              <span className="button-text">Upload</span>
            </button>
            <button onClick={fetchFiles} className="action-button refresh-button">
              <span className="button-icon">🔄</span>
              <span className="button-text">Refresh</span>
            </button>
          </div>

          {/* Files Sections */}
          {filesLoading ? (
            <div className="files-loading">
              <div className="spinner"></div>
              <p>Loading files...</p>
            </div>
          ) : error ? (
            <div className="files-error">
              <p>{error}</p>
              <button onClick={fetchFiles} className="retry-button">Retry</button>
            </div>
          ) : (
            <div className="files-sections-container">
              {/* Files Shared BY My Department */}
              <div className="files-section">
                <h2 className="files-section-title">
                  Files Shared By My Department
                  <span className="file-count-badge">
                    {filesSharedByMyDepartment.length}
                  </span>
                </h2>
                <p className="files-section-description">
                  Files uploaded by members of your department and organization
                </p>
                {renderFileList(
                  filesSharedByMyDepartment,
                  'No files uploaded by your department yet',
                  false, // No download button for files owned by same organization
                  'shared-by',
                  sharedByPage,
                  setSharedByPage
                )}
              </div>

              {/* Files Shared WITH My Department */}
              <div className="files-section">
                <h2 className="files-section-title">
                  Files Shared With My Department
                  <span className="file-count-badge">
                    {filesSharedWithMyDepartment.length}
                  </span>
                </h2>
                <p className="files-section-description">
                  Files shared with your department from other organizations
                </p>
                {renderFileList(
                  filesSharedWithMyDepartment,
                  'No files shared with your department from other organizations',
                  true, // Show download button for files from other organizations
                  'shared-with',
                  sharedWithPage,
                  setSharedWithPage
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload File</h2>
            
            {/* File Upload Area */}
            <div 
              className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
            >
              <input
                type="file"
                onChange={handleFileSelect}
                className="file-input-hidden"
                id="file-upload-input"
              />
              <div className="upload-area-content">
                <div className="upload-icon">📁</div>
                {selectedFile ? (
                  <div className="selected-file-info">
                    <p className="file-name-display">{selectedFile.name}</p>
                    <p className="file-size-display">{formatFileSize(selectedFile.size)}</p>
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="remove-file-button"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="upload-instructions">
                      Drag and drop your file here, or{' '}
                      <label htmlFor="file-upload-input" className="upload-link">
                        click to browse
                      </label>
                    </p>
                    <p className="upload-hint">You can also paste a file from clipboard</p>
                  </>
                )}
              </div>
            </div>

            {/* TTL Time Input */}
            <div className="ttl-input-section">
              <label className="ttl-label">TTL Time (Day:Hour:Minute)</label>
              <div className="ttl-inputs">
                <div className="ttl-input-group">
                  <input
                    type="number"
                    min="0"
                    value={ttlDays}
                    onChange={(e) => setTtlDays(e.target.value)}
                    placeholder="Days"
                    className="ttl-input"
                  />
                  <span className="ttl-separator">:</span>
                </div>
                <div className="ttl-input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={ttlHours}
                    onChange={(e) => setTtlHours(e.target.value)}
                    placeholder="Hours"
                    className="ttl-input"
                  />
                  <span className="ttl-separator">:</span>
                </div>
                <div className="ttl-input-group">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="ttl-input"
                  />
                </div>
              </div>
            </div>

            {/* Access Rights */}
            <div className="access-rights-section">
              <h3>Access Rights</h3>
              <p className="section-description">
                Select organizations and departments that can read this file.
              </p>
              <div className="access-input-grid">
                <div className="access-input-group">
                  <label>Select Organization</label>
                  <select
                    value={selectedAccessOrgId}
                    onChange={(e) => handleSelectAccessOrganization(e.target.value)}
                    className="access-select"
                    disabled={organizationsLoading}
                  >
                    <option value="">
                      {organizationsLoading ? 'Loading organizations...' : 'Choose organization'}
                    </option>
                    {availableOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="access-input-group">
                  <label>Select Department</label>
                  <select
                    value={selectedAccessDepartmentId}
                    onChange={(e) => setSelectedAccessDepartmentId(e.target.value)}
                    className="access-select"
                    disabled={!selectedAccessOrgId || availableDepartments.length === 0}
                  >
                    <option value="">
                      {selectedAccessOrgId
                        ? availableDepartments.length
                          ? 'Choose department'
                          : 'No departments available'
                        : 'Select organization first'}
                    </option>
                    {availableDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="add-access-button"
                  onClick={handleAddAccessRule}
                  disabled={!selectedAccessOrgId || !selectedAccessDepartmentId}
                >
                  Add Access
                </button>
              </div>
              {accessErrors && <p className="access-error">{accessErrors}</p>}
              {accessAssignments.length > 0 && (
                <div className="access-list">
                  {accessAssignments.map((entry) => (
                    <div
                      key={`${entry.organizationId}-${entry.departmentId}`}
                      className="access-list-item"
                    >
                      <div>
                        <strong>{entry.organizationDisplayName}</strong> — {entry.departmentDisplayName}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessRule(entry.organizationId, entry.departmentId)}
                        className="remove-access-button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Agreement */}
            <div className="edit-agreement-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editAgreementRequired}
                  onChange={(e) => {
                    setEditAgreementRequired(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedAgreementOrgIds([]);
                    }
                  }}
                />
                <span>Require edit agreement from organizations</span>
              </label>
              {editAgreementRequired && (
                <div className="agreement-org-list">
                  {availableOrganizations.length === 0 ? (
                    <p className="agreement-helper">No organizations available.</p>
                  ) : (
                    availableOrganizations.map((org) => (
                      <label key={org.id} className="checkbox-label org-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedAgreementOrgIds.includes(org.id)}
                          onChange={() => handleToggleAgreementOrg(org.id)}
                        />
                        <span>{org.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="upload-progress-section">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <span className="progress-text">{uploadProgress}%</span>
                  </div>
                </div>
                <p className="upload-status-text">{uploadStatus}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-actions">
              <button 
                onClick={handleCloseModal} 
                className="modal-button cancel-button"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload} 
                className="modal-button upload-submit-button"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
