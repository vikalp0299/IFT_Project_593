import express from 'express';
import {
  getAdminStatus,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/admin/status', getAdminStatus);
router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.post('/admin/logout', authenticateAdmin, logoutAdmin);
router.get('/admin/profile', authenticateAdmin, getAdminProfile);

export default router;

