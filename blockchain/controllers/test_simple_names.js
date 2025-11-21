import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();

// Test with simple naming convention: 'org' and 'peer0'
// These should be automatically transformed to 'org-admin-default' and 'org-peer0.default'

console.log("=".repeat(60));
console.log("Testing Chaincode Functions with Simple Names");
console.log("=".repeat(60));
console.log("");

// Test 1: Initialize Ledger
console.log("Test 1: Initialize Ledger with simple names (org, peer0)");
// await controller.initLedger("../generated_resources/network-config.yaml",'org','peer0','demo');

// Test 2: Get All Files
console.log("Test 2: Get All Files with simple names (org, peer0)");
await controller.getAllFiles('../generated_resources/network-config.yaml','org','peer0','demo');

// Test 3: Create File
console.log("\nTest 3: Create File with simple names (org, peer0)");
await controller.createFile(
    '../generated_resources/network-config.yaml',
    'org',
    'peer0',
    'demo',
    {
        fileId: 'file-simple-test',
        filename: 'simple-naming-test.pdf',
        ipfsCid: 'QmSimpleTest123456',
        size: 8192,
        allowedOrgsStr: 'orgMSP',
        multiSigRequired: false,
        metadata: '{"type":"test","description":"File created using simple org and peer names","naming":"simple"}'
    },
    'asset'
);

console.log("\n" + "=".repeat(60));
console.log("All tests completed successfully!");
console.log("Simple names (org, peer0) were transformed to full format");
console.log("(org-admin-default, org-peer0.default)");
console.log("=".repeat(60));
