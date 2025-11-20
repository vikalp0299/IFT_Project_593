//imports
import express from 'express';
import { completeUpload, displayAllFiles, initUpload, uploadChunk, getFilesSharedWithUser, downloadFile} from '../controller/fileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

//Display files
router.get('/dispfiles',displayAllFiles );

//Get files shared with user (includes files user uploaded and files shared with user)
router.get('/getfiles', authenticateToken, getFilesSharedWithUser);


//Upload file

//router.post('/upload',uploadFile);

//Upload routers (require authentication)
router.post('/uploads/init', authenticateToken, initUpload);
router.post('/uploads/chunk', authenticateToken, uploadChunk);
router.post('/uploads/complete', authenticateToken, completeUpload);

//Download file (requires authentication)
router.get('/download/:fileId', authenticateToken, downloadFile);

//exporting the router
export default router;