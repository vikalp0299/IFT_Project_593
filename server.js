//Imports
import express from 'express';
import multer from 'multer';
import {fileURLToPath} from 'url';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import router from './router/fileRouter.js';
let loginName;
let loginPass;
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
//Static webpage for now
app.use(express.static(path.join(__dirpath,'public')));

// //Multer --> Multi-part file upload
// const storage = multer.diskStorage({
//     destination: (req,file,cb) => cb(null, path.join(__dirpath,'temp_file_storage')), //cb --> callback function
//     filename: (req,file,cb) => cb(null,file.originalname)
// });

// const upload = multer({storage: storage});
// //Getting a file and data
// app.post('/api/upload',upload.single('file'),(req,res) => {
//     res.end('File uploaded successfully');
// });

// import { initUpload } from './controller/fileController.js';
// app.post('/api/uploads/init',initUpload);



//Basic login
app.post('/login',(req,res) => {
    console.log(req.query);
    loginName = req.query.username;
    loginPass = req.query.password;
    console.log(loginName,loginPass);
    res.end('Login Successful');
});


//Start the listener
app.listen(PORT,() => console.log(`The server started at ${PORT}`));