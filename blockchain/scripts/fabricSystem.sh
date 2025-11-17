#!/bin/bash
#Author: Vikalp Parashar
# Fabric System Setup Script - Create peer organizations and orderer organizations

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${YELLOW}Help - Fabric System Setup Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  create-system-org                      Create complete peer organization(s)"
    echo "  create-system-orderer                  Create a complete orderer organization"
    echo "  create-channels                        Create channel with creator organization"
    echo "  create-follower-channel                Join follower organizations to existing channel"
    echo "  create-identities-and-network-config   Create identities and network config for chaincode"
    echo "  metadata-upload                        Create chaincode package using connectionFile.sh"
    echo "  install-chaincode-metadata             Install chaincode metadata package on peer organizations"
    echo "  deploy-chaincode                       Deploy external chaincode container and sync"
    echo "  approve-chaincode           Approve chaincode for organizations"
    echo "  commit-chaincode            Commit chaincode to channel"
    echo
    echo -e "${YELLOW}create-system-org options:${NC}"
    echo "  --orgName           Comma-separated list of peer organizations (e.g., org1 or org1,org2,org3)"
    echo "  --peerCount         Number of peer nodes to create per organization (e.g., 2)"
    echo "  --adminUsername     Username for the admin user (e.g., admin)"
    echo "  --adminPassword     Password for the admin user (e.g., adminpw)"
    echo "  --peerUsername      Username for the peer user (e.g., peer)"
    echo "  --peerPassword      Password for the peer user (e.g., peerpw)"
    echo
    echo -e "Example:"
    echo "  $0 create-system-org --orgName org1 --peerCount 2 --adminUsername admin --adminPassword adminpw --peerUsername peer --peerPassword peerpw"
    echo "  $0 create-system-org --orgName org1,org2,org3 --peerCount 2 --adminUsername admin --adminPassword adminpw --peerUsername peer --peerPassword peerpw"
    echo
    echo -e "${YELLOW}create-system-orderer options:${NC}"
    echo "  --orgName           Name of the orderer organization (e.g., ord)"
    echo "  --ordererCount      Number of orderer nodes to create (e.g., 3)"
    echo "  --adminUsername     Username for the admin user (e.g., admin)"
    echo "  --adminPassword     Password for the admin user (e.g., adminpw)"
    echo "  --ordererUsername   Username for the orderer user (e.g., orderer)"
    echo "  --ordererPassword   Password for the orderer user (e.g., ordererpw)"
    echo
    echo -e "Example:"
    echo "  $0 create-system-orderer --orgName ord --ordererCount 3 --adminUsername admin --adminPassword adminpw --ordererUsername orderer --ordererPassword ordererpw"
    echo
    echo -e "${YELLOW}create-channels options:${NC}"
    echo "  --channelName          Name of the channel (e.g., demo)"
    echo "  --orgName              Comma-separated list of peer organizations (e.g., org1,org2,org3)"
    echo "                         Note: First org becomes the channel creator"
    echo "  --ordererOrgName       Name of the orderer organization (e.g., ord)"
    echo
    echo -e "Example:"
    echo "  $0 create-channels --channelName demo --orgName org1 --ordererOrgName ord"
    echo "  $0 create-channels --channelName demo --orgName org1,org2,org3 --ordererOrgName ord"
    echo
    echo -e "${YELLOW}create-follower-channel options:${NC}"
    echo "  --channelName          Name for the follower channel resource (e.g., demo-follower)"
    echo "  --mainChannelName      Name of the main channel to join (e.g., demo)"
    echo "  --orgName              Comma-separated list of peer organizations to join (e.g., org2,org3)"
    echo "  --ordererOrgName       Name of the orderer organization (e.g., ord)"
    echo "  --ordererNode          Optional: Orderer node number to use (default: 0, e.g., 0, 1, 2)"
    echo "  --dryRun               Optional: Only generate YAML files, do not apply to cluster"
    echo
    echo -e "Example:"
    echo "  $0 create-follower-channel --channelName demo-follower --mainChannelName demo --orgName org2,org3 --ordererOrgName ord"
    echo "  $0 create-follower-channel --channelName demo-follower --mainChannelName demo --orgName org2,org3 --ordererOrgName ord --ordererNode 1"
    echo "  $0 create-follower-channel --channelName demo-follower --mainChannelName demo --orgName org2,org3 --ordererOrgName ord --dryRun"
    echo
    echo -e "${YELLOW}create-identities-and-network-config options:${NC}"
    echo "  --channelName          Name of the channel (e.g., demo)"
    echo "  --orgName              Comma-separated list of peer organizations (e.g., org1,org2,org3)"
    echo "  --ordererOrgName       Name of the orderer organization (e.g., ord)"
    echo
    echo -e "Example:"
    echo "  $0 create-identities-and-network-config --channelName demo --orgName org1,org2,org3 --ordererOrgName ord"
    echo
    echo -e "${YELLOW}metadata-upload:${NC}"
    echo "  This command calls connectionFile.sh to create the chaincode package."
    echo "  No parameters required - connectionFile.sh has all values configured."
    echo "  Output: ../generated_resources/chaincode.tgz containing metadata.json and code.tar.gz (which contains connection.json)."
    echo
    echo -e "Example:"
    echo "  $0 metadata-upload"
    echo
    echo -e "${YELLOW}install-chaincode-metadata options:${NC}"
    echo "  --chaincodeLabel       Chaincode label (e.g., asset_1.0)"
    echo "  --chaincodePath        Path to chaincode package (default: ../generated_resources/chaincode.tgz)"
    echo "  --orgName              Comma-separated list of organizations (e.g., org1,org2)"
    echo "  --configFile           Network config file (default: ../generated_resources/network-config.yaml)"
    echo
    echo -e "${YELLOW}Note:${NC}"
    echo "  This installs the metadata package created by 'metadata-upload' command."
    echo "  The package (../generated_resources/chaincode.tgz) contains metadata.json and connection.json."
    echo
    echo -e "Example:"
    echo "  $0 install-chaincode-metadata --chaincodeLabel asset_1.0 --orgName org1"
    echo "  $0 install-chaincode-metadata --chaincodeLabel asset_1.0 --chaincodePath ../generated_resources/chaincode.tgz --orgName org1,org2 --configFile ../generated_resources/network-config.yaml"
    echo
    echo -e "${YELLOW}deploy-chaincode options:${NC}"
    echo "  --chaincodeName        Name of the chaincode (e.g., asset)"
    echo "  --imageName            Docker image name (e.g., kfsoftware/chaincode-external)"
    echo "  --configFile           Network config file (default: ../generated_resources/network-config.yaml)"
    echo
    echo -e "Example:"
    echo "  export CHAINCODE_NAME=asset"
    echo "  $0 deploy-chaincode --chaincodeName asset --imageName kfsoftware/chaincode-external --configFile ../generated_resources/network-config.yaml"
    echo
    echo -e "${YELLOW}approve-chaincode options:${NC}"
    echo "  --chaincodeName        Name of the chaincode (e.g., asset)"
    echo "  --version              Chaincode version (e.g., 1.0)"
    echo "  --sequence             Sequence number (e.g., 1)"
    echo "  --channelName          Channel name (e.g., demo)"
    echo "  --orgName              Comma-separated list of organizations (e.g., org1,org2)"
    echo "  --configFile           Network config file (default: ../generated_resources/network-config.yaml)"
    echo
    echo -e "Example:"
    echo "  export CHAINCODE_NAME=asset"
    echo "  $0 approve-chaincode --chaincodeName asset --version 1.0 --sequence 1 --channelName demo --orgName org1,org2 --configFile ../generated_resources/network-config.yaml"
    echo
    echo -e "${YELLOW}commit-chaincode options:${NC}"
    echo "  --chaincodeName        Name of the chaincode (e.g., asset)"
    echo "  --version              Chaincode version (e.g., 1.0)"
    echo "  --sequence             Sequence number (e.g., 1)"
    echo "  --channelName          Channel name (e.g., demo)"
    echo "  --orgName              Comma-separated list of organizations (e.g., org1,org2)"
    echo "  --configFile           Network config file (default: ../generated_resources/network-config.yaml)"
    echo
    echo -e "Example:"
    echo "  export CHAINCODE_NAME=asset"
    echo "  $0 commit-chaincode --chaincodeName asset --version 1.0 --sequence 1 --channelName demo --orgName org1,org2 --configFile ../generated_resources/network-config.yaml"
    echo -e "${NC}"
    exit 1
}

