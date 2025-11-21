import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();
// CREATE BLOCKCHAIN
//await controller.startChain();
//await controller.createPeer('org', 2, 'admin', 'adminpw');
//await controller.createOrderer('ord', 4, 'admin', 'adminpw');
//await controller.create_Channel('demo', ['org'], 'ord');
//await controller.create_follower_Channel('demo', 'demo', ['org'], 'ord');
//await controller.create_identities_and_network_config('demo', 'org', 'ord');
//await controller.meta_data_upload();
//await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ 'org'], '../generated_resources/network-config.yaml');
//await controller.deploy_external_chaincode('asset','vparash0299/chaincode-debug:1.1.0','../generated_resources/network-config.yaml');
//await controller.approve_chaincode('asset','1.0',1,'demo',['org'],'../generated_resources/network-config.yaml');
//await controller.commit_chaincode('asset','1.0',1,'demo',['org'],'../generated_resources/network-config.yaml');


// JOIN BLOCKCHAIN
//  controller.createPeer('org', 2, 'admin', 'adminpw');
//  controller.create_Channel('demo', ['vik','org'], 'ord');
//  controller.create_follower_Channel('demo', 'demo', ['vik','org'], 'ord', 1);
//  controller.create_identities_and_network_config('demo', [ 'vik','org'], 'ord');
//  controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ 'org'], '../generated_resources/network-config.yaml');
//  controller.approve_chaincode('asset','1.1',2,'demo',['vik','org'],'../generated_resources/network-config.yaml');
//  controller.commit_chaincode('asset','1.1',2,'demo',['vik','org'],'../generated_resources/network-config.yaml');


// TEST FUNCTIONS

//await controller.initLedger("../generated_resources/network-config.yaml",'org','peer0','demo');
//await controller.getAllFiles('../generated_resources/network-config.yaml','org','peer0','demo');
await controller.createFile(
    '../generated_resources/network-config.yaml',
    'org',
    'peer0',
    'demo',
    {
        fileId: 'file-test-002',
        filename: 'another-test.pdf',
        ipfsCid: 'QmTestCid987654321',
        size: 4096,
        allowedOrgsStr: 'orgMSP',
        multiSigRequired: false,
        metadata: '{"type":"test","description":"Another test with simple names"}'
    },
    'asset'
);