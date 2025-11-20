import express from 'express';
import {
  configureOrganization,
  getOrganizationConfig,
} from '../controllers/organizationConfigController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Configure organization (requires admin authentication)
router.post('/organization-config', authenticateAdmin, configureOrganization);

// Get organization configuration (requires admin authentication)
router.get('/organization-config/:organizationName', authenticateAdmin, getOrganizationConfig);

export default router;

