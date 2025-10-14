//imports
import express from 'express';
import { authenticateToken } from '../controller/loginController.js';
import { completeUpload, displayAllFiles, initUpload, uploadChunk} from '../controller/fileController.js';

const router = express.Router();

// Get user's files (protected route)
router.get('/files', authenticateToken, displayAllFiles);

// Chunked upload endpoints (protected - require authentication)
router.post('/uploads/init', authenticateToken, initUpload);
router.post('/uploads/chunk', authenticateToken, uploadChunk);
router.post('/uploads/complete', authenticateToken, completeUpload);

//exporting the router
export default router;