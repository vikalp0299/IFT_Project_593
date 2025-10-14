import multer from 'multer';
import fss from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/File.js';
import mime from 'mime-types';

/**
 * Display all files for the authenticated user
 * Uses JWT token (via authenticateToken middleware) to identify user
 * Queries using both userId and uploader fields per File model convention
 */
export const displayAllFiles = async (req, res) => {
    try {
        // User ID extracted from JWT by authenticateToken middleware
        const userId = req.user.userId;

        // Query MongoDB for files belonging to this user
        // Using $or with both userId and uploader for backward compatibility
        const userFiles = await File.find({ 
            $or: [
                { userId: userId },
                { uploader: userId }
            ]
        })
        .select('filename originalname size uploadedAt path mimetype')
        .sort({ uploadedAt: -1 }); // Most recent first

        // Return files as JSON
        res.status(200).json({
            success: true,
            count: userFiles.length,
            files: userFiles
        });

    } catch (error) {
        console.error('Error fetching user files:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving files',
            error: error.message
        });
    }
};

const TEMP_UPLOAD_DIR = path.resolve('temp_uploads');
const UPLOADS_DIR = path.resolve('uploads');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Initialize chunked upload
 * Creates temp directory for storing chunks
 */
export async function initUpload(req, res) {
    try {
        const { filename } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User authentication required' 
            });
        }

        if (!filename) {
            return res.status(400).json({ 
                success: false,
                error: 'Filename is required' 
            });
        }

        console.log('Init upload for user:', userId, 'filename:', filename);

        // Generate unique upload ID
        const uploadId = uuidv4();
        
        // Create temp directory for chunks
        const tempDir = path.join(TEMP_UPLOAD_DIR, uploadId);
        await fs.mkdir(tempDir, { recursive: true });

        res.json({ 
            success: true,
            uploadId,
            message: 'Upload initialized'
        });

    } catch (error) {
        console.error('Init upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to initialize upload',
            message: error.message 
        });
    }
}

/**
 * Upload individual chunk
 * Stores chunk in temp directory
 */
export const uploadChunk = [
    // Multer middleware to parse the multipart form
    upload.single('chunk'),
    // Actual request handler
    async (req, res) => {
        try {
            const { uploadId, chunkIndex } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ 
                    success: false,
                    error: 'User authentication required' 
                });
            }

            if (!uploadId || chunkIndex === undefined) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing uploadId or chunkIndex' 
                });
            }

            if (!req.file?.buffer) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing chunk file' 
                });
            }

            console.log(`Uploading chunk ${chunkIndex} for upload ${uploadId}`);

            // Write chunk to temp directory
            const chunkPath = path.join(TEMP_UPLOAD_DIR, uploadId, `chunk_${chunkIndex}`);
            await fs.writeFile(chunkPath, req.file.buffer);

            res.json({ 
                success: true,
                received: Number(chunkIndex),
                message: `Chunk ${chunkIndex} uploaded`
            });

        } catch (error) {
            console.error('Upload chunk error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to upload chunk',
                message: error.message 
            });
        }
    }
];

/**
 * Complete upload
 * Reassembles chunks and moves file to user-specific directory
 * Structure: /uploads/<userId>/<uploadId>
 */
export async function completeUpload(req, res) {
    try {
        const { uploadId, originalName, size } = req.body;
        const userId = req.user?.userId;

        // Validate authentication
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User authentication required' 
            });
        }

        // Validate required fields
        if (!uploadId) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing uploadId' 
            });
        }

        if (!originalName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing originalName' 
            });
        }

        console.log('Completing upload:', { uploadId, originalName, userId });

        // Check if temp directory exists
        const tempDir = path.join(TEMP_UPLOAD_DIR, uploadId);
        try {
            await fs.access(tempDir);
        } catch (error) {
            return res.status(404).json({ 
                success: false,
                error: 'Upload session not found or expired' 
            });
        }

        // Read and sort chunks
        const chunkFiles = await fs.readdir(tempDir);
        chunkFiles.sort((a, b) => {
            const idxA = parseInt(a.split('_')[1], 10);
            const idxB = parseInt(b.split('_')[1], 10);
            return idxA - idxB;
        });

        // Create user-specific directory: /uploads/<userId>/
        const userUploadsDir = path.join(UPLOADS_DIR, userId.toString());
        await fs.mkdir(userUploadsDir, { recursive: true });

        // Final file path: /uploads/<userId>/<uploadId>
        const finalFilePath = path.join(userUploadsDir, uploadId);
        const writeStream = fss.createWriteStream(finalFilePath);

        // Reassemble chunks
        for (const chunkFile of chunkFiles) {
            const chunkData = await fs.readFile(path.join(tempDir, chunkFile));
            writeStream.write(chunkData);
        }

        // Wait for stream to finish
        await new Promise((resolve, reject) => {
            writeStream.end((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('File reassembled at:', finalFilePath);

        // Detect MIME type
        const mimeType = mime.lookup(originalName) || 'application/octet-stream';

        // Save file metadata to MongoDB (matches File model schema)
        const fileMetadata = {
            filename: uploadId,                    // Stored filename (UUID)
            originalname: originalName,            // Original filename from user
            mimetype: mimeType,                    // Detected MIME type
            size: size || 0,                       // File size in bytes
            path: `uploads/${userId}/${uploadId}`, // Relative path from project root
            userId: userId,                        // Primary user reference (ObjectId)
            uploader: userId,                      // Dual field per File model convention
            access: [],                            // Empty array for future sharing feature
            uploadedAt: new Date(),                // Upload timestamp
            toHoldTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours retention
        };

        const savedFile = await File.create(fileMetadata);
        console.log('File metadata saved to database:', savedFile._id);

        // Cleanup temp chunks
        await fs.rm(tempDir, { recursive: true, force: true });

        res.json({ 
            success: true,
            message: 'File uploaded successfully',
            fileId: savedFile._id,
            filename: originalName,
            path: fileMetadata.path,
            size: size
        });

    } catch (error) {
        console.error('Complete upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to complete upload',
            message: error.message 
        });
    }
}





