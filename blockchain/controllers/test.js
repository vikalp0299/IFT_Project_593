import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();
// CREATE BLOCKCHAIN
//   controller.startChain();
//  controller.createPeer('org', 2, 'admin', 'adminpw');
//  controller.createOrderer('ord', 4, 'admin', 'adminpw');
//  controller.create_Channel('demo', ['org'], 'ord');
//  controller.create_follower_Channel('demo', 'demo', ['org'], 'ord', 1);
//  controller.create_identities_and_network_config('demo', [ 'org'], 'ord');
//  controller.meta_data_upload();
//  controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ 'org'], '../generated_resources/network-config.yaml');
//  controller.deploy_external_chaincode('asset','vparash0299/chaincode-debug:1.0.0','../generated_resources/network-config.yaml');
//  controller.approve_chaincode('asset','1.0',1,'demo',['org'],'../generated_resources/network-config.yaml');
//  controller.commit_chaincode('asset','1.0',1,'demo',['org'],'../generated_resources/network-config.yaml');


// JOIN BLOCKCHAIN
//  controller.createPeer('org', 2, 'admin', 'adminpw');
//  controller.create_Channel('demo', ['vik','org'], 'ord');
//  controller.create_follower_Channel('demo', 'demo', ['vik','org'], 'ord', 1);
//  controller.create_identities_and_network_config('demo', [ 'vik','org'], 'ord');
//  controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ 'org'], '../generated_resources/network-config.yaml');
//  controller.approve_chaincode('asset','1.1',2,'demo',['vik','org'],'../generated_resources/network-config.yaml');
//  controller.commit_chaincode('asset','1.1',2,'demo',['vik','org'],'../generated_resources/network-config.yaml');
