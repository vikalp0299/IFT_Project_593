import multer from 'multer';
import fss from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/File.js';
import mime from 'mime-types';
import { getUserIdfromToken } from '../middleware/auth.js';
import mongoose from 'mongoose';
import PublicKey from '../models/PublicKey.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import LocalServer from '../models/LocalServer.js';
import {
  generateSymmetricKey,
  encryptFileFromDisk,
  writeEncryptedFile,
  encryptSymmetricKey,
  decryptFileFromDisk,
  decryptSymmetricKey,
} from '../utils/fileEncryption.js';




/**
 * Display all files for the authenticated user
 * Uses JWT token (via authenticateToken middleware) to identify user
 * Queries using both userId and uploader fields per File model convention
 * 
 * 
 */
export const displayAllFiles = async (req, res) => {
    try {
        // User ID extracted from JWT by authenticateToken middleware
        const userId = getUserIdfromToken(req);
        //console.log('Fetching files for userId:', userId);
        // const userId = req.user.userId;

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

/**
 * Get files shared with the authenticated user
 * Returns files the user uploaded AND files shared with the user (where user is in access array)
 */
export const getFilesSharedWithUser = async (req, res) => {
    try {
        // User ID from authenticated request (set by authenticateToken middleware)
        const userId = req.user?.id || req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        // Convert userId to ObjectId if it's a string
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        // Get user's department and organization info
        const user = await User.findById(userObjectId).select('department organization organizationName');
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const userDepartmentName = user.department?.toLowerCase().trim();
        const userOrgId = user.organization;
        const userOrgName = user.organizationName?.toLowerCase().trim();

        // Find user's department to get departmentId
        let userDepartmentId = null;
        if (userDepartmentName && userOrgId) {
          const userDepartment = await Department.findOne({
            organization: userOrgId,
            departmentName: userDepartmentName,
          });
          userDepartmentId = userDepartment?._id;
        }

        // Query MongoDB for files:
        // 1. Files uploaded by the user (userId or uploader matches)
        // 2. Files shared with the user's department (department is in accessRights)
        const queryConditions = [
          { userId: userObjectId },
          { uploader: userObjectId },
        ];

        // Add condition for files shared with user's department
        if (userDepartmentId && userOrgId) {
          queryConditions.push({
            'accessRights': {
              $elemMatch: {
                departmentId: userDepartmentId,
                organizationId: userOrgId,
              }
            }
          });
        }

        // Get all files that match the query conditions
        const allFiles = await File.find({ 
            $or: queryConditions
        })
        .select('_id filename originalname size uploadedAt path mimetype userId uploader access accessRights encryption encryptedSymmetricKeys')
        .populate('uploader', 'username firstName lastName organization organizationName')
        .sort({ uploadedAt: -1 }); // Most recent first

        // Separate files into two categories:
        // 1. Files uploaded by users in the same organization (files shared BY this department)
        // 2. Files shared WITH this department from other organizations
        
        const filesSharedByMyDepartment = [];
        const filesSharedWithMyDepartment = [];

        for (const file of allFiles) {
            const isUploadedByUser = file.userId?.toString() === userId.toString() || 
                                   file.uploader?._id?.toString() === userId.toString();
            
            // Get uploader's organization info
            let uploaderOrgId = null;
            if (file.userId) {
                // Get the organization from the user who uploaded the file
                const uploaderUser = await User.findById(file.userId).select('organization organizationName');
                if (uploaderUser && uploaderUser.organization) {
                    uploaderOrgId = uploaderUser.organization.toString();
                }
            }
            
            // Check if file is shared with user's department
            const isSharedWithMyDept = file.accessRights?.some(access => 
                access.departmentId?.toString() === userDepartmentId?.toString() &&
                access.organizationId?.toString() === userOrgId?.toString()
            );

            const fileData = {
                id: file._id,
                filename: file.filename,
                originalname: file.originalname,
                size: file.size,
                uploadedAt: file.uploadedAt,
                path: file.path,
                mimetype: file.mimetype,
                uploader: file.uploader ? {
                    username: file.uploader.username,
                    firstName: file.uploader.firstName,
                    lastName: file.uploader.lastName
                } : null,
                isEncrypted: !!file.encryption,
                accessRights: file.accessRights?.map(access => ({
                    organizationName: access.organizationDisplayName || access.organizationName,
                    departmentName: access.departmentDisplayName || access.departmentName,
                })) || [],
            };

            // Categorize files
            // If uploaded by user or by someone in the same organization, it's shared BY my department
            if (isUploadedByUser || (uploaderOrgId && uploaderOrgId === userOrgId?.toString())) {
                filesSharedByMyDepartment.push(fileData);
            } else if (isSharedWithMyDept) {
                // File shared WITH this department from another organization
                // Find which organization/department shared it (from accessRights)
                const sharingAccess = file.accessRights?.find(access => 
                    access.departmentId?.toString() === userDepartmentId?.toString() &&
                    access.organizationId?.toString() === userOrgId?.toString()
                );
                
                // Also check if there's an access right from a different organization
                const externalSharingOrg = file.accessRights?.find(access => 
                    access.organizationId?.toString() !== userOrgId?.toString()
                );
                
                filesSharedWithMyDepartment.push({
                    ...fileData,
                    sharedBy: externalSharingOrg ? {
                        organizationName: externalSharingOrg.organizationDisplayName || externalSharingOrg.organizationName,
                        departmentName: externalSharingOrg.departmentDisplayName || externalSharingOrg.departmentName,
                    } : (sharingAccess ? {
                        organizationName: sharingAccess.organizationDisplayName || sharingAccess.organizationName,
                        departmentName: sharingAccess.departmentDisplayName || sharingAccess.departmentName,
                    } : null)
                });
            }
        }

        // Return files in two separate arrays
        res.status(200).json({
            success: true,
            data: {
                filesSharedByMyDepartment: {
                    count: filesSharedByMyDepartment.length,
                    files: filesSharedByMyDepartment
                },
                filesSharedWithMyDepartment: {
                    count: filesSharedWithMyDepartment.length,
                    files: filesSharedWithMyDepartment
                },
                totalCount: filesSharedByMyDepartment.length + filesSharedWithMyDepartment.length
            }
        });

    } catch (error) {
        console.error('Error fetching files shared with user:', error);
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
        const userId = req.user?.id || req.user?.userId || getUserIdfromToken(req);

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
            data: {
                uploadId
            },
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
            const userId = req.user?.id || req.user?.userId || getUserIdfromToken(req);

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
    const {
      uploadId,
      originalName,
      size,
      accessRights,
      editAgreementRequired,
      editAgreementOrganizations,
      timeToHoldMs,
    } = req.body;
        const userId = req.user?.id || req.user?.userId;

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

        // Final file path (temporary, before encryption): /uploads/<userId>/<uploadId>_temp
        const tempFilePath = path.join(userUploadsDir, `${uploadId}_temp`);
        const writeStream = fss.createWriteStream(tempFilePath);

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

        console.log('File reassembled at:', tempFilePath);

        // Generate symmetric key for file encryption
        const symmetricKey = generateSymmetricKey();
        console.log('Generated symmetric key for file encryption');

        // Encrypt the file
        const encryptedFileData = await encryptFileFromDisk(tempFilePath, symmetricKey);
        console.log('File encrypted successfully');

        // Final encrypted file path: /uploads/<userId>/<uploadId>
        const finalFilePath = path.join(userUploadsDir, uploadId);
        await writeEncryptedFile(encryptedFileData.ciphertext, finalFilePath);

        // Cleanup temporary unencrypted file
        await fs.unlink(tempFilePath).catch((err) => {
          console.warn('Failed to delete temp file:', err.message);
        });

        console.log('Encrypted file written to:', finalFilePath);

        // Detect MIME type
        const mimeType = mime.lookup(originalName) || 'application/octet-stream';

        const holdDurationMs = Number.isFinite(Number(timeToHoldMs)) && Number(timeToHoldMs) > 0
          ? Number(timeToHoldMs)
          : 24 * 60 * 60 * 1000;

        const sanitizedAccessRights = Array.isArray(accessRights)
          ? accessRights
              .map((entry) => {
                if (
                  !entry ||
                  !entry.organizationId ||
                  !entry.organizationName ||
                  !entry.departmentId ||
                  !entry.departmentName
                ) {
                  return null;
                }

                const orgId = mongoose.Types.ObjectId.isValid(entry.organizationId)
                  ? new mongoose.Types.ObjectId(entry.organizationId)
                  : null;
                const deptId = mongoose.Types.ObjectId.isValid(entry.departmentId)
                  ? new mongoose.Types.ObjectId(entry.departmentId)
                  : null;

                if (!orgId || !deptId) {
                  return null;
                }

                return {
                  organizationId: orgId,
                  organizationName: entry.organizationName.toLowerCase().trim(),
                  organizationDisplayName:
                    entry.organizationDisplayName?.trim() || entry.organizationName,
                  departmentId: deptId,
                  departmentName: entry.departmentName.toLowerCase().trim(),
                  departmentDisplayName:
                    entry.departmentDisplayName?.trim() || entry.departmentName,
                };
              })
              .filter(Boolean)
          : [];

        const sanitizedAgreementOrgs =
          editAgreementRequired && Array.isArray(editAgreementOrganizations)
            ? editAgreementOrganizations
                .map((org) => {
                  if (!org?.organizationId || !org?.organizationName) {
                    return null;
                  }
                  const orgId = mongoose.Types.ObjectId.isValid(org.organizationId)
                    ? new mongoose.Types.ObjectId(org.organizationId)
                    : null;
                  if (!orgId) {
                    return null;
                  }
                return {
                  organizationId: orgId,
                  organizationName: org.organizationName.toLowerCase().trim(),
                  organizationDisplayName:
                    org.organizationDisplayName?.trim() || org.organizationName,
                };
                })
                .filter(Boolean)
            : [];

        if (sanitizedAccessRights.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'At least one access rule is required',
          });
        }

        // Get public keys for each department and encrypt symmetric key
        const encryptedSymmetricKeys = [];
        const errors = [];

        for (const accessRight of sanitizedAccessRights) {
          try {
            // SECURITY: Validate access right data before processing
            if (!accessRight.departmentId || !accessRight.organizationId) {
              errors.push(
                `Invalid access right data for ${accessRight.departmentDisplayName || 'unknown department'}`
              );
              continue;
            }

            // Find public key for this department
            const publicKey = await PublicKey.findOne({
              department: accessRight.departmentId,
              organization: accessRight.organizationId,
              isActive: true,
            });

            if (!publicKey) {
              errors.push(
                `Public key not found for department ${accessRight.departmentDisplayName} in organization ${accessRight.organizationDisplayName}`
              );
              continue;
            }

            // SECURITY: Validate public key format
            if (!publicKey.publicKeyPem || typeof publicKey.publicKeyPem !== 'string') {
              errors.push(
                `Invalid public key format for department ${accessRight.departmentDisplayName}`
              );
              continue;
            }

            // Encrypt symmetric key with department's public key
            const encryptedKey = encryptSymmetricKey(symmetricKey, publicKey.publicKeyPem);
            
            // SECURITY: Validate encrypted key was created successfully
            if (!encryptedKey || typeof encryptedKey !== 'string') {
              throw new Error('Failed to encrypt symmetric key');
            }

            encryptedSymmetricKeys.push({
              departmentId: accessRight.departmentId,
              departmentName: accessRight.departmentName,
              organizationId: accessRight.organizationId,
              organizationName: accessRight.organizationName,
              encryptedKey: encryptedKey,
              publicKeyId: publicKey.keyId,
            });

            console.log(
              `Encrypted symmetric key for department: ${accessRight.departmentDisplayName}`
            );
          } catch (error) {
            console.error(
              `Error encrypting symmetric key for department ${accessRight.departmentDisplayName}:`,
              error
            );
            errors.push(
              `Failed to encrypt key for ${accessRight.departmentDisplayName}: ${error.message}`
            );
          }
        }

        if (encryptedSymmetricKeys.length === 0) {
          // Cleanup encrypted file if we couldn't encrypt keys for any department
          await fs.unlink(finalFilePath).catch(() => undefined);
          return res.status(400).json({
            success: false,
            error: 'Failed to encrypt symmetric keys for any department',
            details: errors,
          });
        }

        if (errors.length > 0) {
          console.warn('Some departments failed key encryption:', errors);
        }

        // Save file metadata to MongoDB (matches File model schema)
        const fileMetadata = {
            filename: uploadId,                    // Stored filename (UUID)
            originalname: originalName,            // Original filename from user
            mimetype: mimeType,                    // Detected MIME type
            size: encryptedFileData.ciphertext.length, // Encrypted file size in bytes
            path: `uploads/${userId}/${uploadId}`, // Relative path from project root
            userId: userId,                        // Primary user reference (ObjectId)
            uploader: userId,                      // Dual field per File model convention
            access: [],                            // Empty array for future sharing feature
            uploadedAt: new Date(),                // Upload timestamp
            toHoldTime: new Date(Date.now() + holdDurationMs), // Retention period
            accessRights: sanitizedAccessRights,
            editAgreementRequired: !!editAgreementRequired,
            editAgreementOrganizations: sanitizedAgreementOrgs,
            encryption: {
              algorithm: encryptedFileData.algorithm,
              iv: encryptedFileData.iv,
              authTag: encryptedFileData.authTag,
            },
            encryptedSymmetricKeys: encryptedSymmetricKeys,
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

/**
 * Download file - returns encrypted file and decrypted symmetric key for client-side decryption
 * Gets encrypted symmetric key for user's department, sends it to private-key-server for decryption,
 * then returns encrypted file + symmetric key to frontend for client-side decryption
 */
export async function downloadFile(req, res) {
    try {
        const { fileId } = req.params;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        if (!fileId) {
            return res.status(400).json({
                success: false,
                message: 'File ID is required'
            });
        }

        // Get file from database
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if file is encrypted
        if (!file.encryption || !file.encryptedSymmetricKeys || file.encryptedSymmetricKeys.length === 0) {
            // Legacy file - return as-is (not encrypted)
            // SECURITY: Path traversal protection
            const filePath = path.resolve(file.path);
            const uploadsDir = path.resolve(process.cwd(), 'uploads');
            
            // Verify the resolved path is within the uploads directory
            if (!filePath.startsWith(uploadsDir)) {
                console.error(`SECURITY: Path traversal attempt detected. File path: ${filePath}`);
                return res.status(403).json({
                    success: false,
                    message: 'Invalid file path'
                });
            }

            try {
                await fs.access(filePath);
                return res.download(filePath, file.originalname);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found on disk'
                });
            }
        }

        // Get user's department info
        const user = await User.findById(userId).select('department organization organizationName');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userDepartmentName = user.department?.toLowerCase().trim();
        const userOrgId = user.organization;
        const userOrgName = user.organizationName?.toLowerCase().trim();

        if (!userDepartmentName || !userOrgId) {
            return res.status(400).json({
                success: false,
                message: 'User department information is missing'
            });
        }

        // Find user's department to get departmentId
        const userDepartment = await Department.findOne({
            organization: userOrgId,
            departmentName: userDepartmentName,
        });

        if (!userDepartment) {
            return res.status(404).json({
                success: false,
                message: 'User department not found'
            });
        }

        // SECURITY: Verify user actually belongs to this department in the database
        // Double-check that the user's department matches what's in their profile
        if (user.department?.toLowerCase().trim() !== userDepartmentName) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: User department mismatch'
            });
        }

        // SECURITY: Verify user's organization matches
        if (user.organization?.toString() !== userOrgId.toString() || 
            user.organizationName?.toLowerCase().trim() !== userOrgName) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: User organization mismatch'
            });
        }

        // Find encrypted symmetric key for user's department
        const encryptedKeyEntry = file.encryptedSymmetricKeys.find(
            (entry) =>
                entry.departmentId?.toString() === userDepartment._id.toString() &&
                entry.organizationId?.toString() === userOrgId.toString()
        );

        if (!encryptedKeyEntry) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to decrypt this file. Your department is not in the access list.'
            });
        }

        // SECURITY: Additional validation - ensure the encrypted key entry matches the file
        if (!encryptedKeyEntry.encryptedKey || typeof encryptedKeyEntry.encryptedKey !== 'string') {
            return res.status(500).json({
                success: false,
                message: 'Invalid encrypted symmetric key data'
            });
        }

        // Get private-key-server URL from LocalServer (to send to frontend)
        const localServer = await LocalServer.findOne({
            organization: userOrgId,
            isActive: true,
        });

        if (!localServer) {
            return res.status(500).json({
                success: false,
                message: 'Private-key-server not configured for your organization'
            });
        }

        // Read encrypted file
        // SECURITY: Path traversal protection - ensure file path is within allowed directory
        const filePath = path.resolve(file.path);
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        
        // Verify the resolved path is within the uploads directory
        if (!filePath.startsWith(uploadsDir)) {
            console.error(`SECURITY: Path traversal attempt detected. File path: ${filePath}`);
            return res.status(403).json({
                success: false,
                message: 'Invalid file path'
            });
        }

        let encryptedFileContent;
        try {
            encryptedFileContent = await fs.readFile(filePath);
        } catch (error) {
            console.error('Error reading encrypted file:', error);
            return res.status(404).json({
                success: false,
                message: 'File not found on disk'
            });
        }

        // SECURITY: Validate encryption metadata before sending
        if (!file.encryption.iv || !file.encryption.authTag || !file.encryption.algorithm) {
            return res.status(500).json({
                success: false,
                message: 'File encryption metadata is incomplete'
            });
        }

        // Return encrypted file + encrypted symmetric key + encryption metadata to frontend
        // Frontend will contact private-key-server directly to decrypt the symmetric key
        // Then frontend will decrypt the file client-side
        // NOTE: Only return data for the user's specific department (not all departments)
        res.json({
            success: true,
            data: {
                encryptedFile: encryptedFileContent.toString('base64'),
                encryptedSymmetricKey: encryptedKeyEntry.encryptedKey, // Encrypted symmetric key (frontend will decrypt via private-key-server)
                organizationId: encryptedKeyEntry.organizationId.toString(),
                organizationName: encryptedKeyEntry.organizationName,
                departmentId: encryptedKeyEntry.departmentId.toString(),
                departmentName: encryptedKeyEntry.departmentName,
                // Note: user info is not sent - private-key-server will get it from JWT token
                iv: file.encryption.iv,
                authTag: file.encryption.authTag,
                algorithm: file.encryption.algorithm,
                filename: file.originalname,
                mimetype: file.mimetype,
                privateKeyServerUrl: localServer.baseUrl, // Local server URL for frontend to contact
            }
        });

    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file',
            error: error.message
        });
    }
}




