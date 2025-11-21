import multer from 'multer';
import fss from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/File.js';
import mime from 'mime-types';
import { getUserIdfromToken, getCurrentUser } from '../middleware/auth.js';
import mongoose from 'mongoose';
import PublicKey from '../models/PublicKey.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { Organization } from '../db.js';
import LocalServer from '../models/LocalServer.js';
import {
  generateSymmetricKey,
  encryptFileFromDisk,
  writeEncryptedFile,
  encryptSymmetricKey,
  decryptFileFromDisk,
  decryptSymmetricKey,
} from '../utils/fileEncryption.js';
import blockChainFunctionHandler from '../blockchain/controllers/blockChainFunctionHandler.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




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
        console.log('Completing upload for user:', userId);
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

        // Add file to blockchain ledger
        try {
            // Get organization ID from req.user (already populated by authenticateToken middleware)
            const organizationId = req.user?.organizationId;
            console.log('Current user for blockchain integration:', req.user?.userId, organizationId);
            if (!organizationId) {
                throw new Error('Organization ID not found for user');
            }
            
            // Fetch organization to get blockchainOrgName
            const organization = await Organization.findById(organizationId).select('blockchainOrgName hasBlockchain');
            
            if (!organization) {
                throw new Error('Organization not found');
            }
            
            if (!organization.hasBlockchain) {
                console.log('Organization does not have blockchain enabled, skipping blockchain sync');
            } else if (!organization.blockchainOrgName) {
                throw new Error('Organization blockchain name not configured');
            } else {
                const orgName = organization.blockchainOrgName;
                
                // Get blockchain org names for all organizations in accessRights and agreementOrgs
                const orgIds = new Set();
                
                // Collect all organization IDs
                sanitizedAccessRights.forEach(ar => {
                    if (ar.organizationId) {
                        orgIds.add(ar.organizationId.toString());
                    }
                });
                
                if (editAgreementRequired && sanitizedAgreementOrgs.length > 0) {
                    sanitizedAgreementOrgs.forEach(org => {
                        if (org.organizationId) {
                            orgIds.add(org.organizationId.toString());
                        }
                    });
                }
                
                // Fetch all organizations with blockchain names
                const organizations = await Organization.find({
                    _id: { $in: Array.from(orgIds) }
                }).select('_id blockchainOrgName hasBlockchain');
                
                // Create a map of organizationId -> blockchainOrgName
                const orgIdToBlockchainName = new Map();
                organizations.forEach(org => {
                    if (org.hasBlockchain && org.blockchainOrgName) {
                        orgIdToBlockchainName.set(org._id.toString(), org.blockchainOrgName);
                    }
                });
                
                // Prepare allowedOrgs string using blockchain org names
                const allowedOrgsMSPs = [];
                sanitizedAccessRights.forEach(ar => {
                    const blockchainOrgName = orgIdToBlockchainName.get(ar.organizationId?.toString());
                    if (blockchainOrgName) {
                        allowedOrgsMSPs.push(`${blockchainOrgName}MSP`);
                    }
                });
                const allowedOrgsStr = allowedOrgsMSPs.join(',');
                
                // Prepare requiredOrgs string if multi-sig is required
                // Always include the owner organization in requiredOrgs for multi-sig
                let requiredOrgsStr = '';
                if (editAgreementRequired) {
                    const requiredOrgSet = new Set();
                    
                    // Add owner organization MSP ID
                    requiredOrgSet.add(`${orgName}MSP`);
                    
                    // Add agreement organizations using their blockchain names
                    if (sanitizedAgreementOrgs.length > 0) {
                        sanitizedAgreementOrgs.forEach(org => {
                            const blockchainOrgName = orgIdToBlockchainName.get(org.organizationId?.toString());
                            if (blockchainOrgName) {
                                requiredOrgSet.add(`${blockchainOrgName}MSP`);
                            }
                        });
                    }
                    
                    requiredOrgsStr = Array.from(requiredOrgSet).join(',');
                }
                
                const blockchainHandler = new blockChainFunctionHandler();
                const configFile = path.join(__dirname, '../blockchain/generated_resources/network-config.yaml');
                
                const blockchainFileData = {
                    fileId: savedFile._id.toString(),
                    filename: originalName,
                    ipfsCid: `ipfs-${uploadId}`, // Placeholder until IPFS integration
                    size: encryptedFileData.ciphertext.length,
                    allowedOrgsStr: allowedOrgsStr,
                    multiSigRequired: !!editAgreementRequired,
                    createdAt: new Date().toISOString(),
                    requiredOrgsStr: requiredOrgsStr,
                    metadata: JSON.stringify({
                        mimetype: mimeType,
                        encrypted: true,
                        uploadedBy: userId.toString()
                    })
                };
                
                console.log('Adding file to blockchain:', {
                    org: orgName,
                    fileId: blockchainFileData.fileId,
                    filename: blockchainFileData.filename
                });
                
                await blockchainHandler.createFile(
                    configFile,
                    orgName,
                    'peer0',
                    'test',
                    blockchainFileData,
                    'asset'
                );
                
                console.log('File added to blockchain successfully');
            }
        } catch (blockchainError) {
            console.error('Blockchain integration error:', blockchainError);
            // Don't fail the upload if blockchain fails - file is already in MongoDB
            console.warn('File uploaded to database but blockchain sync failed:', blockchainError.message);
        }

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

