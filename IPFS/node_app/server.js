// server.js
import express from 'express';
import multer from 'multer';
import { create } from 'ipfs-http-client';
import axios from 'axios';
import fs from 'fs';
import cors from 'cors';

// --- CONFIGURATION ---
const app = express();
app.use(cors());
const port = 3000;
const upload = multer({ dest: 'uploads/' });

// --- CONNECT TO YOUR TWO NODES ---
const localIpfs = create({ host: '127.0.0.1', port: '5001', protocol: 'http' });
const remoteIpfs = create({ host: '192.168.1.209', port: '5001', protocol: 'http' }); // Or your remote IP


// --- THE UPLOAD & PIN ENDPOINT ---
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    try {
        console.log("Adding file to local IPFS node...");
        const fileContent = fs.readFileSync(req.file.path);
        const { cid } = await localIpfs.add(fileContent);
        const fileCID = cid.toString();
        console.log(`File added to local node with CID: ${fileCID}`);

        // --- THIS IS THE FIX ---
        console.log("Connecting nodes as peers...");
        
        // 1. Get the local node's Peer ID safely using axios to bypass the bug
        const idResponse = await axios.post('http://127.0.0.1:5001/api/v0/id');
        const localNodePeerId = idResponse.data.ID;

        // 2. Manually construct the connectable address using your known LAN IP
        const localNodeLanIp = '192.168.1.209'; // IMPORTANT: Use your local computer's LAN IP here
        const localNodeConnectAddress = `/ip4/${localNodeLanIp}/tcp/4001/p2p/${localNodePeerId}`;
        
        // 3. Tell the remote node to connect to the local node
        await remoteIpfs.swarm.connect(localNodeConnectAddress);
        console.log("Nodes are now connected.");
        // --- END OF FIX ---

        console.log(`Pinning CID ${fileCID} to remote node for backup...`);
        await remoteIpfs.pin.add(fileCID);
        console.log('Successfully pinned to remote node.');

        console.log(`Copying ${fileCID} to local MFS...`);
        await localIpfs.files.mkdir('/uploads', { parents: true });
        await localIpfs.files.cp(`/ipfs/${fileCID}`, `/uploads/${req.file.originalname}`, { parents: true });
        console.log('Successfully copied to MFS.');

        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: 'File uploaded and pinned via P2P!',
            cid: fileCID,
            gatewayUrl: `https://ipfs.io/ipfs/${fileCID}`,
        });
    } catch (error) {
        console.error('Error during upload/pin process:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'An error occurred during the upload process.' });
    }
});


// Your delete endpoint is fine as is
app.delete('/delete/:cid', async (req, res) => {
    const { cid } = req.params;
    if (!cid) {
        return res.status(400).json({ message: 'No CID provided.' });
    }
    try {
        console.log(`Unpinning ${cid} from all your nodes...`);
        await localIpfs.pin.rm(cid);
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