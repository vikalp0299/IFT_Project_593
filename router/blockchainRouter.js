import express from 'express';
import { createBlockchain, joinBlockchain } from '../blockchain/controllers/blockChainController.js';
import { join } from 'path';
const blockchainRouter = express.Router();

blockchainRouter.post('/create',  createBlockchain);   
blockchainRouter.post('/join', joinBlockchain);

export default blockchainRouter;