/**
 * Propose Edit - Create a proposal to edit a file
 * POST /files/:fileId/propose-edit
 */
export const proposeFileEdit = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { newContent, originalContent, encryptedNewFile } = req.body;
        const userId = req.user?.id;

        if (!fileId || !newContent || !originalContent) {
            return res.status(400).json({
                success: false,
                message: 'File ID, original content, and new content are required'
            });
        }

        // Fetch the file from database
        const file = await File.findById(fileId).populate('uploadedBy', 'username');
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if there's already an active proposal
        if (file.activeProposalId) {
            return res.status(400).json({
                success: false,
                message: 'There is already an active edit proposal for this file',
                proposalId: file.activeProposalId
            });
        }

        // Only allow text files to be edited
        if (!file.mimetype || !file.mimetype.startsWith('text/')) {
            return res.status(400).json({
                success: false,
                message: 'Only text files can be edited. This file type is: ' + file.mimetype
            });
        }

        // Check if user has access to this file
        const userOrg = req.user?.organizationId;
        const hasAccess = file.accessRights.some(ar => 
            ar.organizationId.toString() === userOrg.toString()
        );

        if (!hasAccess && file.uploadedBy._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit this file'
            });
        }

        // Get organization blockchain info
        const organization = await Organization.findById(userOrg).select('blockchainOrgName hasBlockchain');
        
        if (!organization || !organization.hasBlockchain || !organization.blockchainOrgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization does not have blockchain enabled'
            });
        }

        const proposerMSP = `${organization.blockchainOrgName}MSP`;

        // Generate proposal ID (will be set by blockchain, but we need one for file paths)
        const proposalId = `proposal_${fileId}_${Date.now()}`;

        // Store the new encrypted file if provided
        if (encryptedNewFile) {
            // Save the new encrypted file to a temporary location
            const uploadsDir = path.join(__dirname, '../uploads');
            const proposedFilePath = path.join(uploadsDir, userId.toString(), `${proposalId}_proposed`);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(proposedFilePath), { recursive: true });
            
            // Write the encrypted file
            await fs.writeFile(proposedFilePath, Buffer.from(encryptedNewFile, 'base64'));
            
            // Update file record with proposal paths
            file.oldFilePath = file.path; // Backup current file path
            file.proposedFilePath = proposedFilePath; // New proposed file path
            file.activeProposalId = proposalId;
        }

        // Prepare proposal data (frontend will handle diff calculation and display)
        const proposalData = JSON.stringify({
            originalContent,
            newContent,
            proposedBy: req.user?.username,
            proposedAt: new Date().toISOString(),
            filename: file.originalname,
            proposalId
        });

        // Call blockchain to create edit proposal
        const blockchainHandler = new blockChainFunctionHandler();
        const configFile = path.join(__dirname, '../blockchain/generated_resources/network-config.yaml');

        const result = await blockchainHandler.proposeEdit(
            configFile,
            organization.blockchainOrgName,
            'peer0',
            'test',
            fileId,
            proposalData,
            proposerMSP
        );

        // Save file with proposal tracking
        await file.save();

        res.json({
            success: true,
            message: 'Edit proposal created successfully',
            data: {
                fileId,
                proposalId,
                proposer: proposerMSP,
                result
            }
        });

    } catch (error) {
        console.error('Propose edit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create edit proposal',
            error: error.message
        });
    }
};

/**
 * Approve Edit - Approve a pending edit proposal
 * POST /files/:fileId/approve-edit
 */
