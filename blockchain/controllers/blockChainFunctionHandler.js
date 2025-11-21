import {spawn} from 'child_process';
import path from 'path';    
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class blockChainFunctionHandler {

    startChain(){
        console.log("Starting the blockchain...");
        return new Promise((resolve, reject) => {
            
            const scriptPath = path.join(__dirname, '../scripts/startup.sh');
            
            const child = spawn('bash', [scriptPath], {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });
            
            child.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            
            child.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
            
            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    resolve("Blockchain started successfully");
                } else {
                    reject(new Error(`Blockchain startup failed with code ${code}`));
                }
            });
            child.on('error', (err) => {
                reject(err);
            });
        }); 
    }

    createPeer(orgName, peerCount = 2, adminUsername, adminPassword){
        console.log(`Creating peer with count ${peerCount}...`);
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            // Handle orgName as array or string
            const orgNameStr = Array.isArray(orgName) ? orgName.join(',') : orgName;
            const args = [
                scriptPath, 
                "create-system-org", 
                "--orgName", orgNameStr,
                "--peerCount", peerCount.toString(),
                "--adminUsername", adminUsername,
                "--adminPassword", adminPassword,
                "--peerUsername", "peer",
                "--peerPassword", "peerpw"
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn ('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Peer created successfully");
                    resolve("Peer created successfully");
                } else {
                    console.error(`Peer creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Peer creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);    
            }); 

        });
        

       
    }
    createOrderer(ordererName, ordererCount = 4, adminUsername='admin', adminPassword='adminpw'){
        console.log(`Creating orderer with count ${ordererCount}...`);
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath, 
                "create-system-orderer", 
                "--orgName", ordererName,
                "--ordererCount", ordererCount.toString(),
                "--adminUsername", adminUsername,
                "--adminPassword", adminPassword,
                "--ordererUsername", "orderer",
                "--ordererPassword", "ordererpw"
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn ('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Orderer created successfully");
                    resolve("Orderer created successfully");
                } else {
                    console.error(`Orderer creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Orderer creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);    
            });

        }); 
    }

    create_Channel(channelName, orgName, ordererOrgName){
        console.log(`Creating channel ${channelName} for org ${orgName}...`);   
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            // Handle orgName as array or string
            const orgNameStr = Array.isArray(orgName) ? orgName.join(',') : orgName;
            const args = [
                scriptPath, 
                "create-channels",
                "--channelName", channelName,
                "--orgName", orgNameStr,
                "--ordererOrgName", ordererOrgName
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn ('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Channel created successfully");
                    resolve("Channel created successfully");
                } else {
                    console.error(`Channel creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Channel creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });

        });
    }

    create_follower_Channel(channelName,mainChannelName, orgNames, ordererOrgName, ordererNodeNumber=1){
        console.log(`Creating follower channel ${channelName} for orgs ${orgNames}...`);
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const orgNamesStr = Array.isArray(orgNames) ? orgNames.join(',') : orgNames;
            const args = [
                scriptPath,
                "create-follower-channel",
                "--channelName", channelName,
                "--orgName", orgNamesStr,
                "--ordererOrgName", ordererOrgName,
                "--mainChannelName", mainChannelName,
                "--ordererNode", ordererNodeNumber.toString()
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Follower channel created successfully");
                    resolve("Follower channel created successfully");
                } else {
                    console.error(`Follower channel creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Follower channel creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    create_identities_and_network_config(channelName, orgNames, ordererOrgName){
        console.log("Creating identities and network config...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            // Handle orgNames as array or string
            const orgNamesStr = Array.isArray(orgNames) ? orgNames.join(',') : orgNames;
            const args = [
                scriptPath,
                "create-identities-and-network-config",
                "--channelName", channelName,
                "--orgName", orgNamesStr,
                "--ordererOrgName", ordererOrgName
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Identities and network config created successfully");
                    resolve("Identities and network config created successfully");
                } else {
                    console.error(`Creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    meta_data_upload(){
        console.log("Uploading metadata to blockchain...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "metadata-upload"
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Metadata uploaded successfully");
                    resolve("Metadata uploaded successfully");
                } else {
                    console.error(`Upload failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Upload failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    install_chaincode_metadata(chaincodeLabel, chaincodePath, orgNames, configPath){
        console.log("Installing chaincode for metadata...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            // Handle orgNames as array or string
            const orgNamesStr = Array.isArray(orgNames) ? orgNames.join(',') : orgNames;
            const args = [
                scriptPath,
                "install-chaincode-metadata",
                "--chaincodeLabel", chaincodeLabel,
                "--chaincodePath", chaincodePath,
                "--orgName",  orgNamesStr,
                "--configFile", configPath
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            }); 

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Chaincode installed successfully");
                    resolve("Chaincode installed successfully");
                } else {
                    console.error(`Installation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Installation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    deploy_external_chaincode(chaincodeName, imageName, configFile){
        console.log("Deploying external chaincode...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "deploy-chaincode",
                "--chaincodeName", chaincodeName,
                "--imageName", imageName,
                "--configFile", configFile
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("External chaincode deployed successfully");
                    resolve("External chaincode deployed successfully");
                } else {
                    console.error(`Deployment failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Deployment failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    approve_chaincode(chaincodeName,version,sequence,channelName,orgNames,configFile){
        // Implementation for approving chaincode
        console.log("Approving chaincode...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "approve-chaincode",
                "--chaincodeName", chaincodeName,
                "--version", version,
                "--sequence", sequence,
                "--channelName", channelName,
                "--orgName", orgNames.join(','),
                "--configFile", configFile
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Chaincode approved successfully");
                    resolve("Chaincode approved successfully");
                } else {
                    console.error(`Approval failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Approval failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    commit_chaincode(chaincodeName,version,sequence,channelName,orgNames,configFile){
        console.log("Committing chaincode...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "commit-chaincode",
                "--chaincodeName", chaincodeName,
                "--version", version,
                "--sequence", sequence,
                "--channelName", channelName,
                "--orgName", orgNames.join(','),
                "--configFile", configFile
            ];
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if(code === 0){
                    console.log("Chaincode committed successfully");
                    resolve("Chaincode committed successfully");
                } else {
                    console.error(`Commit failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Commit failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        }); 
    }

    initLedger(configFile, orgName, peerName, channelName, chaincodeName = 'asset') {
        console.log("Initializing ledger...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "init-ledger",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("Ledger initialized successfully");
                    resolve({
                        success: true,
                        message: "Ledger initialized successfully",
                        output: stdoutData
                    });
                } else {
                    console.error(`Ledger initialization failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Ledger initialization failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    getAllFiles(configFile, orgName, peerName, channelName, chaincodeName = 'asset', args = '') {
        console.log("Retrieving all files from ledger...");
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const scriptArgs = [
                scriptPath,
                "get-all-files",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName
            ];
            
            if (args) {
                scriptArgs.push("--args", args);
            }
            
            console.log('Running command:', 'bash', scriptArgs.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', scriptArgs, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("Files retrieved successfully");
                    
                    // Parse the JSON output from jq formatted result
                    let files = [];
                    try {
                        // Remove ANSI color codes
                        const cleanOutput = stdoutData.replace(/\x1B\[[0-9;]*[mGKH]/g, '');
                        
                        // Find the JSON array between the markers
                        const startMarker = 'Files retrieved:';
                        const endMarker = '✓ GetAllFiles';
                        const startIdx = cleanOutput.indexOf(startMarker);
                        const endIdx = cleanOutput.indexOf(endMarker);
                        
                        if (startIdx !== -1 && endIdx !== -1) {
                            const jsonStr = cleanOutput.substring(startIdx + startMarker.length, endIdx).trim();
                            files = JSON.parse(jsonStr);
                            console.log(`Successfully parsed ${files.length} files from blockchain`);
                        } else {
                            console.warn('Could not find JSON markers in output');
                        }
                    } catch (parseError) {
                        console.error('Failed to parse JSON output:', parseError.message);
                        console.error('Raw output:', stdoutData);
                    }
                    
                    resolve({
                        success: true,
                        message: "Files retrieved successfully",
                        files: files,
                        output: stdoutData
                    });
                } else {
                    console.error(`Get all files failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Get all files failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    createFile(configFile, orgName, peerName, channelName, fileData, chaincodeName = 'asset') {
        console.log("Creating file in ledger...");
        
        // Validate required file parameters
        const { fileId, filename, ipfsCid, size, allowedOrgsStr } = fileData;
        if (!fileId || !filename || !ipfsCid || !size || !allowedOrgsStr) {
            return Promise.reject(new Error('Missing required file parameters: fileId, filename, ipfsCid, size, allowedOrgsStr'));
        }
        
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "create-file",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName,
                "--fileId", fileData.fileId,
                "--filename", fileData.filename,
                "--ipfsCid", fileData.ipfsCid,
                "--size", fileData.size.toString(),
                "--allowedOrgsStr", fileData.allowedOrgsStr
            ];
            
            // Add optional parameters
            if (fileData.multiSigRequired !== undefined) {
                args.push("--multiSigRequired", fileData.multiSigRequired.toString());
            }
            if (fileData.createdAt) {
                args.push("--createdAt", fileData.createdAt);
            }
            if (fileData.requiredOrgsStr) {
                args.push("--requiredOrgsStr", fileData.requiredOrgsStr);
            }
            if (fileData.metadata) {
                args.push("--metadata", typeof fileData.metadata === 'string' ? fileData.metadata : JSON.stringify(fileData.metadata));
            }
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("File created successfully");
                    resolve({
                        success: true,
                        message: "File created successfully",
                        fileId: fileData.fileId,
                        output: stdoutData
                    });
                } else {
                    console.error(`File creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`File creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    createUserIdentity(username, orgName, password = 'userpw', namespace = 'default') {
        console.log(`Creating blockchain identity for user: ${username} in org: ${orgName}...`);
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "extra-user",
                "--username", username,
                "--orgName", orgName,
                "--password", password,
                "--namespace", namespace
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("User identity created successfully");
                    resolve({
                        success: true,
                        message: "Blockchain identity created successfully",
                        username: username,
                        orgName: orgName,
                        identityName: `${orgName}-${username}`,
                        mspId: `${orgName}MSP`,
                        output: stdoutData
                    });
                } else {
                    console.error(`User identity creation failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`User identity creation failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    proposeEdit(configFile, orgName, peerName, channelName, fileId, newContent, proposerMSP, chaincodeName = 'asset') {
        console.log("Proposing file edit...");
        
        if (!fileId || !newContent || !proposerMSP) {
            return Promise.reject(new Error('Missing required parameters: fileId, newContent, proposerMSP'));
        }
        
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "propose-edit",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName,
                "--fileId", fileId,
                "--newContent", newContent,
                "--proposer", proposerMSP
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("Edit proposal created successfully");
                    resolve({
                        success: true,
                        message: "Edit proposal created successfully",
                        fileId: fileId,
                        output: stdoutData
                    });
                } else {
                    console.error(`Edit proposal failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Edit proposal failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    approveEdit(configFile, orgName, peerName, channelName, fileId, proposalId, approverMSP, chaincodeName = 'asset') {
        console.log("Approving edit proposal...");
        
        if (!fileId || !proposalId || !approverMSP) {
            return Promise.reject(new Error('Missing required parameters: fileId, proposalId, approverMSP'));
        }
        
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "approve-edit",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName,
                "--fileId", fileId,
                "--proposalId", proposalId,
                "--approver", approverMSP
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("Edit proposal approved successfully");
                    resolve({
                        success: true,
                        message: "Edit proposal approved successfully",
                        fileId: fileId,
                        proposalId: proposalId,
                        output: stdoutData
                    });
                } else {
                    console.error(`Edit approval failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Edit approval failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }

    rejectEdit(configFile, orgName, peerName, channelName, fileId, proposalId, rejectorMSP, reason = 'No reason provided', chaincodeName = 'asset') {
        console.log("Rejecting edit proposal...");
        
        if (!fileId || !proposalId || !rejectorMSP) {
            return Promise.reject(new Error('Missing required parameters: fileId, proposalId, rejectorMSP'));
        }
        
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/fabricSystem.sh');
            const args = [
                scriptPath,
                "reject-edit",
                "--configFile", configFile,
                "--orgName", orgName,
                "--peerName", peerName,
                "--channelName", channelName,
                "--chaincodeName", chaincodeName,
                "--fileId", fileId,
                "--proposalId", proposalId,
                "--rejector", rejectorMSP,
                "--reason", reason
            ];
            
            console.log('Running command:', 'bash', args.join(' '));
            console.log('Working directory:', path.join(__dirname, '../scripts'));

            const child = spawn('bash', args, {
                cwd: path.join(__dirname, '../scripts'),
                env: process.env
            });

            let stderrData = '';
            let stdoutData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`stderr: ${data}`);
            });

            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                if (code === 0) {
                    console.log("Edit proposal rejected successfully");
                    resolve({
                        success: true,
                        message: "Edit proposal rejected successfully",
                        fileId: fileId,
                        proposalId: proposalId,
                        reason: reason,
                        output: stdoutData
                    });
                } else {
                    console.error(`Edit rejection failed with code ${code}`);
                    console.error('Full stderr:', stderrData);
                    console.error('Full stdout:', stdoutData);
                    reject(new Error(`Edit rejection failed with code ${code}. Error: ${stderrData}`));
                }
            });

            child.on('error', (err) => {
                console.error('Spawn error:', err);
                reject(err);
            });
        });
    }
}

