import express from 'express';
import {
  storePrivateKey,
  checkPrivateKeyExists,
  getPrivateKey,
  createDepartmentWithKeys,
  deleteDepartment,
  decryptSymmetricKey,
} from '../controllers/privateKeyController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/private-key', authenticateAdmin, storePrivateKey);
router.post('/departments', authenticateAdmin, createDepartmentWithKeys);
router.delete(
  '/departments/:organizationName/:departmentName',
  authenticateAdmin,
  deleteDepartment
);
router.get('/private-key/check/:departmentName', checkPrivateKeyExists);
router.get('/private-key/:departmentName', authenticateAdmin, getPrivateKey);
router.post('/private-key/decrypt-symmetric-key', authenticateToken, decryptSymmetricKey);

export default router;