import multer from 'multer';
import fss from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/File.js';

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
        .select('fileName originalName size uploadDate uploadId access')
        .sort({ uploadDate: -1 }); // Most recent first

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

const UPLOAD_DIR = path.resolve('temp_uploads');
const upload = multer({ storage: multer.memoryStorage() });

export async function initUpload(req, res) {
  const { filename } = req.body;
  console.log(req.body);


  const uploadId = uuidv4();
  
  const dir = path.join(UPLOAD_DIR, uploadId);
  await fs.mkdir(dir, { recursive: true });
  res.json({ uploadId });
}

export const uploadChunk = [
  // Multer middleware to parse the multipart form
  upload.single('chunk'),
  // Actual request handler
  async (req, res) => {
    console.log(req.body);
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: 'Missing uploadId or chunkIndex' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing chunk file' });
    }
    console.log(req.file.buffer)
    const chunkPath = path.join(UPLOAD_DIR, uploadId, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, req.file.buffer);
    res.json({ received: Number(chunkIndex) });
  }
];

export async function completeUpload(req, res) {
  const { uploadId } = req.body;
  const dir = path.join(UPLOAD_DIR, uploadId);
  const files = await fs.readdir(dir);

  // Sort chunks by index
  files.sort((a, b) => {
    const idxA = parseInt(a.split('_')[1], 10);
    const idxB = parseInt(b.split('_')[1], 10);
    return idxA - idxB;
  });

  const finalPath = path.resolve('uploads', `${uploadId}`);
  const writeStream = fss.createWriteStream(finalPath);

  for (const fname of files) {
    const data = await fs.readFile(path.join(dir, fname));
    writeStream.write(data);
  }
  writeStream.end();

  // Cleanup temp chunks
  await fs.rm(dir, { recursive: true, force: true });

  res.json({ fileUrl: `/uploads/${uploadId}` });
}