export const approveFileEdit = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { proposalId } = req.body;
        const userId = req.user?.id;

        if (!fileId || !proposalId) {
            return res.status(400).json({
                success: false,
                message: 'File ID and proposal ID are required'
            });
        }

        // Fetch the file from database
        const file = await File.findById(fileId);
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if user's organization is in requiredOrgs for multi-sig
        const userOrg = req.user?.organizationId;
        const hasApprovalRights = file.editAgreementOrganizations?.some(org => 
            org.organizationId.toString() === userOrg.toString()
        );

        if (!hasApprovalRights) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to approve edits for this file'
            });
        }

        // Get organization blockchain info
        const organization = await Organization.findById(userOrg).select('blockchainOrgName hasBlockchain');
        
        if (!organization || !organization.hasBlockchain || !organization.blockchainOrgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization does not have blockchain enabled'
            });
        }

        const approverMSP = `${organization.blockchainOrgName}MSP`;

        // Call blockchain to approve edit
        const blockchainHandler = new blockChainFunctionHandler();
        const configFile = path.join(__dirname, '../blockchain/generated_resources/network-config.yaml');

        const result = await blockchainHandler.approveEdit(
            configFile,
            organization.blockchainOrgName,
            'peer0',
            'test',
            fileId,
            proposalId,
            approverMSP
        );

        // Check if all required orgs have approved (blockchain will indicate this)
        // If approved by all, clean up files
        const isFullyApproved = result.output && result.output.includes('updated with approval from all');
        
        if (isFullyApproved && file.proposedFilePath) {
            // Delete old file from storage
            if (file.oldFilePath) {
                try {
                    await fs.unlink(file.oldFilePath);
                    console.log('Old file deleted:', file.oldFilePath);
                } catch (err) {
                    console.warn('Failed to delete old file:', err.message);
                }
            }
            
            // Switch to new file as current version
            file.path = file.proposedFilePath;
            file.proposedFilePath = null;
            file.oldFilePath = null;
            file.activeProposalId = null;
            await file.save();
            
            console.log('File updated to new version:', file.path);
        } else {
            // Still waiting for more approvals, keep both files
            console.log('Approval recorded, waiting for other organizations');
        }

        res.json({
            success: true,
            message: isFullyApproved 
                ? 'Edit approved by all organizations. File updated to new version.' 
                : 'Your approval has been recorded. Waiting for other organizations.',
            data: {
                fileId,
                proposalId,
                approver: approverMSP,
                fullyApproved: isFullyApproved,
                result
            }
        });

    } catch (error) {
        console.error('Approve edit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve edit proposal',
            error: error.message
        });
    }
};

/**
 * Reject Edit - Reject a pending edit proposal
 * POST /files/:fileId/reject-edit
 */
export const rejectFileEdit = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { proposalId, reason } = req.body;
        const userId = req.user?.id;

        if (!fileId || !proposalId) {
            return res.status(400).json({
                success: false,
                message: 'File ID and proposal ID are required'
            });
        }

        // Fetch the file from database
        const file = await File.findById(fileId);
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if user's organization is in requiredOrgs for multi-sig
        const userOrg = req.user?.organizationId;
        const hasRejectionRights = file.editAgreementOrganizations?.some(org => 
            org.organizationId.toString() === userOrg.toString()
        );

        if (!hasRejectionRights) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to reject edits for this file'
            });
        }

        // Get organization blockchain info
        const organization = await Organization.findById(userOrg).select('blockchainOrgName hasBlockchain');
        
        if (!organization || !organization.hasBlockchain || !organization.blockchainOrgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization does not have blockchain enabled'
            });
        }

        const rejectorMSP = `${organization.blockchainOrgName}MSP`;

        // Call blockchain to reject edit
        const blockchainHandler = new blockChainFunctionHandler();
        const configFile = path.join(__dirname, '../blockchain/generated_resources/network-config.yaml');

        const result = await blockchainHandler.rejectEdit(
            configFile,
            organization.blockchainOrgName,
            'peer0',
            'test',
            fileId,
            proposalId,
            rejectorMSP,
            reason || 'No reason provided'
        );

        // Delete the proposed/new file version from storage
        if (file.proposedFilePath) {
            try {
                await fs.unlink(file.proposedFilePath);
                console.log('Proposed file deleted:', file.proposedFilePath);
            } catch (err) {
                console.warn('Failed to delete proposed file:', err.message);
            }
        }
        
        // Clear proposal tracking and keep original file
        file.proposedFilePath = null;
        file.oldFilePath = null;
        file.activeProposalId = null;
        await file.save();
        
        console.log('Proposal rejected. Original file retained:', file.path);

        res.json({
            success: true,
            message: 'Edit proposal rejected. Proposed changes have been discarded.',
            data: {
                fileId,
                proposalId,
                rejector: rejectorMSP,
                reason: reason || 'No reason provided',
                result
            }
        });

    } catch (error) {
        console.error('Reject edit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject edit proposal',
            error: error.message
        });
    }
};