function create_organization() {
    local orgName=$1
    local peerCount=$2
    local adminUsername=$3
    local adminPassword=$4
    local peerUsername=$5
    local peerPassword=$6
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Organization: ${orgName}${NC}"
    echo -e "${GREEN}Peer Count: ${peerCount}${NC}"
    echo -e "${GREEN}Admin User: ${adminUsername}${NC}"
    echo -e "${GREEN}Peer User: ${peerUsername}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Step 1: Deploy CA
    echo -e "${YELLOW}Step 1/5: Deploying Certificate Authority for ${orgName}...${NC}"
    echo -e "${GREEN}Executing: ./caHandler.sh deploy-ca --orgName ${orgName}${NC}"
    ./caHandler.sh deploy-ca --orgName ${orgName}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to deploy CA for ${orgName}${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ CA deployed successfully${NC}"
    echo
    
    # Wait a bit for CA to be fully ready
    sleep 5
    
    # Step 2: Register peer user
    echo -e "${YELLOW}Step 2/5: Registering peer user...${NC}"
    echo -e "${GREEN}Executing: ./caHandler.sh register-user --orgName ${orgName} --userName ${peerUsername} --userSecret ${peerPassword}${NC}"
    ./caHandler.sh register-user --orgName ${orgName} --userName ${peerUsername} --userSecret ${peerPassword}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to register peer user${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Peer user registered successfully${NC}"
    echo
    
    # Step 3: Register admin user
    echo -e "${YELLOW}Step 3/5: Registering admin user and enrolling...${NC}"
    echo -e "${GREEN}Executing: ./channelEnrollment.sh register_enroll_peerMSP --peerOrgName ${orgName} --username ${adminUsername} --password ${adminPassword}${NC}"
    ./channelEnrollment.sh register_enroll_peerMSP --peerOrgName ${orgName} --username ${adminUsername} --password ${adminPassword}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to register/enroll admin user${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Admin user registered and enrolled successfully${NC}"
    echo
    
    # Step 4: Deploy peers
    echo -e "${YELLOW}Step 4/5: Deploying ${peerCount} peer node(s)...${NC}"
    for i in $(seq 0 $((peerCount-1))); do
        echo -e "${GREEN}Deploying peer${i}...${NC}"
        echo -e "${GREEN}Executing: ./peerHandler.sh deploy-peer --orgName ${orgName} --peerName peer${i} --username ${peerUsername} --password ${peerPassword}${NC}"
        ./peerHandler.sh deploy-peer --orgName ${orgName} --peerName peer${i} --username ${peerUsername} --password ${peerPassword}
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to deploy peer${i}${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ peer${i} deployed successfully${NC}"
        
        # Wait between peer deployments
        if [ $i -lt $((peerCount-1)) ]; then
            sleep 3
        fi
    done
    echo -e "${GREEN}✓ All peers deployed successfully${NC}"
    echo
    
    # Step 5: Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Organization ${orgName} created successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}  - CA: ${orgName}-ca${NC}"
    echo -e "${GREEN}  - MSP ID: ${orgName}MSP${NC}"
    echo -e "${GREEN}  - Admin: ${orgName}-admin${NC}"
    echo -e "${GREEN}  - Peers: ${peerCount}${NC}"
    for i in $(seq 0 $((peerCount-1))); do
        echo -e "${GREEN}    • ${orgName}-peer${i}${NC}"
    done
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Create a channel with: ./channelHandler.sh create-channel --channelName <name> --ordererOrgName ord --creatorOrgName ${orgName}${NC}"
    echo -e "${YELLOW}  2. Join the channel with: ./followerChannel.sh join-channel --channelName <name> --mainChannelName <name> --orgName ${orgName} --ordererOrgName ord${NC}"
}

function create_orderer_organization() {
    local orgName=$1
    local ordererCount=$2
    local adminUsername=$3
    local adminPassword=$4
    local ordererUsername=$5
    local ordererPassword=$6
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Orderer Organization: ${orgName}${NC}"
    echo -e "${GREEN}Orderer Count: ${ordererCount}${NC}"
    echo -e "${GREEN}Admin User: ${adminUsername}${NC}"
    echo -e "${GREEN}Orderer User: ${ordererUsername}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Step 1: Create Orderer CA
    echo -e "${YELLOW}Step 1/4: Creating Orderer Certificate Authority...${NC}"
    echo -e "${GREEN}Executing: ./ordererHandler.sh create-ca --orgName ${orgName}${NC}"
    ./ordererHandler.sh create-ca --orgName ${orgName}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create orderer CA${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Orderer CA created successfully${NC}"
    echo
    
    # Wait for CA to be ready
    sleep 5
    
    # Step 2: Register orderer user
    echo -e "${YELLOW}Step 2/4: Registering orderer user...${NC}"
    echo -e "${GREEN}Executing: ./ordererHandler.sh register-user --orgName ${orgName} --username ${ordererUsername} --password ${ordererPassword}${NC}"
    ./ordererHandler.sh register-user --orgName ${orgName} --username ${ordererUsername} --password ${ordererPassword}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to register orderer user${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Orderer user registered successfully${NC}"
    echo
    
    # Step 3: Register and enroll admin user
    echo -e "${YELLOW}Step 3/4: Registering and enrolling admin user...${NC}"
    echo -e "${GREEN}Executing: ./channelEnrollment.sh register_enroll_ordererMSP --ordererOrgName ${orgName} --username ${adminUsername} --password ${adminPassword}${NC}"
    ./channelEnrollment.sh register_enroll_ordererMSP --ordererOrgName ${orgName} --username ${adminUsername} --password ${adminPassword}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to register/enroll admin user${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Admin user registered and enrolled successfully${NC}"
    echo
    
    # Step 4: Deploy orderer nodes
    echo -e "${YELLOW}Step 4/4: Deploying ${ordererCount} orderer node(s)...${NC}"
    echo -e "${GREEN}Executing: ./ordererHandler.sh deploy-orderer --orgName ${orgName} --ordererCount ${ordererCount} --username ${ordererUsername} --password ${ordererPassword}${NC}"
    ./ordererHandler.sh deploy-orderer --orgName ${orgName} --ordererCount ${ordererCount} --username ${ordererUsername} --password ${ordererPassword}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to deploy orderer nodes${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ All orderer nodes deployed successfully${NC}"
    echo
    
    # Step 5: Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Orderer Organization ${orgName} created successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}  - CA: ${orgName}-ca${NC}"
    echo -e "${GREEN}  - MSP ID: ${orgName}MSP${NC}"
    echo -e "${GREEN}  - Admin: ${orgName}-admin-sign, ${orgName}-admin-tls${NC}"
    echo -e "${GREEN}  - Orderers: ${ordererCount}${NC}"
    for i in $(seq 0 $((ordererCount-1))); do
        echo -e "${GREEN}    • ${orgName}-node${i} (orderer${i}-${orgName}.localho.st)${NC}"
    done
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Create peer organizations with: $0 create-system-org${NC}"
    echo -e "${YELLOW}  2. Create a channel with: $0 create-channels${NC}"
}

# Function to create channel and join all organizations
function create_channels() {
    local channelName=$1
    local orgNames=$2
    local ordererOrgName=$3
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating and Joining Channel: ${channelName}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Convert comma-separated list to array
    IFS=',' read -ra orgArray <<< "$orgNames"
    totalOrgs=${#orgArray[@]}
    
    if [ $totalOrgs -lt 1 ]; then
        echo -e "${RED}At least one organization is required${NC}"
        exit 1
    fi
    
    # Comma separated list of orgs for creator
    creatorOrg="${orgArray[0]}"
    creatorOrgList=""
    for org in "${orgArray[@]}"; do
        if [ -z "$creatorOrgList" ]; then
            creatorOrgList="${org}"
        else
            creatorOrgList="${creatorOrgList},${org}"
        fi
    done


    # Step 1: Create channel with all creator organizations
    echo -e "${YELLOW}Step 1/1: Creating channel '${channelName}' with creator organizations '${creatorOrgList}'...${NC}"
    echo -e "${GREEN}Executing: ./channelHandler.sh create-channel --channelName ${channelName} --ordererOrgName ${ordererOrgName} --creatorOrgName ${creatorOrgList}${NC}"
    ./channelHandler.sh create-channel --channelName ${channelName} --ordererOrgName ${ordererOrgName} --creatorOrgName ${creatorOrgList}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create channel${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Channel '${channelName}' created successfully${NC}"
    echo
    
    # Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Channel Created Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}  - Channel Name: ${channelName}${NC}"
    echo -e "${GREEN}  - Creator Orgs: ${totalOrgs}${NC}"
    for org in "${orgArray[@]}"; do
        echo -e "${GREEN}    • ${org}MSP${NC}"
    done
    echo -e "${GREEN}  - Orderer Org: ${ordererOrgName}MSP${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Join follower orgs: $0 create-follower-channel --channelName <name> --mainChannelName ${channelName} --orgName <orgs> --ordererOrgName ${ordererOrgName}${NC}"
    echo -e "${YELLOW}  2. Create identities and network config: $0 create-identities-and-network-config --channelName ${channelName} --orgName ${creatorOrgList} --ordererOrgName ${ordererOrgName}${NC}"
    echo -e "${YELLOW}  3. Create chaincode metadata: $0 metadata-upload${NC}"
    echo -e "${YELLOW}  4. Install chaincode metadata: $0 install-chaincode-metadata --chaincodeLabel asset_1.0 --orgName org1${NC}"
}

# Function to create follower channel for organizations
function create_follower_channel() {
    local channelName=$1
    local mainChannelName=$2
    local orgNames=$3
    local ordererOrgName=$4
    local ordererNode=$5
    local dryRun=$6
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Follower Channels${NC}"
    echo -e "${GREEN}Follower Channel Name: ${channelName}${NC}"
    echo -e "${GREEN}Main Channel Name: ${mainChannelName}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    if [ -n "$ordererNode" ]; then
        echo -e "${GREEN}Orderer Node: ${ordererNode}${NC}"
    fi
    if [ "$dryRun" == "true" ]; then
        echo -e "${YELLOW}Mode: Dry Run (YAML only, no apply)${NC}"
    fi
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Convert comma-separated list to array
    IFS=',' read -ra orgArray <<< "$orgNames"
    totalOrgs=${#orgArray[@]}
    
    if [ $totalOrgs -lt 1 ]; then
        echo -e "${RED}At least one organization is required${NC}"
        exit 1
    fi
    
    # Loop through each organization and create follower channel
    orgIndex=0
    for org in "${orgArray[@]}"; do
        orgIndex=$((orgIndex + 1))
        echo -e "${YELLOW}Creating follower channel ${orgIndex}/${totalOrgs} for organization: ${org}${NC}"
        
        # Build command with optional parameters
        cmd="./followerChannel.sh join-channel --channelName ${channelName} --mainChannelName ${mainChannelName} --orgName ${org} --ordererOrgName ${ordererOrgName}"
        if [ -n "$ordererNode" ]; then
            cmd="${cmd} --ordererNode ${ordererNode}"
        fi
        if [ "$dryRun" == "true" ]; then
            cmd="${cmd} --dryRun"
        fi
        
        echo -e "${GREEN}Executing: ${cmd}${NC}"
        eval $cmd
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to create follower channel for ${org}${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Organization ${org} joined channel successfully${NC}"
        echo
    done
    
    # Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Follower Channel Setup Completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}  - Follower Channel: ${channelName}${NC}"
    echo -e "${GREEN}  - Main Channel: ${mainChannelName}${NC}"
    echo -e "${GREEN}  - Organizations Joined: ${totalOrgs}${NC}"
    for org in "${orgArray[@]}"; do
        echo -e "${GREEN}    • ${org}MSP${NC}"
    done
    echo -e "${GREEN}========================================${NC}"
}

# Function to create identities and network configuration
function create_identities_and_network_config() {
    local channelName=$1
    local orgNames=$2
    local ordererOrgName=$3
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Identities and Network Config${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Convert comma-separated list to array
    IFS=',' read -ra orgArray <<< "$orgNames"
    
    # Step 1: Create identities for all peer organizations
    echo -e "${YELLOW}Step 1/2: Creating identities for all peer organizations...${NC}"
    for org in "${orgArray[@]}"; do
        echo -e "${YELLOW}Creating identity for ${org}...${NC}"
        echo -e "${GREEN}Executing: ./chaincodeHandler.sh create-org-identity --orgName ${org}${NC}"
        ./chaincodeHandler.sh create-org-identity --orgName ${org}
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠ Warning: Issue creating identity for ${org}, but continuing...${NC}"
        else
            echo -e "${GREEN}✓ Identity created for ${org}${NC}"
        fi
    done
    echo
    
    # Step 2: Generate network configuration file
    echo -e "${YELLOW}Step 2/2: Generating network configuration file...${NC}"
    
    # Build command with multiple --orgName flags
    local orgNameFlags=""
    for org in "${orgArray[@]}"; do
        orgNameFlags="${orgNameFlags} --orgName ${org}"
    done
    
    echo -e "${GREEN}Executing: ./chaincodeHandler.sh connection-file --channelName ${channelName}${orgNameFlags} --ordererOrgName ${ordererOrgName}${NC}"
    ./chaincodeHandler.sh connection-file --channelName ${channelName} ${orgNameFlags} --ordererOrgName ${ordererOrgName}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to generate network configuration${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Network configuration generated successfully${NC}"
    echo
    kubectl get secret network-cp -o jsonpath="{.data.config\.yaml}" | base64 --decode > ../generated_resources/network-config.yaml
    # Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Identities and Network Config Completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}  - Channel: ${channelName}${NC}"
    echo -e "${GREEN}  - Organizations: ${#orgArray[@]}${NC}"
    for org in "${orgArray[@]}"; do
        echo -e "${GREEN}    • ${org}MSP (identity: ${org}-admin)${NC}"
    done
    echo -e "${GREEN}  - Network Config: network-cp secret created${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Create chaincode metadata: $0 metadata-upload${NC}"
    echo -e "${YELLOW}  2. Install chaincode metadata: $0 install-chaincode-metadata --chaincodeLabel asset_1.0 --orgName org1${NC}"
    echo -e "${YELLOW}  3. Deploy chaincode: $0 deploy-chaincode${NC}"
}

# Function to create chaincode package using connectionFile.sh
function metadata_upload() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Chaincode Package${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Execute connectionFile.sh to create the chaincode package
    echo -e "${YELLOW}Calling connectionFile.sh to create chaincode package...${NC}"
    echo -e "${GREEN}Executing: ./connectionFile.sh${NC}"
    ./connectionFile.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create chaincode package${NC}"
        exit 1
    fi
    echo
    
    # Summary
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Chaincode Package Created Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Output: ../generated_resources/chaincode.tgz${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Install the chaincode package on peers using kubectl hlf${NC}"
    echo -e "${YELLOW}  2. Use externalChainCodeHandler.sh to approve and commit${NC}"
}

# Function to install chaincode on peer organizations
function install_chaincode() {
    local chaincodeLabel=$1
    local chaincodePath=$2
    local orgNames=$3
    local configFile=$4
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Installing Chaincode Metadata Package${NC}"
    echo -e "${GREEN}Chaincode Label: ${chaincodeLabel}${NC}"
    echo -e "${GREEN}Package Path: ${chaincodePath}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Config File: ${configFile}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Validate chaincode package exists
    if [ ! -f "${chaincodePath}" ]; then
        echo -e "${RED}Error: Chaincode package not found at ${chaincodePath}${NC}"
        exit 1
    fi
    
    # Convert comma-separated list to array
    IFS=',' read -ra orgArray <<< "$orgNames"
    
    # Install on all peers of all organizations
    for org in "${orgArray[@]}"; do
        echo -e "${YELLOW}Installing chaincode on organization: ${org}${NC}"
        
        # Get all peers for this organization
        peerCount=$(kubectl get fabricpeers --all-namespaces --no-headers | grep "${org}-peer" | wc -l)
        echo -e "${GREEN}Detected ${peerCount} peer(s) for ${org}${NC}"
        
        for i in $(seq 0 $((peerCount-1))); do
            peerName="peer${i}"
            echo -e "${YELLOW}Installing on ${org}-${peerName}...${NC}"
            echo -e "${GREEN}Executing: kubectl hlf chaincode install --path=${chaincodePath} --config=${configFile} --language=golang --label=${chaincodeLabel} --user=${org}-admin-default --peer=${org}-${peerName}.default${NC}"
            
            kubectl hlf chaincode install --path=${chaincodePath} \
                --config=${configFile} --language=golang --label=${chaincodeLabel} \
                --user=${org}-admin-default --peer=${org}-${peerName}.default
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Chaincode installed on ${org}-${peerName}${NC}"
            else
                echo -e "${RED}Failed to install chaincode on ${org}-${peerName}${NC}"
                exit 1
            fi
            echo
        done
    done
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Chaincode Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Deploy external chaincode: $0 deploy-chaincode${NC}"
    echo -e "${YELLOW}  2. Approve chaincode: $0 approve-chaincode${NC}"
    echo -e "${YELLOW}  3. Commit chaincode: $0 commit-chaincode${NC}"
}

# Function to deploy external chaincode container
function deploy_chaincode() {
    local chaincodeName=$1
    local imageName=$2
    local configFile=$3
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deploying External Chaincode Container${NC}"
    echo -e "${GREEN}Chaincode Name: ${chaincodeName}${NC}"
    echo -e "${GREEN}Image Name: ${imageName}${NC}"
    echo -e "${GREEN}Config File: ${configFile}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Set environment variable
    export CHAINCODE_NAME=${chaincodeName}
    
    # Call externalChainCodeHandler.sh
    echo -e "${GREEN}Executing: ./externalChainCodeHandler.sh externalchaincode-sync --imageName ${imageName} --configFile ${configFile}${NC}"
    ./externalChainCodeHandler.sh externalchaincode-sync --imageName ${imageName} --configFile ${configFile}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ External chaincode deployed successfully${NC}"
    else
        echo -e "${RED}Failed to deploy external chaincode${NC}"
        exit 1
    fi
    
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Approve chaincode: $0 approve-chaincode${NC}"
    echo -e "${YELLOW}  2. Commit chaincode: $0 commit-chaincode${NC}"
}

# Function to approve chaincode
function approve_chaincode_wrapper() {
    local chaincodeName=$1
    local version=$2
    local sequence=$3
    local channelName=$4
    local orgNames=$5
    local configFile=$6
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Approving Chaincode${NC}"
    echo -e "${GREEN}Chaincode Name: ${chaincodeName}${NC}"
    echo -e "${GREEN}Version: ${version}${NC}"
    echo -e "${GREEN}Sequence: ${sequence}${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Config File: ${configFile}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Set environment variable
    export CHAINCODE_NAME=${chaincodeName}
    
    # Convert comma-separated list to multiple --orgName flags
    IFS=',' read -ra orgArray <<< "$orgNames"
    local orgFlags=""
    for org in "${orgArray[@]}"; do
        orgFlags="${orgFlags} --orgName ${org}"
    done
    
    # Call externalChainCodeHandler.sh
    echo -e "${GREEN}Executing: ./externalChainCodeHandler.sh approve --configFile ${configFile}${orgFlags} --peerName peer0 --channelName ${channelName} --version ${version} --sequence ${sequence}${NC}"
    ./externalChainCodeHandler.sh approve --configFile ${configFile} ${orgFlags} --peerName peer0 --channelName ${channelName} --version ${version} --sequence ${sequence}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Chaincode approved successfully${NC}"
    else
        echo -e "${RED}Failed to approve chaincode${NC}"
        exit 1
    fi
    
    echo
    echo -e "${YELLOW}Next step:${NC}"
    echo -e "${YELLOW}  Commit chaincode: $0 commit-chaincode${NC}"
}

# Function to commit chaincode
function commit_chaincode_wrapper() {
    local chaincodeName=$1
    local version=$2
    local sequence=$3
    local channelName=$4
    local orgNames=$5
    local configFile=$6
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Committing Chaincode${NC}"
    echo -e "${GREEN}Chaincode Name: ${chaincodeName}${NC}"
    echo -e "${GREEN}Version: ${version}${NC}"
    echo -e "${GREEN}Sequence: ${sequence}${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo -e "${GREEN}Organizations: ${orgNames}${NC}"
    echo -e "${GREEN}Config File: ${configFile}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    # Set environment variable
    export CHAINCODE_NAME=${chaincodeName}
    
    # Convert comma-separated list to multiple --orgName flags
    IFS=',' read -ra orgArray <<< "$orgNames"
    local orgFlags=""
    for org in "${orgArray[@]}"; do
        orgFlags="${orgFlags} --orgName ${org}"
    done
    
    # Call externalChainCodeHandler.sh
    echo -e "${GREEN}Executing: ./externalChainCodeHandler.sh commit --configFile ${configFile}${orgFlags} --channelName ${channelName} --version ${version} --sequence ${sequence}${NC}"
    ./externalChainCodeHandler.sh commit --configFile ${configFile} ${orgFlags} --channelName ${channelName} --version ${version} --sequence ${sequence}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Chaincode committed successfully${NC}"
    else
        echo -e "${RED}Failed to commit chaincode${NC}"
        exit 1
    fi
    
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Chaincode Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Your chaincode is now ready to use on channel: ${channelName}${NC}"
}

# Main script logic
subcommand=$1
orgName=""
peerCount=""
ordererCount=""
adminUsername=""
adminPassword=""
peerUsername=""
peerPassword=""
ordererUsername=""
ordererPassword=""
channelName=""
ordererOrgName=""
chaincodeName=""
metadataPath=""
connectionPath=""
chaincodeLabel=""
chaincodePath=""
imageName=""
configFile=""
version=""
sequence=""

if [ "$subcommand" == "help" ]; then
    show_help
    exit 0
fi

if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "create-system-org" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            --peerCount) peerCount="$2"; shift ;;
            --adminUsername) adminUsername="$2"; shift ;;
            --adminPassword) adminPassword="$2"; shift ;;
            --peerUsername) peerUsername="$2"; shift ;;
            --peerPassword) peerPassword="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$orgName" ] || [ -z "$peerCount" ] || [ -z "$adminUsername" ] || [ -z "$adminPassword" ] || [ -z "$peerUsername" ] || [ -z "$peerPassword" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName, --peerCount, --adminUsername, --adminPassword, --peerUsername, and --peerPassword.${NC}"
        show_help
        exit 1
    fi
    
    # Validate peerCount is a number
    if ! [[ "$peerCount" =~ ^[0-9]+$ ]] || [ "$peerCount" -lt 1 ]; then
        echo -e "${RED}Invalid peer count. Must be a positive number.${NC}"
        exit 1
    fi
    
    # Convert comma-separated list to array and create each organization
    IFS=',' read -ra orgArray <<< "$orgName"
    totalOrgs=${#orgArray[@]}
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating ${totalOrgs} peer organization(s)${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    for idx in "${!orgArray[@]}"; do
        org="${orgArray[$idx]}"
        orgNum=$((idx + 1))
        
        echo -e "${YELLOW}[${orgNum}/${totalOrgs}] Creating organization: ${org}${NC}"
        echo
        
        create_organization "$org" "$peerCount" "$adminUsername" "$adminPassword" "$peerUsername" "$peerPassword"
        
        # Add spacing between organizations
        if [ $idx -lt $((totalOrgs - 1)) ]; then
            echo
            echo -e "${GREEN}----------------------------------------${NC}"
            echo
            sleep 2
        fi
    done
    
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All ${totalOrgs} organization(s) created successfully!${NC}"
    echo -e "${GREEN}Organizations: ${orgName}${NC}"
    echo -e "${GREEN}========================================${NC}"

elif [ "$subcommand" == "create-system-orderer" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            --ordererCount) ordererCount="$2"; shift ;;
            --adminUsername) adminUsername="$2"; shift ;;
            --adminPassword) adminPassword="$2"; shift ;;
            --ordererUsername) ordererUsername="$2"; shift ;;
            --ordererPassword) ordererPassword="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$orgName" ] || [ -z "$ordererCount" ] || [ -z "$adminUsername" ] || [ -z "$adminPassword" ] || [ -z "$ordererUsername" ] || [ -z "$ordererPassword" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName, --ordererCount, --adminUsername, --adminPassword, --ordererUsername, and --ordererPassword.${NC}"
        show_help
        exit 1
    fi
    
    # Validate ordererCount is a number
    if ! [[ "$ordererCount" =~ ^[0-9]+$ ]] || [ "$ordererCount" -lt 1 ]; then
        echo -e "${RED}Invalid orderer count. Must be a positive number.${NC}"
        exit 1
    fi
    
    create_orderer_organization "$orgName" "$ordererCount" "$adminUsername" "$adminPassword" "$ordererUsername" "$ordererPassword"

elif [ "$subcommand" == "create-channels" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --channelName) channelName="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$channelName" ] || [ -z "$orgName" ] || [ -z "$ordererOrgName" ]; then
        echo -e "${RED}Missing required options. Please provide --channelName, --orgName, and --ordererOrgName.${NC}"
        show_help
        exit 1
    fi
    
    create_channels "$channelName" "$orgName" "$ordererOrgName"

elif [ "$subcommand" == "create-follower-channel" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    ordererNode=""
    dryRun="false"
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --channelName) channelName="$2"; shift ;;
            --mainChannelName) mainChannelName="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            --ordererNode) ordererNode="$2"; shift ;;
            --dryRun) dryRun="true" ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$channelName" ] || [ -z "$mainChannelName" ] || [ -z "$orgName" ] || [ -z "$ordererOrgName" ]; then
        echo -e "${RED}Missing required options. Please provide --channelName, --mainChannelName, --orgName, and --ordererOrgName.${NC}"
        show_help
        exit 1
    fi
    
    create_follower_channel "$channelName" "$mainChannelName" "$orgName" "$ordererOrgName" "$ordererNode" "$dryRun"

elif [ "$subcommand" == "create-identities-and-network-config" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --channelName) channelName="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$channelName" ] || [ -z "$orgName" ] || [ -z "$ordererOrgName" ]; then
        echo -e "${RED}Missing required options. Please provide --channelName, --orgName, and --ordererOrgName.${NC}"
        show_help
        exit 1
    fi
    
    create_identities_and_network_config "$channelName" "$orgName" "$ordererOrgName"

elif [ "$subcommand" == "metadata-upload" ]; then
    metadata_upload

elif [ "$subcommand" == "install-chaincode-metadata" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    # Set defaults
    configFile="../generated_resources/network-config.yaml"
    chaincodePath="../generated_resources/chaincode.tgz"
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --chaincodeLabel) chaincodeLabel="$2"; shift ;;
            --chaincodePath) chaincodePath="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --configFile) configFile="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$chaincodeLabel" ] || [ -z "$orgName" ]; then
        echo -e "${RED}Missing required options. Please provide --chaincodeLabel and --orgName.${NC}"
        show_help
        exit 1
    fi
    
    install_chaincode "$chaincodeLabel" "$chaincodePath" "$orgName" "$configFile"

elif [ "$subcommand" == "deploy-chaincode" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    # Set default config file
    configFile="../generated_resources/network-config.yaml"
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --chaincodeName) chaincodeName="$2"; shift ;;
            --imageName) imageName="$2"; shift ;;
            --configFile) configFile="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$chaincodeName" ] || [ -z "$imageName" ]; then
        echo -e "${RED}Missing required options. Please provide --chaincodeName and --imageName.${NC}"
        show_help
        exit 1
    fi
    
    deploy_chaincode "$chaincodeName" "$imageName" "$configFile"

