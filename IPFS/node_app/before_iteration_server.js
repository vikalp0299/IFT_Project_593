// server.js
import express from 'express';
import multer from 'multer';
import { create } from 'ipfs-http-client';
import axios from 'axios'; // We will use axios for the remote node
import fs from 'fs';
import cors from 'cors';

// --- CONFIGURATION ---
const app = express();
app.use(cors());
const port = 3000;
const upload = multer({ dest: 'uploads/' });

// --- IPFS CLIENTS ---
// We only use the library for the local node, as it works fine.
const localIpfs = create({ host: '127.0.0.1', port: '5001', protocol: 'http' });
const remote_client = create({ host: '192.168.1.209', port: '5001', protocol: 'http' }); // This does not work as expected

// adding file content

async function addFile(fileContent) {
    const { cid } = await localIpfs.add(fileContent);
    console.log('Added file with CID: ${cid}');
    return cid.toString();
}

//pinning file

async function pinFile(cid) {
    await remote_client.pin.add(cid);
    console.log('Pinned file with CID: ${cid} to local node');
}

// --- THE UPLOAD & PIN ENDPOINT ---
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    } 
        
        // const { cid } = await localIpfs.add(fileContent);
        // const fileCID = cid.toString();
        // console.log(`File added to local node with CID: ${fileCID}`);

        // // --- THIS IS THE FIX ---
        // // Instead of using the ipfs-http-client, we use axios which we know works.
        // console.log(`Pinning CID ${fileCID} to remote node via axios...`);
        // await axios.post(`${REMOTE_IPFS_API}/api/v0/pin/add?arg=${fileCID}`);
        // console.log('Successfully pinned to remote node.');
        // // --- END OF FIX ---

        // console.log(`Copying ${fileCID} to local MFS...`);
        (async () => {
            try{
                console.log("Adding file to local IPFS node...");
                const fileContent = fs.readFileSync(req.file.path);
                const cid = await addFile(fileContent);
                await localIpfs.files.mkdir('/uploads', { parents: true });
                await localIpfs.files.cp(`/ipfs/${cid}`, `/uploads/${req.file.originalname}`, { parents: true });
                console.log('Successfully copied to MFS.');
                await pinFile(cid);
                fs.unlinkSync(req.file.path);
                res.status(200).json({
                    message: 'File uploaded and pinned to your private network!',
                    cid: cid,
                    gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
                });
            } catch (error) {
                console.error('Error during MFS copy or pinning:', error);
                console.error('Error during upload/pin process:', error);
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(500).json({ message: 'An error occurred during the upload process.' });
            }
        })();
});

// --- THE DELETE ENDPOINT ---
app.delete('/delete/:cid', async (req, res) => {
    const { cid } = req.params;
    if (!cid) {
        return res.status(400).json({ message: 'No CID provided.' });
    }
    try {
        console.log(`Unpinning ${cid} from all your nodes...`);
        
        // Unpin from the local node
        await localIpfs.pin.rm(cid);
        
        // Unpin from the remote node
        await remoteIpfs.pin.rm(cid);
        
        console.log('Successfully unpinned from all nodes.');

        res.status(200).json({
            message: `Successfully unpinned ${cid} from your private network.`,
        });
    } catch (error) {
        console.error(`Error during unpin process for CID ${cid}:`, error.message);
        res.status(500).json({ message: 'An error occurred during the unpin process.' });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});