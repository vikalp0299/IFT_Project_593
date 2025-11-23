import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const IPFS_API_URL = process.env.IPFS_API_URL || 'http://localhost:5001';
const IPFS_GATEWAY_URL = process.env.IPFS_GATEWAY_URL || 'http://localhost:8080';

/**
 * Check if IPFS is available
 */
export async function isIPFSAvailable() {
    try {
        const response = await fetch(`${IPFS_API_URL}/api/v0/id`, {
            method: 'POST',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.warn('IPFS is not available:', error.message);
        return false;
    }
}

/**
 * Upload file to IPFS
 * @param {string} filePath - Path to the file to upload
 * @param {string} filename - Original filename
 * @returns {Promise<{cid: string, size: number}>} - IPFS CID and file size
 */
export async function uploadToIPFS(filePath, filename) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), {
            filename: filename
        });

        const response = await fetch(`${IPFS_API_URL}/api/v0/add?pin=true`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders(),
            timeout: 60000 // 60 second timeout for large files
        });

        if (!response.ok) {
            throw new Error(`IPFS upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ File uploaded to IPFS:', result.Hash);
        
        return {
            cid: result.Hash,
            size: parseInt(result.Size, 10)
        };
    } catch (error) {
        console.error('IPFS upload error:', error);
        throw error;
    }
}

/**
 * Download file from IPFS
 * @param {string} cid - IPFS CID
 * @returns {Promise<Buffer>} - File content as buffer
 */
export async function downloadFromIPFS(cid) {
    try {
        const response = await fetch(`${IPFS_GATEWAY_URL}/ipfs/${cid}`, {
            timeout: 60000
        });

        if (!response.ok) {
            throw new Error(`IPFS download failed: ${response.statusText}`);
        }

        const buffer = await response.buffer();
        console.log('✅ File downloaded from IPFS:', cid);
        
        return buffer;
    } catch (error) {
        console.error('IPFS download error:', error);
        throw error;
    }
}

/**
 * Pin a file to IPFS (ensure it stays in storage)
 * @param {string} cid - IPFS CID to pin
 */
export async function pinToIPFS(cid) {
    try {
        const response = await fetch(`${IPFS_API_URL}/api/v0/pin/add?arg=${cid}`, {
            method: 'POST',
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`IPFS pin failed: ${response.statusText}`);
        }

        console.log('✅ File pinned to IPFS:', cid);
        return true;
    } catch (error) {
        console.error('IPFS pin error:', error);
        throw error;
    }
}

/**
 * Unpin a file from IPFS (allow garbage collection)
 * @param {string} cid - IPFS CID to unpin
 */
export async function unpinFromIPFS(cid) {
    try {
        const response = await fetch(`${IPFS_API_URL}/api/v0/pin/rm?arg=${cid}`, {
            method: 'POST',
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`IPFS unpin failed: ${response.statusText}`);
        }

        console.log('✅ File unpinned from IPFS:', cid);
        return true;
    } catch (error) {
        console.error('IPFS unpin error:', error);
        // Don't throw - unpinning is optional
        return false;
    }
}

/**
 * Get file stats from IPFS
 * @param {string} cid - IPFS CID
 * @returns {Promise<{size: number}>}
 */
export async function getIPFSStats(cid) {
    try {
        const response = await fetch(`${IPFS_API_URL}/api/v0/object/stat?arg=${cid}`, {
            method: 'POST',
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`IPFS stat failed: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            size: parseInt(result.CumulativeSize, 10)
        };
    } catch (error) {
        console.error('IPFS stat error:', error);
        throw error;
    }
}
