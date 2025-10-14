//Imports
import express from 'express';
import multer from 'multer';
import {fileURLToPath} from 'url';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import router from './router/fileRouter.js';
import loginRouter from './router/loginRouter.js';
import { connectDB } from './db.js';
import dotenv from 'dotenv';

dotenv.config();
    
//Database connection
connectDB();

//Get Port from .env
const PORT =process.env.PORT || 8000;

//Initializing Requirements
const app = express();
const __filepath = fileURLToPath(import.meta.url);
const __dirpath = path.dirname(__filepath);

console.log(__dirpath);

//middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/api',router);
app.use(loginRouter);

//Static webpage for now
app.use(express.static(path.join(__dirpath,'public')));

//Start the listener
app.listen(PORT,() => console.log(`The server started at ${PORT}`));