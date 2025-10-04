# Secure File Encryption System

A comprehensive web-based file encryption system that implements the most secure method for key storage using Web Crypto API and IndexedDB.

## Features

### 🔐 **Secure Key Management**
- **Web Crypto API Integration**: Uses browser's built-in cryptographic features
- **IndexedDB Storage**: Secure client-side storage for cryptographic keys
- **PBKDF2 + AES-GCM**: Private keys are encrypted with user password using industry-standard algorithms
- **Non-extractable Keys**: Private key material is never exposed to JavaScript

### 📁 **File Operations**
- **Drag & Drop Interface**: Modern, intuitive file upload experience
- **End-to-End Encryption**: RSA-OAEP encryption for file security
- **File Preview**: Supports text and image file previews
- **Download Options**: Download both encrypted and decrypted files

### 🔑 **Key Features**
- **Asymmetric Encryption**: RSA-2048 key pairs for secure communication
- **Public Key Sharing**: Export/import public keys in PEM format
- **Password Protection**: Master password required for private key access
- **Cross-Session Persistence**: Keys stored securely across browser sessions

## Security Implementation

### Key Storage Strategy
This implementation follows the most secure method for web-based key storage:

1. **CryptoKey Generation**: Uses Web Crypto API to generate RSA key pairs
2. **Non-extractable Private Keys**: Private keys cannot be read by JavaScript
3. **IndexedDB Storage**: CryptoKey objects stored directly in IndexedDB
4. **Password Encryption**: Private keys encrypted with PBKDF2-derived keys
5. **AES-GCM Protection**: Symmetric encryption with authentication

### Security Benefits
- **XSS Protection**: Key material never exposed to malicious scripts
- **Physical Access Protection**: Additional password-based encryption layer
- **Client-Side Processing**: All cryptographic operations happen locally
- **No Server Dependencies**: Complete client-side solution

## Usage Instructions

### 1. **Initial Setup**
1. Open `index.html` in a modern web browser
2. Enter a strong master password
3. Click "Generate New Keys" to create your key pair
4. The public key will be automatically downloaded as `public_key.pem`

### 2. **File Encryption**
1. Drag and drop a file or click to browse
2. Click "Encrypt File" to encrypt with your public key
3. The encrypted file will be displayed with download options

### 3. **File Decryption**
1. Ensure your private key is loaded (enter password and click "Load Existing Keys")
2. Click "Decrypt & Preview" to decrypt the file
3. Preview the decrypted content and download if needed

### 4. **Public Key Sharing**
1. Share your `public_key.pem` file with others
2. Others can upload your public key to encrypt files for you
3. Only you can decrypt files encrypted with your public key

## Technical Details

### Encryption Algorithm
- **Key Type**: RSA-OAEP with 2048-bit modulus
- **Hash Function**: SHA-256
- **File Encryption**: Chunked RSA encryption for files of any size
- **Key Derivation**: PBKDF2 with 100,000 iterations

### Browser Compatibility
- **Chrome**: 37+
- **Firefox**: 34+
- **Safari**: 7+
- **Edge**: 12+

### File Size Limitations
- **Recommended**: Files under 10MB for optimal performance
- **Maximum**: Limited by browser memory (typically 100MB+)
- **Large Files**: Automatically chunked for encryption/decryption

## File Structure

```
file_encryption/
├── index.html          # Main UI and application structure
├── crypto-utils.js     # Cryptographic utilities and key management
├── app.js             # Main application logic and event handling
└── README.md          # This documentation
```

## Security Considerations

### Best Practices
1. **Strong Passwords**: Use a strong, unique master password
2. **Regular Backups**: Export and backup your public key
3. **Secure Environment**: Only use on trusted devices
4. **HTTPS**: Deploy over HTTPS in production environments

### Limitations
1. **Browser Storage**: Keys are tied to specific browser/device
2. **No Key Recovery**: Lost password means lost access to encrypted files
3. **Client-Side Only**: No server-side key escrow or recovery
4. **File Size**: Large files may impact browser performance

## Development Notes

### Key Components
- **CryptoUtils Class**: Handles all cryptographic operations
- **FileEncryptionApp Class**: Manages UI interactions and file operations
- **IndexedDB Integration**: Secure key storage and retrieval
- **Progress Indicators**: User feedback for long-running operations

### Error Handling
- Comprehensive error messages for all operations
- Graceful fallbacks for unsupported browsers
- Input validation and sanitization
- Secure error reporting without exposing sensitive data

## Future Enhancements

### Potential Improvements
1. **Hybrid Encryption**: Combine RSA with AES for better performance
2. **Key Rotation**: Support for key versioning and rotation
3. **Multi-User**: Support for multiple key pairs per user
4. **Cloud Storage**: Optional cloud backup for public keys
5. **Mobile Support**: Progressive Web App features

### Performance Optimizations
1. **Web Workers**: Move encryption to background threads
2. **Streaming**: Support for streaming large files
3. **Compression**: Built-in file compression before encryption
4. **Caching**: Intelligent caching of frequently used keys

## License

This project is provided as-is for educational and development purposes. Please ensure compliance with local laws and regulations regarding cryptographic software.
