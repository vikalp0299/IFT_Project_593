import express from 'express';
import { adminRegisterFunction, loginFunction, logoutFunction, registerFunction, confirmLocalAccount } from '../controller/loginController.js';
import { authenticateToken } from '../middleware/auth.js';
const loginRouter = express.Router();  

//@route POST /auth/register
//@desc Register user
//@access Public
loginRouter.post('/register',registerFunction);
//@route POST /auth/login
//@desc Login user
//@access Public
loginRouter.post('/login', loginFunction);
//@route POST /auth/logout
//@desc Logout user
//@access Private
loginRouter.post('/logout', logoutFunction);
//@route POST /auth/adminRegister
//@desc Register admin user
//@access Public    
loginRouter.post('/adminRegister', adminRegisterFunction)

loginRouter.post('/local-sync', authenticateToken, confirmLocalAccount);

export default loginRouter;