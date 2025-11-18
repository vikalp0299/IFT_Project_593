import express from 'express';
import { createBlockchain } from '../blockchain/controllers/blockChainController.js';
const blockchainRouter = express.Router();

blockchainRouter.post('/start',  createBlockchain);   

export default blockchainRouter;