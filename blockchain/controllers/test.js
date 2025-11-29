import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();

// CREATE BLOCKCHAIN (First organization - vik)
// await controller.startChain();
// await controller.createPeer('vik', 2, 'admin', 'adminpw');
// await controller.createOrderer('ord', 4, 'admin', 'adminpw');
// await controller.create_Channel('vikalp', ['vik'], 'ord');
// await controller.create_follower_Channel('vikalp', 'vikalp', ['vik'], 'ord', 1);
// await controller.create_identities_and_network_config('vikalp', ['vik'], 'ord');
// await controller.meta_data_upload();
// await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', ['vik'], '../generated_resources/network-config.yaml');
// await controller.deploy_external_chaincode('asset','vparash0299/chaincode-debug:1.1.0','../generated_resources/network-config.yaml');
// await controller.approve_chaincode('asset','1.0',1,'vikalp',['vik'],'../generated_resources/network-config.yaml');
// await controller.commit_chaincode('asset','1.0',1,'vikalp',['vik'],'../generated_resources/network-config.yaml');


// JOIN BLOCKCHAIN (Second organization - sun)
// await controller.createPeer('sun', 2, 'admin', 'adminpw');
// await controller.create_Channel('vikalp', ['vik', 'sun'], 'ord');
// await controller.create_follower_Channel('vikalp', 'vikalp', ['vik', 'sun'], 'ord', 1);
// await controller.create_identities_and_network_config('vikalp', ['vik', 'sun'], 'ord');
// await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', ['sun'], '../generated_resources/network-config.yaml');
// await controller.approve_chaincode('asset','1.1',2,'vikalp',['vik', 'sun'],'../generated_resources/network-config.yaml');
// await controller.commit_chaincode('asset','1.1',2,'vikalp',['vik', 'sun'],'../generated_resources/network-config.yaml');


// JOIN BLOCKCHAIN (Third organization - atu)
// await controller.createPeer('atu', 2, 'admin', 'adminpw');
// await controller.create_Channel('vikalp', ['vik', 'sun', 'atu'], 'ord');
// await controller.create_follower_Channel('vikalp', 'vikalp', ['vik', 'sun', 'atu'], 'ord', 1);
// await controller.create_identities_and_network_config('vikalp', ['vik', 'sun', 'atu'], 'ord');
// await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', ['atu'], '../generated_resources/network-config.yaml');
// await controller.approve_chaincode('asset','1.2',3,'vikalp',['vik', 'sun', 'atu'],'../generated_resources/network-config.yaml');
// await controller.commit_chaincode('asset','1.2',3,'vikalp',['vik', 'sun', 'atu'],'../generated_resources/network-config.yaml');