elif [ "$subcommand" == "approve-chaincode" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    # Set default config file
    configFile="../generated_resources/network-config.yaml"
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --chaincodeName) chaincodeName="$2"; shift ;;
            --version) version="$2"; shift ;;
            --sequence) sequence="$2"; shift ;;
            --channelName) channelName="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --configFile) configFile="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$chaincodeName" ] || [ -z "$version" ] || [ -z "$sequence" ] || [ -z "$channelName" ] || [ -z "$orgName" ]; then
        echo -e "${RED}Missing required options. Please provide --chaincodeName, --version, --sequence, --channelName, and --orgName.${NC}"
        show_help
        exit 1
    fi
    
    approve_chaincode_wrapper "$chaincodeName" "$version" "$sequence" "$channelName" "$orgName" "$configFile"

elif [ "$subcommand" == "commit-chaincode" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    # Set default config file
    configFile="../generated_resources/network-config.yaml"
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --chaincodeName) chaincodeName="$2"; shift ;;
            --version) version="$2"; shift ;;
            --sequence) sequence="$2"; shift ;;
            --channelName) channelName="$2"; shift ;;
            --orgName) orgName="$2"; shift ;;
            --configFile) configFile="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$chaincodeName" ] || [ -z "$version" ] || [ -z "$sequence" ] || [ -z "$channelName" ] || [ -z "$orgName" ]; then
        echo -e "${RED}Missing required options. Please provide --chaincodeName, --version, --sequence, --channelName, and --orgName.${NC}"
        show_help
        exit 1
    fi
    
    commit_chaincode_wrapper "$chaincodeName" "$version" "$sequence" "$channelName" "$orgName" "$configFile"

else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi
