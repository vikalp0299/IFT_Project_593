import blockChainFunctionHandler from "./blockChainFunctionHandler.js";
import { getCurrentUser } from "../../middleware/auth.js";
import { Organization, ChaincodeVersionTracker } from "../../db.js";

const controller = new blockChainFunctionHandler();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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

/**
 * Increment version number
 * Examples: "1.0" => "1.1", "1.9" => "2.0", "4.9" => "5.0"
 */
function incrementVersion(currentVersion) {
    const parts = currentVersion.split('.');
    let major = parseInt(parts[0]);
    let minor = parseInt(parts[1]);
    
    minor += 1;
    
    if (minor >= 10) {
        major += 1;
        minor = 0;
    }
    
    return `${major}.${minor}`;
}

/**
 * Get or create version tracker for organization
 */
async function getOrgCreateVersionTracker(organizationName) {
    let tracker = await ChaincodeVersionTracker.findOne({ organizationName });
    
    if (!tracker) {
        tracker = new ChaincodeVersionTracker({
            organizationName,
            version: '1.0',
            sequence: 1
        });
        await tracker.save();
    }
    
    return tracker;
}

/**
 * Update version tracker - increment sequence and version
 */
async function updateVersionTracker(organizationName) {
    const tracker = await getOrgCreateVersionTracker(organizationName);
    
    // Increment sequence
    tracker.sequence += 1;
    
    // Increment version
    tracker.version = incrementVersion(tracker.version);
    
    await tracker.save();
    
    return {
        sequence: tracker.sequence,
        version: tracker.version
    };
}

