import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();
// controller.startChain();
// controller.createPeer('vik', 2, 'admin', 'adminpw');
// controller.createOrderer('ord', 4, 'admin', 'adminpw');
// controller.create_Channel('demo', ['org', 'vik'], 'ord');
// controller.create_follower_Channel('demo', 'demo', ['org', 'vik'], 'ord', 1);
// controller.create_identities_and_network_config('demo', ['org', 'vik'], 'ord');
// controller.meta_data_upload();
// controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ 'vik'], '../generated_resources/network-config.yaml');
// controller.deploy_external_chaincode('asset','vparash0299/file-transfer-ccaas','../generated_resources/network-config.yaml');
// controller.approve_chaincode('asset','1.1',2,'demo',['org','vik'],'../generated_resources/network-config.yaml');
 controller.commit_chaincode('asset','1.1',2,'demo',['org','vik'],'../generated_resources/network-config.yaml');

// import { createBlockchain } from './blockChainController.js';
// createBlockchain();