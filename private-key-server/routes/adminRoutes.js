import express from 'express';
import {
  registerAdmin,
  searchEmployees,
  addEmployeeToPermission
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /admin/registration
 * @desc Register admin account (Public - no auth required during setup)
 * @access Public
 * @body { username, email, password, firstName, lastName, phone, organizationId }
 */
router.post('/registration', registerAdmin);

// All other admin routes require authentication
router.use(authenticateToken);

/**
 * @route GET /admin/search-employees
 * @desc Search for employees/users (Admin only)
 * @access Private (Admin only)
 * @query search, department, organizationId
 */
router.get('/search-employees', searchEmployees);

/**
 * @route POST /admin/add-to-permission
 * @desc Add employee to permission list for a department (Admin only)
 * @access Private (Admin only)
 * @body { departmentName, userId (or username, or userEmail) }
 */
router.post('/add-to-permission', addEmployeeToPermission);

export default router;