export async function createBlockchain(req, res) {
    try {
        const currentUser = await getCurrentUser(req);
        console.log("Current User:", currentUser);

        const { peerCount, channelName } = req.body;
        console.log("Request body:", req.body);
        console.log("Peer count:", peerCount);
        console.log("Channel name:", channelName);
        
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

        // Set up Server-Sent Events with proper headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders();

        // Helper function to send SSE messages with error handling
        const sendUpdate = (status, message, progress, data = {}) => {
            try {
                if (!res.writableEnded) {
                    const update = {
                        status,
                        message,
                        progress,
                        timestamp: new Date().toISOString(),
                        ...data
                    };
                    res.write(`data: ${JSON.stringify(update)}\n\n`);
                }
            } catch (error) {
                console.error('Error sending SSE update:', error);
            }
        };

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
            if (!res.writableEnded) {
                res.write(': heartbeat\n\n');
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        // Clean up on client disconnect
        req.on('close', () => {
            clearInterval(heartbeatInterval);
            console.log('Client disconnected from SSE stream');
        });

        // Start the blockchain creation process
        try {
            sendUpdate('started', 'Blockchain creation initiated', 0, {
                organizationName: organization.name,
                blockchainOrgName,
                ordererOrgName,
                peerCount,
                ordererCount: 4
            });

            // Get initial version tracker
            const initialTracker = await getOrgCreateVersionTracker(organization.name);

            // Step 1: Start chain
            sendUpdate('in_progress', 'Starting blockchain network...', 1*100/22);
            await controller.startChain();
            await sleep(14000);
            sendUpdate('in_progress', 'Blockchain network started successfully', 2*100/22);

            // Step 2: Create peers
            sendUpdate('in_progress', `Creating ${peerCount} peer node(s) for ${blockchainOrgName}...`, 3*100/22);
            await controller.createPeer(blockchainOrgName, peerCount, 'admin', 'adminpw');
            await sleep(14000);
            sendUpdate('in_progress', 'Peer nodes created successfully', 4*100/22);

            // Step 3: Create orderers
            sendUpdate('in_progress', 'Creating orderer nodes...', 5*100/22);
            await controller.createOrderer(ordererOrgName, 4, 'admin', 'adminpw');
            await sleep(14000);
            sendUpdate('in_progress', 'Orderer nodes created successfully', 6*100/22);

            // Step 4: Create channel
            sendUpdate('in_progress', 'Creating channel...', 7*100/22);
            await controller.create_Channel(channelName, [blockchainOrgName], ordererOrgName);
            await sleep(14000);
            sendUpdate('in_progress', 'Channel created successfully', 8*100/22);
            
            // Step 5: Join peers to channel
            sendUpdate('in_progress', 'Joining peers to channel...', 9*100/22);
            await controller.create_follower_Channel(channelName, "demo", [blockchainOrgName], ordererOrgName, 1);
            await sleep(14000);
            sendUpdate('in_progress', 'Peers joined to channel successfully', 10*100/22);

            // Step 6: Creating identities and network config
            sendUpdate('in_progress', 'Setting up identities and network configuration...', 11*100/22);
            await controller.create_identities_and_network_config(channelName, [blockchainOrgName], ordererOrgName);
            await sleep(14000);
            sendUpdate('in_progress', 'Identities and network configuration set up successfully', 14*100/22);

            // Step 7: Creating metadata
            sendUpdate('in_progress', 'Creating metadata...', 12*100/22);
            await controller.meta_data_upload();
            await sleep(14000);
            sendUpdate('in_progress', 'Metadata created successfully', 13*100/22);

            // Step 8: Install chaincode metadata
            sendUpdate('in_progress', 'Installing chaincode for metadata...', 14*100/22);
            await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode for metadata installed successfully', 15*100/22);

            // Step 9: Deploy external chaincode
            sendUpdate('in_progress', 'Deploying external chaincode...', 16*100/22);
            await controller.deploy_external_chaincode('asset','vparash0299/file-transfer-ccaas','../generated_resources/network-config.yaml');
            await sleep(30000); // 30 seconds delay for chaincode deployment
            sendUpdate('in_progress', 'External chaincode deployed successfully', 17*100/22);

            // Step 10: Approve chaincode
            sendUpdate('in_progress', 'Approving chaincode...', 18*100/23);
            await controller.approve_chaincode('asset', initialTracker.version, initialTracker.sequence, channelName, [blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode approved successfully', 19*100/23);

            // Step 11: Commit chaincode (MISSING STEP!)
            sendUpdate('in_progress', 'Committing chaincode...', 20*100/23);
            await controller.commit_chaincode('asset', initialTracker.version, initialTracker.sequence, channelName, [blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode committed successfully', 21*100/23);

            // Step 12: Update database
            sendUpdate('in_progress', 'Updating organization settings...', 22*100/23);
            organization.hasBlockchain = true;
            organization.blockchainOrgName = blockchainOrgName;
            if (!organization.organizationChannels.includes(channelName)) {
                organization.organizationChannels.push(channelName);
            }
            await organization.save();
            await sleep(14000);

            // Step 13: Update version tracker (FIRST LOCATION)
            sendUpdate('in_progress', 'Updating chaincode version tracker...', 22*100/23);
            const updatedVersion = await updateVersionTracker(organization.name);
            console.log(`Version tracker updated: sequence ${updatedVersion.sequence}, version ${updatedVersion.version}`);
            
            // Clear heartbeat before completing
            clearInterval(heartbeatInterval);
            
            // Final success message
            sendUpdate('completed', 'Blockchain setup completed successfully!', 100, {
                organizationName: organization.name,
                blockchainOrgName,
                ordererOrgName,
                peerCount,
                ordererCount: 4,
                chaincodeSequence: updatedVersion.sequence,
                chaincodeVersion: updatedVersion.version
            });

            console.log("Blockchain setup completed successfully for", organization.name);
            
            // Give time for final message to be sent before closing
            setTimeout(() => {
                if (!res.writableEnded) {
                    res.end();
                }
            }, 1000);

        } catch (asyncError) {
            clearInterval(heartbeatInterval);
            console.error("Error in blockchain creation:", asyncError);
            console.error("Error stack:", asyncError.stack);
            
            sendUpdate('failed', `Blockchain creation failed: ${asyncError.message}`, -1, {
                error: asyncError.message
            });
            
            setTimeout(() => {
                if (!res.writableEnded) {
                    res.end();
                }
            }, 1000);
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

// Create a joinBlockchain function (SECOND LOCATION for version update)
export async function joinBlockchain(req, res) {
    try {
        const currentUser = await getCurrentUser(req);
        
        if (!currentUser || currentUser.role !== 'Admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admins only.' 
            });
        }

        const { channelName, mainChannelName, creatorOrgName, peerCount} = req.body;

        // Fetch organization
        const organization = await Organization.findById(currentUser.organization);
        const creatororg = await Organization.findOne({ name: creatorOrgName });
        
        if (!organization){
            return res.status(404).json({ 
                success: false,
                message: 'Organization not found'
            });
        }

        if (!creatororg || !creatororg.hasBlockchain) {
            return res.status(400).json({ 
                success: false,
                message: 'Organization must have blockchain setup first'
            });
        }
        

        const blockchainOrgName = generateBlockchainOrgName(organization.name);
        const creatorBlockchainOrgName = creatororg.blockchainOrgName;
        const ordererOrgName = generateBlockchainOrgName('OrdererOrg');

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendUpdate = (status, message, progress, data = {}) => {
            const update = { status, message, progress, timestamp: new Date().toISOString(), ...data };
            res.write(`data: ${JSON.stringify(update)}\n\n`);
        };

        try {
            sendUpdate('started', 'Joining blockchain network', 0);

            // Get version tracker from creator organization (not current org since we're just joining)
            const currentTracker = await getOrgCreateVersionTracker(creatororg.name);
            // Create peers 
            sendUpdate('in_progress', 'Creating peer nodes...', 1*100/14);
            await controller.createPeer(blockchainOrgName, peerCount, 'admin', 'adminpw');
            await sleep(14000);
            sendUpdate('in_progress', 'Peer nodes created successfully', 2*100/14);

            // Create channels
            sendUpdate('in_progress', 'Creating channels...', 3*100/14);
            await controller.create_Channel(mainChannelName, [creatorBlockchainOrgName, blockchainOrgName], ordererOrgName);
            await sleep(14000);
            sendUpdate('in_progress', 'Channels created successfully', 4*100/14);

            // Join channel operations
            sendUpdate('in_progress', 'Joining channel...', 5*100/14);
            await controller.create_follower_Channel(channelName, mainChannelName, [creatorBlockchainOrgName, blockchainOrgName], ordererOrgName, 1);
            await sleep(14000);
            sendUpdate('in_progress', 'Channel joined successfully', 6*100/14);

            // Step 6: Creating identities and network config
            sendUpdate('in_progress', 'Setting up identities and network configuration...', 7*100/14);
            await controller.create_identities_and_network_config(mainChannelName, [creatorBlockchainOrgName, blockchainOrgName], ordererOrgName);
            await sleep(14000);
            sendUpdate('in_progress', 'Identities and network configuration set up successfully', 8*100/14);

            // Step 8: Install chaincode metadata
            sendUpdate('in_progress', 'Installing chaincode for metadata...', 8*100/14);
            await controller.install_chaincode_metadata('asset_1.0','../generated_resources/chaincode.tgz', [ blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode for metadata installed successfully', 9*100/14);

            // Approve chaincode with current version
            sendUpdate('in_progress', 'Approving chaincode...', 9*100/14);
            console.log("Initial tracker for commit:", currentTracker);
            await controller.approve_chaincode('asset', currentTracker.version, currentTracker.sequence, mainChannelName, [creatorBlockchainOrgName, blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode approved successfully', 10 *100/14);

             // Step 11: Commit chaincode (MISSING STEP!)
            sendUpdate('in_progress', 'Committing chaincode...', 11*100/14);

            await controller.commit_chaincode('asset', currentTracker.version, currentTracker.sequence, mainChannelName, [creatorBlockchainOrgName, blockchainOrgName], '../generated_resources/network-config.yaml');
            await sleep(14000);
            sendUpdate('in_progress', 'Chaincode committed successfully', 12 *100/14);

            // Update version tracker (SECOND LOCATION)
            sendUpdate('in_progress', 'Updating chaincode version tracker...', 13*100/14 );
            const updatedVersion = await updateVersionTracker(creatororg.name);
            console.log(`Version tracker updated: sequence ${updatedVersion.sequence}, version ${updatedVersion.version}`);

            sendUpdate('completed', 'Successfully joined blockchain network!', 14 * 100/14, {
                organizationName: organization.name,
                blockchainOrgName,
                channelName,
                chaincodeSequence: updatedVersion.sequence,
                chaincodeVersion: updatedVersion.version
            });

            res.end();

        } catch (asyncError) {
            console.error("Error joining blockchain:", asyncError);
            sendUpdate('failed', `Failed to join blockchain: ${asyncError.message}`, -1, {
                error: asyncError.message
            });
            res.end();
        }

    } catch (error) {
        console.error("Error in joinBlockchain:", error);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}

export async function getBlockchainOrganizations(req, res) {
    try {
        // Find all organizations that have blockchain
        const organizations = await Organization.find({ hasBlockchain: true })
            .select('name organizationChannels')
            .lean();

        // Transform the data to match the requested output format
        const result = organizations.map(org => ({
            orgName: org.name,
            organizationChannelName: org.organizationChannels || []
        }));

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Error fetching blockchain organizations:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}