/**
 * Files Page JavaScript - Upload and Refresh Functionality
 * Handles file uploads using chunked upload pattern
 * Integrates with JWT authentication and file display
 */

document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadMessage = document.getElementById('uploadMessage');
    const fileInfo = document.getElementById('fileInfo');
    const refreshBtn = document.getElementById('refreshBtn');

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Initialize refresh functionality
    setupRefresh();

    // File input change handler - show file info
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            fileInfo.textContent = `Selected: ${file.name} (${sizeInMB} MB)`;
            fileInfo.style.color = '#667eea';
        } else {
            fileInfo.textContent = '';
        }
    });

    // Upload form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadFile();
    });

    /**
     * Upload file using chunked upload pattern
     */
    async function uploadFile() {
        const file = fileInput.files[0];
        
        // Client-side validation
        if (!file) {
            showUploadMessage('Please select a file to upload', 'error');
            return;
        }

        // Check file size (optional: max 100MB)
        const maxSizeMB = 100;
        if (file.size > maxSizeMB * 1024 * 1024) {
            showUploadMessage(`File size exceeds ${maxSizeMB}MB limit`, 'error');
            return;
        }

        try {
            console.log('Starting file upload:', file.name, file.size, 'bytes');
            
            // Disable upload button
            uploadBtn.disabled = true;
            const originalHTML = uploadBtn.innerHTML;
            uploadBtn.innerHTML = '<span>⏳</span><span>Uploading...</span>';
            uploadMessage.innerHTML = '';

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Step 1: Initialize upload
            console.log('Step 1: Initializing upload...');
            const initResponse = await fetch('/api/uploads/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filename: file.name })
            });

            if (!initResponse.ok) {
                throw new Error('Failed to initialize upload');
            }

            const { uploadId } = await initResponse.json();
            console.log('Upload initialized with ID:', uploadId);

            // Step 2: Upload file in chunks (5MB chunks)
            const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            console.log(`Step 2: Uploading ${totalChunks} chunks...`);

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('uploadId', uploadId);
                formData.append('chunkIndex', chunkIndex);

                const chunkResponse = await fetch('/api/uploads/chunk', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!chunkResponse.ok) {
                    throw new Error(`Failed to upload chunk ${chunkIndex}`);
                }

                // Update progress
                const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                uploadBtn.innerHTML = `<span>⏳</span><span>Uploading ${progress}%</span>`;
                console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${progress}%)`);
            }

            // Step 3: Complete upload and save metadata
            console.log('Step 3: Completing upload...');
            const completeResponse = await fetch('/api/uploads/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    uploadId,
                    originalName: file.name,
                    size: file.size
                })
            });

            if (!completeResponse.ok) {
                const errorData = await completeResponse.json();
                throw new Error(errorData.message || 'Failed to complete upload');
            }

            const result = await completeResponse.json();
            console.log('Upload completed successfully:', result);

            // Show success message
            showUploadMessage(`File "${file.name}" uploaded successfully!`, 'success');

            // Clear form
            uploadForm.reset();
            fileInfo.textContent = '';

            // Refresh file list
            if (typeof loadFiles === 'function') {
                setTimeout(() => loadFiles(), 1000);
            }

        } catch (error) {
            console.error('Upload error:', error);
            showUploadMessage(error.message || 'Upload failed. Please try again.', 'error');
        } finally {
            // Re-enable upload button
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<span>📤</span><span>Upload</span>';
        }
    }

    /**
     * Setup refresh button functionality
     */
    function setupRefresh() {
        if (!refreshBtn) {
            console.warn('Refresh button not found');
            return;
        }

        // Refresh button already has click handler in fileDisplay.js
        // This ensures it's properly initialized
        console.log('Refresh functionality initialized');
    }

    /**
     * Show upload message to user
     * @param {string} message - Message text
     * @param {string} type - 'success' or 'error'
     */
    function showUploadMessage(message, type = 'error') {
        const className = type === 'success' ? 'message success' : 'message error';
        uploadMessage.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
        
        // Auto-clear success messages
        if (type === 'success') {
            setTimeout(() => {
                uploadMessage.innerHTML = '';
            }, 5000);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
