import express from 'express';
import { createBlockchain } from '../blockchain/controllers/blockChainController.js';
const blockchainRouter = express.Router();

blockchainRouter.post('/create',  createBlockchain);   

export default blockchainRouter;