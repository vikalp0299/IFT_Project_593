import express from 'express';
import { createBlockchain, joinBlockchain, getBlockchainOrganizations } from '../blockchain/controllers/blockChainController.js';
const blockchainRouter = express.Router();

blockchainRouter.post('/create',  createBlockchain);   
blockchainRouter.post('/join', joinBlockchain);
blockchainRouter.get('/organizations', getBlockchainOrganizations);

export default blockchainRouter;