/**
 * Get Pending Edits - Fetch all edit proposals awaiting approval for the user's organization
 * GET /files/pending-edits
 */
export const getPendingEdits = async (req, res) => {
    try {
        const userOrg = req.user?.organizationId;

        // Get organization blockchain info
        const organization = await Organization.findById(userOrg).select('blockchainOrgName hasBlockchain');
        
        if (!organization || !organization.hasBlockchain || !organization.blockchainOrgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization does not have blockchain enabled'
            });
        }

        // Find all files where:
        // 1. editAgreementRequired = true (multi-sig files)
        // 2. activeProposalId exists (has pending proposal)
        // 3. User's org is in editAgreementOrganizations (has approval rights)
        const files = await File.find({
            editAgreementRequired: true,
            activeProposalId: { $ne: null },
            'editAgreementOrganizations.organizationId': userOrg
        })
        .populate('uploadedBy', 'username email')
        .select('_id originalname mimetype uploadedBy editAgreementOrganizations activeProposalId uploadedAt')
        .lean();

        res.json({
            success: true,
            data: {
                pendingEdits: files.map(file => ({
                    fileId: file._id,
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    uploadedBy: file.uploadedBy,
                    uploadedAt: file.uploadedAt,
                    proposalId: file.activeProposalId,
                    requiredOrganizations: file.editAgreementOrganizations
                }))
            }
        });

    } catch (error) {
        console.error('Get pending edits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending edits',
            error: error.message
        });
    }
};

/**
 * Get Proposal Details - Get detailed information about a specific edit proposal
 * GET /files/:fileId/proposal/:proposalId
 */
export const getProposalDetails = async (req, res) => {
    try {
        const { fileId, proposalId } = req.params;
        const userOrg = req.user?.organizationId;

        // Fetch the file from database
        const file = await File.findById(fileId)
            .populate('uploadedBy', 'username email')
            .select('originalname mimetype editAgreementRequired editAgreementOrganizations');
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if user's organization has approval rights
        const hasApprovalRights = file.editAgreementOrganizations?.some(org => 
            org.organizationId.toString() === userOrg.toString()
        );

        if (!hasApprovalRights) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this proposal'
            });
        }

        // Get organization blockchain info
        const organization = await Organization.findById(userOrg).select('blockchainOrgName hasBlockchain');
        
        if (!organization || !organization.hasBlockchain || !organization.blockchainOrgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization does not have blockchain enabled'
            });
        }

        // Query blockchain using existing GetEditApprovals function
        const blockchainHandler = new blockChainFunctionHandler();
        const configFile = path.join(__dirname, '../blockchain/generated_resources/network-config.yaml');
        
        try {
            const result = await blockchainHandler.queryChaincode(
                configFile,
                organization.blockchainOrgName,
                'peer0',
                'test',
                'asset',
                'GetEditApprovals',
                [fileId]
            );

            const proposalInfo = JSON.parse(result);
            
            // Parse proposal metadata to get content
            let proposalData = {};
            if (proposalInfo.editProposal && proposalInfo.editProposal.proposedMetadata) {
                proposalData = JSON.parse(proposalInfo.editProposal.proposedMetadata);
            }

            res.json({
                success: true,
                data: {
                    fileId,
                    proposalId,
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    originalContent: proposalData.originalContent || '',
                    newContent: proposalData.newContent || '',
                    proposedBy: proposalData.proposedBy || '',
                    proposedAt: proposalData.proposedAt || '',
                    approvals: proposalInfo.editApprovals || {},
                    requiredOrgs: proposalInfo.requiredOrgs || [],
                    approvalStatus: proposalInfo.approvalStatus || []
                }
            });

        } catch (blockchainError) {
            console.error('Blockchain query error:', blockchainError);
            return res.status(500).json({
                success: false,
                message: 'Failed to query blockchain for proposal details',
                error: blockchainError.message
            });
        }

    } catch (error) {
        console.error('Get proposal details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch proposal details',
            error: error.message
        });
    }
};







