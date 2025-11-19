import express from 'express';
import {
  storePrivateKey,
  checkPrivateKeyExists,
  getPrivateKey
} from '../controllers/privateKeyController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/private-key', authenticateAdmin, storePrivateKey);
router.get('/private-key/check/:departmentName', checkPrivateKeyExists);
router.get('/private-key/:departmentName', authenticateAdmin, getPrivateKey);

export default router;