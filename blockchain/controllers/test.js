import blockchainController from './blockChainFunctionHandler.js';

const controller = new blockchainController();
// controller.startChain();
// controller.createPeer('org2', 2, 'admin', 'adminpw');
// controller.createOrderer('ord', 4, 'admin', 'adminpw');
// controller.create_Channel('demo', ['org1', 'org2'], 'ord');
// controller.create_follower_Channel('demo', 'demo', ['org1', 'org2'], 'ord', 1);
// controller.create_identities_and_network_config('demo', ['org1', 'org2'], 'ord');
// controller.meta_data_upload();
// controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', ['org1','org2'], '../generated_resources/network-config.yaml');
// controller.deploy_external_chaincode('asset','vparash0299/asset-transfer-basic-ts','../generated_resources/network-config.yaml');
// controller.approve_chaincode('asset','1.0',1,'demo',['org1','org2'],'../generated_resources/network-config.yaml');
// controller.commit_chaincode('asset','1.0',1,'demo',['org1','org2'],'../generated_resources/network-config.yaml');

import { createBlockchain } from './blockChainController.js';
createBlockchain();