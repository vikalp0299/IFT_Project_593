//Imports
import express from 'express';
import multer from 'multer';
import { pathToFileURL} from 'url';
import path from 'path';
//Get Port from .env
const PORT =process.env.PORT || 8000;

//Initializing Requirements
const app = express();
const __filepath = pathToFileURL(import.meta.url);
const __dirpath = path.dirname(__filepath);

//middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//Static webpage for now
app.use(express.static(path.join(__dirpath,'public')));

//Multer --> Multi-part file upload
const storage = multer.diskStorage({
    destination: (req,file,cb) => cb(null, file.originalname), //?? what is this
    filename: (req,file,cb) => cb(null,file.originalname)
});

const upload = multer({storage: storage});
//Getting a file and data
app.post('/upload',upload.single(file),(req,res) => {
    res.end('File uploaded successfully');
});

//Start the listener
app.listen(PORT,() => console.log(`The server started at ${PORT}`));