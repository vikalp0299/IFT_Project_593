import express from 'express';
import { loginFunction, logoutFunction, registerFunction } from '../controller/loginController.js';
const loginRouter = express.Router();  

loginRouter.post('/register',registerFunction);
loginRouter.post('/login', loginFunction);
loginRouter.post('/logout', logoutFunction);


export default loginRouter;