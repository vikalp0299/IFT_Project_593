/**
 * Files Display Page JavaScript
 * Handles displaying user-specific files with JWT authentication
 * Auto-loads files on page load and provides refresh functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    const fileListDiv = document.getElementById('fileList');
    const messageArea = document.getElementById('messageArea');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameSpan = document.getElementById('userName');

    // Check authentication on page load
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login if no token
        window.location.href = '/index.html';
        return;
    }

    // Display username if available
    const username = localStorage.getItem('username');
    if (username) {
        userNameSpan.textContent = username;
    } else {
        userNameSpan.textContent = 'User';
    }

    // Auto-load files on page load
    loadFiles();

    // Refresh button handler
    refreshBtn.addEventListener('click', () => {
        loadFiles();
    });

    // Logout button handler
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/index.html';
        }
    });

    /**
     * Load user files from API
     */
    async function loadFiles() {
        try {
            // Disable refresh button
            refreshBtn.disabled = true;
            const refreshText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span>⏳</span><span>Loading...</span>';

            // Clear previous messages
            messageArea.innerHTML = '';
            fileListDiv.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading your files...</p>
                </div>
            `;

            // Get JWT token
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Make API request to existing endpoint
            const response = await fetch('/api/files', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                    showMessage('Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 2000);
                    return;
                }
                throw new Error(data.message || 'Failed to fetch files');
            }

            // Display files
            displayFiles(data.files);
            
            // Show success message
            if (data.count > 0) {
                showMessage(`Successfully loaded ${data.count} file(s)`, 'success');
            }

        } catch (error) {
            console.error('Error loading files:', error);
            fileListDiv.innerHTML = '';
            showMessage(error.message || 'Failed to load files. Please try again.', 'error');
        } finally {
            // Re-enable refresh button
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span>🔄</span><span>Refresh</span>';
        }
    }

    /**
     * Display files in the UI
     * @param {Array} files - Array of file objects
     */
    function displayFiles(files) {
        if (!files || files.length === 0) {
            fileListDiv.innerHTML = `
                <div class="no-files">
                    <div class="no-files-icon">📂</div>
                    <h3>No files found</h3>
                    <p>Upload some files to get started!</p>
                </div>
            `;
            return;
        }

        const fileHTML = files.map(file => {
            const fileName = file.originalName || file.fileName || 'Unnamed File';
            const fileSize = formatFileSize(file.size);
            const uploadDate = formatDate(file.uploadDate);
            const uploadId = file.uploadId || 'N/A';
            const accessLevel = file.access && file.access.length > 0 
                ? `Shared with ${file.access.length} user(s)` 
                : 'Private';
            
            return `
                <div class="file-item">
                    <div class="file-name">
                        <span>📄</span>
                        <span>${escapeHtml(fileName)}</span>
                    </div>
                    <div class="file-meta">
                        <span><strong>💾 Size:</strong> ${fileSize}</span>
                        <span><strong>📅 Uploaded:</strong> ${uploadDate}</span>
                        <span><strong>🔑 ID:</strong> ${escapeHtml(uploadId)}</span>
                        <span><strong>🔒 Access:</strong> ${accessLevel}</span>
                    </div>
                </div>
            `;
        }).join('');

        fileListDiv.innerHTML = fileHTML;
    }

    /**
     * Show message to user
     * @param {string} message - Message text
     * @param {string} type - 'success' or 'error'
     */
    function showMessage(message, type = 'error') {
        messageArea.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
        
        // Auto-clear success messages
        if (type === 'success') {
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 5000);
        }
    }

    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format date in readable format
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
