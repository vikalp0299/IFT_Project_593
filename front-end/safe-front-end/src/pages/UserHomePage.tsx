import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
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
  isShared: boolean;
}

export const UserHomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileData[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filesPerPage] = useState(10);

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
    setLoading(false);
    fetchFiles();
  }, [navigate]);

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      setError(null);
      
      const response = await authService.authenticatedRequest<{ files: FileData[] }>('/api/getfiles');
      
      if (response.success && response.data) {
        setFiles(response.data.files || []);
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handleUploadClick = () => {
    setUploadModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      // Initialize upload
      const initResponse = await authService.authenticatedRequest<{ uploadId: string }>('/api/uploads/init', {
        method: 'POST',
        body: JSON.stringify({ filename: selectedFile.name })
      });

      if (!initResponse.success || !initResponse.data?.uploadId) {
        throw new Error(initResponse.message || 'Failed to initialize upload');
      }

      const uploadId = initResponse.data.uploadId;
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);

      // Upload chunks
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
            'Authorization': `Bearer ${authService.getAccessToken()}`
          },
          body: chunkFormData
        });

        if (!chunkResponse.ok) {
          throw new Error(`Failed to upload chunk ${i}`);
        }
      }

      // Complete upload
      const completeResponse = await authService.authenticatedRequest('/api/uploads/complete', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          originalName: selectedFile.name,
          size: selectedFile.size
        })
      });

      if (completeResponse.success) {
        alert('File uploaded successfully!');
        setUploadModalOpen(false);
        setSelectedFile(null);
        fetchFiles(); // Refresh file list
      } else {
        throw new Error(completeResponse.message || 'Failed to complete upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const handleDownload = async (file: FileData) => {
    try {
      // For now, we'll use the file path to download
      // In a real implementation, you'd have a download endpoint
      const response = await fetch(`http://localhost:8000/api/download/${file.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authService.getAccessToken()}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalname;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback: try to download from path
        alert('Download endpoint not available. File path: ' + file.path);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
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

  // Pagination logic
  const indexOfLastFile = currentPage * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = files.slice(indexOfFirstFile, indexOfLastFile);
  const totalPages = Math.ceil(files.length / filesPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of files section when page changes
    const filesSection = document.querySelector('.files-section');
    if (filesSection) {
      filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Reset to page 1 when files change
  useEffect(() => {
    setCurrentPage(1);
  }, [files.length]);

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
      {/* Header */}
      <header className="user-homepage-header">
        <div className="header-content">
          <h1>Welcome, {user?.firstName} {user?.lastName}</h1>
          <p className="organization-name">{user?.organizationName}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="user-homepage-main">
        <div className={`user-content ${files.length === 0 && !filesLoading && !error ? 'centered-layout' : 'normal-layout'}`}>
          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={handleUploadClick} className="action-button upload-button">
              <span className="button-icon">📤</span>
              <span className="button-text">Upload</span>
            </button>
            <button onClick={fetchFiles} className="action-button download-button">
              <span className="button-icon">📥</span>
              <span className="button-text">Download</span>
            </button>
          </div>

          {/* Files List */}
          <div className="files-section">
            <h2 className="files-section-title">Files Shared With You</h2>
            
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
            ) : files.length === 0 ? (
              <div className="files-empty">
                <div className="empty-icon">📁</div>
                <p>No files available</p>
                <p className="empty-subtitle">Upload files to get started</p>
              </div>
            ) : (
              <>
                <div className="files-list-container">
                  <div className="files-list">
                    {currentFiles.map((file) => (
                      <div key={file.id} className="file-item">
                        <div className="file-info">
                          <div className="file-icon">📄</div>
                          <div className="file-details">
                            <h3 className="file-name">{file.originalname}</h3>
                            <p className="file-meta">
                              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                              {file.uploader && (
                                <span> • Uploaded by {file.uploader.firstName} {file.uploader.lastName}</span>
                              )}
                              {file.isShared && <span className="shared-badge">Shared</span>}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDownload(file)} 
                          className="download-file-button"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-button"
                    >
                      Previous
                    </button>
                    <div className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload File</h2>
            <input
              type="file"
              onChange={handleFileSelect}
              className="file-input"
            />
            <div className="modal-actions">
              <button onClick={() => {
                setUploadModalOpen(false);
                setSelectedFile(null);
              }} className="modal-button cancel-button">
                Cancel
              </button>
              <button 
                onClick={handleUpload} 
                className="modal-button upload-submit-button"
                disabled={!selectedFile}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
