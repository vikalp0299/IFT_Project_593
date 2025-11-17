import express from 'express';
import {
  addUserToPermissionList,
  removeUserFromPermissionList,
  getPermissionList
} from '../controllers/permissionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All permission routes require authentication
router.use(authenticateToken);

// POST /permissions - Add user to permission list
router.post('/permissions', addUserToPermissionList);

// DELETE /permissions - Remove user from permission list
router.delete('/permissions', removeUserFromPermissionList);

// GET /permissions/:departmentName - Get permission list for department
router.get('/permissions/:departmentName', getPermissionList);

export default router;


