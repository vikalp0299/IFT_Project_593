import blockChainFunctionHandler from "./blockChainFunctionHandler.js";
import { getCurrentUser } from "../../middleware/auth.js";
import { Organization } from "../../db.js";

const controller = new blockChainFunctionHandler();

/**
 * Generate blockchain org name from organization name
 * Examples: "Vikalp" => "vik", "Vikalp org 123134" => "vik123134"
 */
function generateBlockchainOrgName(orgName) {
    // Remove special characters and extra spaces
    const cleaned = orgName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    
    // Split into words
    const words = cleaned.split(/\s+/);
    
    // Get first 3 letters of first word (lowercase)
    let prefix = words[0].substring(0, 3).toLowerCase();
    
    // Extract all numbers from the entire string
    const allNumbers = cleaned.match(/\d+/g);
    
    if (allNumbers && allNumbers.length > 0) {
        // Join all numbers together
        return prefix + allNumbers.join('');
    }
    
    // If no number, just return the prefix
    return prefix;
}

export async function createBlockchain(req, res) {
    try {
        const currentUser = await getCurrentUser(req);
        console.log("Current User:", currentUser);

        const { peerCount } = req.body;
        console.log("Request body:", req.body);
        console.log("Peer count:", peerCount);
        
        if (!currentUser || currentUser.role !== 'Admin') {
            console.log("Access denied - not admin");
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admins only.' 
            });
        }

        // Validate required fields
        if (!peerCount) {
            console.log("Validation failed - peerCount missing");
            return res.status(400).json({
                success: false,
                message: 'peerCount is required'
            });
        }

        // Fetch organization from database
        console.log("Fetching organization:", currentUser.organization);
        const organization = await Organization.findById(currentUser.organization);
        
        if (!organization) {
            console.log("Organization not found");
            return res.status(404).json({ 
                success: false,
                message: 'Organization not found' 
            });
        }

        console.log("Organization found:", organization);

        // Check if blockchain already exists for this organization
        if (organization.hasBlockchain) {
            console.log("Blockchain already exists");
            return res.status(400).json({ 
                success: false,
                message: 'Blockchain already exists for this organization',
                blockchainOrgName: organization.blockchainOrgName
            });
        }

        // Generate blockchain org name
        const blockchainOrgName = generateBlockchainOrgName(organization.name);
        const ordererOrgName = generateBlockchainOrgName('OrdererOrg');
        
        console.log("Generated blockchain org name:", blockchainOrgName);

        // Set up Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Helper function to send SSE messages
        const sendUpdate = (status, message, progress, data = {}) => {
            const update = {
                status,
                message,
                progress,
                timestamp: new Date().toISOString(),
                ...data
            };
            res.write(`data: ${JSON.stringify(update)}\n\n`);
        };

        // Start the blockchain creation process
        try {
            sendUpdate('started', 'Blockchain creation initiated', 0, {
                organizationName: organization.name,
                blockchainOrgName,
                ordererOrgName,
                peerCount,
                ordererCount: 4
            });

            // Step 1: Start chain
            sendUpdate('in_progress', 'Starting blockchain network...', 10);
            await controller.startChain();
            sendUpdate('in_progress', 'Blockchain network started successfully', 25);

            // Step 2: Create peers
            sendUpdate('in_progress', `Creating ${peerCount} peer node(s) for ${blockchainOrgName}...`, 30);
            await controller.createPeer(blockchainOrgName, peerCount, currentUser.username, currentUser.password);
            sendUpdate('in_progress', 'Peer nodes created successfully', 60);

            // Step 3: Create orderers
            sendUpdate('in_progress', 'Creating orderer nodes...', 65);
            await controller.createOrderer(ordererOrgName, 4, currentUser.username, currentUser.password);
            sendUpdate('in_progress', 'Orderer nodes created successfully', 90);

            // Step 4: Update database
            sendUpdate('in_progress', 'Updating organization settings...', 95);
            organization.hasBlockchain = true;
            organization.blockchainOrgName = blockchainOrgName;
            await organization.save();
            
            // Final success message
            sendUpdate('completed', 'Blockchain setup completed successfully!', 100, {
                organizationName: organization.name,
                blockchainOrgName,
                ordererOrgName,
                peerCount,
                ordererCount: 4
            });

            console.log("Blockchain setup completed successfully for", organization.name);
            res.end();

        } catch (asyncError) {
            console.error("Error in blockchain creation:", asyncError);
            console.error("Error stack:", asyncError.stack);
            
            sendUpdate('failed', `Blockchain creation failed: ${asyncError.message}`, -1, {
                error: asyncError.message
            });
            res.end();
        }
        
    } catch (error) {
        console.error("Error in createBlockchain:", error);
        console.error("Error stack:", error.stack);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}