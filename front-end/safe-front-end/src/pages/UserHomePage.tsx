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
  const [isDragging, setIsDragging] = useState(false);
  const [ttlDays, setTtlDays] = useState('');
  const [ttlHours, setTtlHours] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

  const handleOrganizationSearch = async () => {
    if (!organizationSearch.trim()) {
      return;
    }
    
    setIsSearching(true);
    // TODO: Add backend API call here
    // For now, simulate with mock data
    setTimeout(() => {
      // Mock departments - replace with actual API call
      setDepartments(['IT', 'HR', 'Finance', 'Marketing', 'Operations']);
      setIsSearching(false);
    }, 500);
  };

  const handleCloseModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setTtlDays('');
    setTtlHours('');
    setTtlMinutes('');
    setOrganizationSearch('');
    setDepartments([]);
    setSelectedDepartment('');
    setIsDragging(false);
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
        handleCloseModal();
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

            {/* Organization Search */}
            <div className="organization-search-section">
              <label className="org-search-label">Search Organization</label>
              <div className="org-search-input-group">
                <input
                  type="text"
                  value={organizationSearch}
                  onChange={(e) => setOrganizationSearch(e.target.value)}
                  placeholder="Enter organization name"
                  className="org-search-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleOrganizationSearch();
                    }
                  }}
                />
                <button
                  onClick={handleOrganizationSearch}
                  className="search-button"
                  disabled={!organizationSearch.trim() || isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Department Dropdown */}
            {departments.length > 0 && (
              <div className="department-section">
                <label className="department-label">Select Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="department-select"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-actions">
              <button 
                onClick={handleCloseModal} 
                className="modal-button cancel-button"
              >
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
