import express from 'express';
import {
  storePrivateKey,
  checkPrivateKeyExists,
  getPrivateKey
} from '../controllers/privateKeyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /private-key - Store encrypted private key (no auth required for storing)
router.post('/private-key', storePrivateKey);

// GET /private-key/check/:departmentName - Check if private key exists (no auth required)
router.get('/private-key/check/:departmentName', checkPrivateKeyExists);

// GET /private-key/:departmentName - Get private key (requires authentication)
router.get('/private-key/:departmentName', authenticateToken, getPrivateKey);

export default router;


