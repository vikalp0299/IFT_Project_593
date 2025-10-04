/**
 * Main Application Logic for Secure File Encryption
 */

class FileEncryptionApp {
    constructor() {
        this.cryptoUtils = new CryptoUtils();
        this.currentFile = null;
        this.encryptedFile = null;
        this.decryptedFile = null;
        this.initializeEventListeners();
        this.checkExistingKeys();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File upload area
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Key management buttons
        document.getElementById('generateKeys').addEventListener('click', this.generateKeys.bind(this));
        document.getElementById('loadKeys').addEventListener('click', this.loadKeys.bind(this));

        // Public key upload
        document.getElementById('uploadPublicKey').addEventListener('click', this.uploadPublicKey.bind(this));

        // File operations
        document.getElementById('encryptFile').addEventListener('click', this.encryptFile.bind(this));
        document.getElementById('decryptFile').addEventListener('click', this.decryptFile.bind(this));
        document.getElementById('downloadEncrypted').addEventListener('click', this.downloadEncryptedFile.bind(this));
        document.getElementById('downloadDecrypted').addEventListener('click', this.downloadDecryptedFile.bind(this));
    }

    /**
     * Check if keys already exist in storage
     */
    async checkExistingKeys() {
        try {
            const keyStatus = await this.cryptoUtils.keysExist();
            if (keyStatus.privateKeyExists || keyStatus.publicKeyExists) {
                this.showStatus('Keys found in storage. You can load them or generate new ones.', 'info', 'keyStatus');
            }
        } catch (error) {
            console.log('No existing keys found');
        }
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    /**
     * Handle file drop
     */
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * Process selected file
     */
    processFile(file) {
        this.currentFile = file;
        
        // Display file info
        document.getElementById('fileName').textContent = `Name: ${file.name}`;
        document.getElementById('fileSize').textContent = `Size: ${this.formatFileSize(file.size)}`;
        document.getElementById('fileType').textContent = `Type: ${file.type || 'Unknown'}`;
        document.getElementById('fileInfo').style.display = 'block';
        
        // Show encrypt button
        document.getElementById('encryptFile').style.display = 'inline-block';
        
        // Hide previous results
        document.getElementById('encryptedFileSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
    }

    /**
     * Generate new key pair
     */
    async generateKeys() {
        const password = document.getElementById('password').value;
        if (!password) {
            this.showStatus('Please enter a master password', 'error', 'keyStatus');
            return;
        }

        try {
            this.showProgress('Generating key pair...');
            
            // Generate new key pair
            const keyPair = await this.cryptoUtils.generateKeyPair();
            
            // Store encrypted private key
            await this.cryptoUtils.storeEncryptedPrivateKey(keyPair.privateKey, password);
            
            // Store public key
            // await this.cryptoUtils.storePublicKey(keyPair.publicKey);
            
            this.hideProgress();
            this.showStatus('✅ Key pair generated and stored securely!', 'success', 'keyStatus');
            
            // Export public key for sharing
            const publicKeyPEM = await this.cryptoUtils.exportPublicKeyAsPEM();
            fetch('https://wknwff37-8080.usw3.devtunnels.ms/api/files/pubkey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mysecrettoken'},
                body: JSON.stringify({ publicKey: publicKeyPEM })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Public key uploaded:', data);
            })
            .catch(error => {
                console.error('Error uploading public key:', error);
            });

            // // Provide public key download
            // this.downloadPublicKey(publicKeyPEM);            
        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ Key generation failed: ${error.message}`, 'error', 'keyStatus');
        }
    }

    /**
     * Load existing keys
     */
    async loadKeys() {
        const password = document.getElementById('password').value;
        if (!password) {
            this.showStatus('Please enter your master password', 'error', 'keyStatus');
            return;
        }

        try {
            this.showProgress('Loading keys...');
            
            await this.cryptoUtils.loadEncryptedPrivateKey(password);
            
            this.hideProgress();
            this.showStatus('✅ Keys loaded successfully!', 'success', 'keyStatus');
            
        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ Failed to load keys: ${error.message}`, 'error', 'keyStatus');
        }
    }

    /**
     * Upload public key from file
     */
    async uploadPublicKey() {
        const fileInput = document.getElementById('publicKeyFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showStatus('Please select a public key file', 'error', 'publicKeyStatus');
            return;
        }

        try {
            this.showProgress('Importing public key...');
            
            await this.cryptoUtils.importPublicKeyFromFile(file);
            
            this.hideProgress();
            this.showStatus('✅ Public key imported successfully!', 'success', 'publicKeyStatus');
            
        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ Failed to import public key: ${error.message}`, 'error', 'publicKeyStatus');
        }
    }

    /**
     * Encrypt the selected file
     */
    async encryptFile() {
        if (!this.currentFile) {
            this.showStatus('Please select a file first', 'error', 'keyStatus');
            return;
        }

        try {
            this.showProgress('Encrypting file...');
            
            // Encrypt the file
            this.encryptedFile = await this.cryptoUtils.encryptFile(this.currentFile);
            
            this.hideProgress();
            
            // Display encrypted file info
            document.getElementById('encryptedFileName').textContent = `Encrypted: ${this.currentFile.name}.encrypted`;
            document.getElementById('encryptedFileSize').textContent = `Size: ${this.formatFileSize(this.encryptedFile.length)}`;
            document.getElementById('encryptedFileSection').style.display = 'block';
            
            this.showStatus('✅ File encrypted successfully!', 'success', 'keyStatus');
            
        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ Encryption failed: ${error.message}`, 'error', 'keyStatus');
        }
    }

    /**
     * Decrypt the encrypted file
     */
    async decryptFile() {
        if (!this.encryptedFile) {
            this.showStatus('No encrypted file available', 'error', 'keyStatus');
            return;
        }

        try {
            this.showProgress('Decrypting file...');
            
            // Decrypt the file
            this.decryptedFile = await this.cryptoUtils.decryptFile(this.encryptedFile);
            
            this.hideProgress();
            
            // Display file preview
            this.displayFilePreview();
            document.getElementById('previewSection').style.display = 'block';
            
            this.showStatus('✅ File decrypted successfully!', 'success', 'keyStatus');
            
        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ Decryption failed: ${error.message}`, 'error', 'keyStatus');
        }
    }

    /**
     * Display file preview
     */
    displayFilePreview() {
        const preview = document.getElementById('filePreview');
        const file = this.currentFile;
        
        if (file.type.startsWith('text/')) {
            // Text file preview
            const text = new TextDecoder().decode(this.decryptedFile);
            preview.innerHTML = `<pre>${this.escapeHtml(text.substring(0, 1000))}${text.length > 1000 ? '\n... (truncated)' : ''}</pre>`;
        } else if (file.type.startsWith('image/')) {
            // Image preview
            const blob = new Blob([this.decryptedFile], { type: file.type });
            const url = URL.createObjectURL(blob);
            preview.innerHTML = `<img src="${url}" style="max-width: 100%; height: auto;" alt="Preview">`;
        } else {
            // Binary file info
            preview.innerHTML = `
                <p><strong>File Type:</strong> ${file.type || 'Unknown'}</p>
                <p><strong>Original Size:</strong> ${this.formatFileSize(file.size)}</p>
                <p><strong>Decrypted Size:</strong> ${this.formatFileSize(this.decryptedFile.length)}</p>
                <p><em>This is a binary file. Use the download button to save it.</em></p>
            `;
        }
    }

    /**
     * Download encrypted file
     */
    downloadEncryptedFile() {
        if (!this.encryptedFile) return;
        
        const blob = new Blob([this.encryptedFile], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFile.name}.encrypted`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download decrypted file
     */
    downloadDecryptedFile() {
        if (!this.decryptedFile) return;
        
        const blob = new Blob([this.decryptedFile], { type: this.currentFile.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download public key as PEM file
     */
    downloadPublicKey(publicKeyPEM) {
        const blob = new Blob([publicKeyPEM], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'public_key.pem';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show status message
     */
    showStatus(message, type, elementId) {
        const statusElement = document.getElementById(elementId);
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Show progress bar
     */
    showProgress(message) {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            progressFill.style.width = `${progress}%`;
        }, 200);
        
        // Store interval for cleanup
        this.progressInterval = interval;
    }

    /**
     * Hide progress bar
     */
    hideProgress() {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        progressFill.style.width = '100%';
        
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 500);
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FileEncryptionApp();
});
