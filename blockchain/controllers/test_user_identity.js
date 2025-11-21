import blockChainFunctionHandler from './blockChainFunctionHandler.js';

const controller = new blockChainFunctionHandler();

console.log("=".repeat(60));
console.log("Testing User Identity Creation");
console.log("=".repeat(60));
console.log("");

// Test: Create blockchain identity for a new user
const testUsername = "testuser";
const testOrgName = "org";
const testPassword = "testuser123";

console.log(`Creating blockchain identity for user: ${testUsername}`);
console.log(`Organization: ${testOrgName}`);
console.log(`Password: ${testPassword}`);
console.log("");

try {
    const result = await controller.createUserIdentity(testUsername, testOrgName, testPassword);
    
    console.log("\n" + "=".repeat(60));
    console.log("✓ User Identity Created Successfully!");
    console.log("=".repeat(60));
    console.log("Result:", JSON.stringify(result, null, 2));
    console.log("");
    console.log("Identity Details:");
    console.log(`  - Username: ${result.username}`);
    console.log(`  - Organization: ${result.orgName}`);
    console.log(`  - Identity Name: ${result.identityName}`);
    console.log(`  - MSP ID: ${result.mspId}`);
    console.log("=".repeat(60));
    
} catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("✗ User Identity Creation Failed");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    console.error("=".repeat(60));
    process.exit(1);
}
