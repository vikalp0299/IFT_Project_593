import express from 'express';
import {
  storePrivateKey,
  checkPrivateKeyExists,
  getPrivateKey,
  createDepartmentWithKeys,
} from '../controllers/privateKeyController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/private-key', authenticateAdmin, storePrivateKey);
router.post('/departments', authenticateAdmin, createDepartmentWithKeys);
router.get('/private-key/check/:departmentName', checkPrivateKeyExists);
router.get('/private-key/:departmentName', authenticateAdmin, getPrivateKey);

export default router;