//imports
import express from 'express';
import { completeUpload, displayAllFiles, initUpload, uploadChunk} from '../controller/fileController.js';

const router = express.Router();

//Display files
router.get('/dispfiles',displayAllFiles );


//Upload file

//router.post('/upload',uploadFile);

//Test routers
router.post('/uploads/init',initUpload);
router.post('/uploads/chunk',uploadChunk);
router.post('/uploads/complete',completeUpload);



//exporting the router
export default router;