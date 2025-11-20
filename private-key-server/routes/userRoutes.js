import express from 'express';
import {
  registerLocalUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getUserStatus,
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/userAuth.js';

const router = express.Router();

router.get('/users/status', getUserStatus);
router.post('/users/register', registerLocalUser);
router.post('/users/login', loginUser);
router.post('/users/logout', authenticateUser, logoutUser);
router.get('/users/profile', authenticateUser, getUserProfile);

export default router;

