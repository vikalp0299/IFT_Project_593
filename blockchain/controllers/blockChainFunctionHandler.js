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
}

