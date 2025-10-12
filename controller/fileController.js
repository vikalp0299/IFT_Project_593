import multer from 'multer';
import fss from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export function displayAllFiles (req,res){
//Dummy files list
    const headers = new Headers({
        'Content-Type': 'application/json',
        'Allow-Control-Allow-Origin': '*'   
    });   

    res.setHeaders(headers)
    const files = [{'name': 'file1.txt'},{'name': 'file2.txt'},{'name': 'file3.txt'}];
    res.send(JSON.stringify(files));


}

const UPLOAD_DIR = path.resolve('temp_uploads');
const upload = multer({ storage: multer.memoryStorage() });

export async function initUpload(req, res) {
  const { filename } = req.body;
  console.log(req.body);
  const uploadId = uuidv4();
  const dir = path.join(UPLOAD_DIR, uploadId);
  await fs.mkdir(dir, { recursive: true });
  res.json({ uploadId });
}

export const uploadChunk = [
  // Multer middleware to parse the multipart form
  upload.single('chunk'),
  // Actual request handler
  async (req, res) => {
    console.log(req.body);
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: 'Missing uploadId or chunkIndex' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing chunk file' });
    }
    console.log(req.file.buffer)
    const chunkPath = path.join(UPLOAD_DIR, uploadId, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, req.file.buffer);
    res.json({ received: Number(chunkIndex) });
  }
];

export async function completeUpload(req, res) {
  const { uploadId } = req.body;
  const dir = path.join(UPLOAD_DIR, uploadId);
  const files = await fs.readdir(dir);

  // Sort chunks by index
  files.sort((a, b) => {
    const idxA = parseInt(a.split('_')[1], 10);
    const idxB = parseInt(b.split('_')[1], 10);
    return idxA - idxB;
  });

  const finalPath = path.resolve('uploads', `${uploadId}`);
  const writeStream = fss.createWriteStream(finalPath);

  for (const fname of files) {
    const data = await fs.readFile(path.join(dir, fname));
    writeStream.write(data);
  }
  writeStream.end();

  // Cleanup temp chunks
  await fs.rm(dir, { recursive: true, force: true });

  res.json({ fileUrl: `/uploads/${uploadId}` });
}





