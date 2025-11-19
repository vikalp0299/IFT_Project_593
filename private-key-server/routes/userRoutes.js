import express from 'express';
import { registerLocalUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/users/register', registerLocalUser);

export default router;

