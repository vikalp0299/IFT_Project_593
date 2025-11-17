#!/bin/bash
#Author: Vikalp Parashar
# External Chaincode Handler Script

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Global variables
PACKAGE_ID=""
PEER_NAME=""
ORG_NAME=""

function show_help() {
    echo -e "${YELLOW}Help - External Chaincode Handler Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  externalchaincode-sync    Deploy external chaincode container"
    echo "  approve                   Approve chaincode for organizations"
    echo "  commit                    Commit chaincode to channel"
    echo
    echo -e "${YELLOW}externalchaincode-sync options:${NC}"
    echo "  --imageName               Docker image name (e.g., kfsoftware/chaincode-external)"
    echo "  --configFile              Config file path (e.g., network.yaml)"
    echo
    echo -e "${YELLOW}approve options:${NC}"
    echo "  --configFile              Config file path with extension (e.g., network.yaml)"
    echo "  --orgName                 Organization names (can be specified multiple times)"
    echo "  --peerName                Peer name (e.g., peer0)"
    echo "  --channelName             Channel name"
    echo "  --version                 Chaincode version (e.g., 1.0)"
    echo "  --sequence                Sequence number (e.g., 1)"
    echo
    echo -e "${YELLOW}commit options:${NC}"
    echo "  --configFile              Config file path with extension (e.g., network.yaml)"
    echo "  --orgName                 Organization names (can be specified multiple times)"
    echo "  --channelName             Channel name"
    echo "  --version                 Chaincode version (e.g., 1.0)"
    echo "  --sequence                Sequence number (e.g., 1)"
    echo
    echo -e "Examples:"
    echo "  export CHAINCODE_NAME=asset"
    echo "  $0 externalchaincode-sync --imageName kfsoftware/chaincode-external --configFile network.yaml"
    echo "  $0 approve --configFile network.yaml --orgName org1 --orgName org2 --peerName peer0 --channelName demo --version 1.0 --sequence 1"
    echo "  $0 commit --configFile network.yaml --orgName org1 --orgName org2 --channelName demo --version 1.0 --sequence 1"
    echo -e "${NC}"
    exit 1
}

function initialize_globals() {
    local configFile=$1
    
    if [ -z "$CHAINCODE_NAME" ]; then
        echo -e "${RED}Error: CHAINCODE_NAME environment variable is not set${NC}"
        echo -e "${YELLOW}Please export CHAINCODE_NAME before running this command${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Initializing globals for chaincode: ${CHAINCODE_NAME}${NC}"
    echo
    
    # Get first available peer
    echo -e "${YELLOW}Detecting peers from cluster...${NC}"
    local firstPeer=$(kubectl get fabricpeers -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$firstPeer" ]; then
        echo -e "${RED}No peers found in cluster${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Using peer: ${firstPeer}${NC}"
    
    # Extract peer name and org name from peer (format: orgName-peerName)
    ORG_NAME=$(echo $firstPeer | cut -d'-' -f1)
    PEER_NAME=$(echo $firstPeer | cut -d'-' -f2)
    
    echo -e "${GREEN}Organization: ${ORG_NAME}${NC}"
    echo -e "${GREEN}Peer: ${PEER_NAME}${NC}"
    echo
    
    # Query installed chaincode to get PACKAGE_ID
    echo -e "${YELLOW}Querying installed chaincode...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf chaincode queryinstalled --config=${configFile} --user=${ORG_NAME}-admin-default --peer=${firstPeer}.default${NC}"
    echo
    
    PACKAGE_ID=$(kubectl hlf chaincode queryinstalled --config=${configFile} --user=${ORG_NAME}-admin-default --peer=${firstPeer}.default | grep -oE "${CHAINCODE_NAME}:[a-f0-9]+" | head -1)
    
    if [ -z "$PACKAGE_ID" ]; then
        echo -e "${RED}Failed to get PACKAGE_ID. Make sure chaincode is installed on peers.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ PACKAGE_ID: ${PACKAGE_ID}${NC}"
    echo
}

function externalchaincode_sync() {
    local imageName=$1
    
    echo -e "${GREEN}Syncing external chaincode...${NC}"
    echo -e "${GREEN}Image: ${imageName}${NC}"
    echo -e "${GREEN}Chaincode Name: ${CHAINCODE_NAME}${NC}"
    echo -e "${GREEN}PACKAGE_ID: ${PACKAGE_ID}${NC}"
    echo
    
    # Sync external chaincode
    echo -e "${YELLOW}Syncing external chaincode container...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf externalchaincode sync --image=${imageName}:latest --name=${CHAINCODE_NAME} --namespace=default --package-id=${PACKAGE_ID} --tls-required=false --replicas=1${NC}"
    echo
    
    kubectl hlf externalchaincode sync --image=${imageName}:latest \
        --name=${CHAINCODE_NAME} \
        --namespace=default \
        --package-id=${PACKAGE_ID} \
        --tls-required=false \
        --replicas=1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ External chaincode synced successfully${NC}"
        echo -e "${GREEN}PACKAGE_ID: ${PACKAGE_ID}${NC}"
    else
        echo -e "${RED}Failed to sync external chaincode${NC}"
        exit 1
    fi
}

function approve_chaincode() {
    local configFile=$1
    local peerName=$2
    local channelName=$3
    local version=$4
    local sequence=$5
    shift 5
    local orgNames=("$@")
    
    if [ -z "$CHAINCODE_NAME" ]; then
        echo -e "${RED}Error: CHAINCODE_NAME environment variable is not set${NC}"
        echo -e "${YELLOW}Please export CHAINCODE_NAME before running this command${NC}"
        exit 1
    fi
    
    # Build policy with all organizations
    local policyMembers=""
    for org in "${orgNames[@]}"; do
        if [ -z "$policyMembers" ]; then
            policyMembers="'${org}MSP.member'"
        else
            policyMembers="${policyMembers},'${org}MSP.member'"
        fi
    done
    local policy="AND(${policyMembers})"
    
    echo -e "${GREEN}Approving chaincode for organizations...${NC}"
    echo -e "${GREEN}Organizations: ${orgNames[@]}${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo -e "${GREEN}Version: ${version}${NC}"
    echo -e "${GREEN}Sequence: ${sequence}${NC}"
    echo -e "${GREEN}Policy: ${policy}${NC}"
    echo -e "${GREEN}PACKAGE_ID: ${PACKAGE_ID}${NC}"
    echo
    
    # Approve for each organization
    for org in "${orgNames[@]}"; do
        echo -e "${YELLOW}Approving chaincode for ${org}...${NC}"
        echo -e "${YELLOW}Command: kubectl hlf chaincode approveformyorg --config=${configFile} --user=${org}-admin-default --peer=${org}-${peerName}.default --package-id=${PACKAGE_ID} --version ${version} --sequence ${sequence} --name=${CHAINCODE_NAME} --policy=\"${policy}\" --channel=${channelName}${NC}"
        echo
        
        kubectl hlf chaincode approveformyorg --config=${configFile} --user=${org}-admin-default --peer=${org}-${peerName}.default \
            --package-id=${PACKAGE_ID} \
            --version "${version}" --sequence "${sequence}" --name=${CHAINCODE_NAME} \
            --policy="${policy}" --channel=${channelName}
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Chaincode approved for ${org}${NC}"
            echo
        else
            echo -e "${RED}Failed to approve chaincode for ${org}${NC}"
            exit 1
        fi
    done
}

function commit_chaincode() {
    local configFile=$1
    local channelName=$2
    local version=$3
    local sequence=$4
    shift 4
    local orgNames=("$@")
    
    if [ -z "$CHAINCODE_NAME" ]; then
        echo -e "${RED}Error: CHAINCODE_NAME environment variable is not set${NC}"
        echo -e "${YELLOW}Please export CHAINCODE_NAME before running this command${NC}"
        exit 1
    fi
    
    # Build policy with all organizations
    local policyMembers=""
    for org in "${orgNames[@]}"; do
        if [ -z "$policyMembers" ]; then
            policyMembers="'${org}MSP.member'"
        else
            policyMembers="${policyMembers},'${org}MSP.member'"
        fi
    done
    local policy="AND(${policyMembers})"
    
    echo -e "${GREEN}Committing chaincode...${NC}"
    echo -e "${GREEN}Organizations: ${orgNames[@]}${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo -e "${GREEN}Version: ${version}${NC}"
    echo -e "${GREEN}Sequence: ${sequence}${NC}"
    echo -e "${GREEN}Policy: ${policy}${NC}"
    echo
    
    # Use first organization for commit
    local firstOrg="${orgNames[0]}"
    
    echo -e "${YELLOW}Committing chaincode to channel...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf chaincode commit --config=${configFile} --user=${firstOrg}-admin-default --mspid=${firstOrg}MSP --version ${version} --sequence ${sequence} --name=${CHAINCODE_NAME} --policy=\"${policy}\" --channel=${channelName}${NC}"
    echo
    
    kubectl hlf chaincode commit --config=${configFile} --user=${firstOrg}-admin-default --mspid=${firstOrg}MSP \
        --version "${version}" --sequence "${sequence}" --name=${CHAINCODE_NAME} \
        --policy="${policy}" --channel=${channelName}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Chaincode committed successfully${NC}"
    else
        echo -e "${RED}Failed to commit chaincode${NC}"
        exit 1
    fi
}

# Main script logic
subcommand=$1

if [ "$subcommand" == "help" ] || [ -z "$subcommand" ]; then
    show_help
    exit 0
fi

# Parse configFile from all commands first to initialize globals
configFile=""
case "$subcommand" in
    externalchaincode-sync|approve|commit)
        # Find configFile in arguments
        for ((i=1; i<=$#; i++)); do
            if [ "${!i}" == "--configFile" ]; then
                ((i++))
                configFile="${!i}"
                break
            fi
        done
        
        if [ -z "$configFile" ]; then
            echo -e "${RED}Missing required option: --configFile${NC}"
            show_help
            exit 1
        fi
        
        # Initialize global variables
        initialize_globals "$configFile"
        ;;
esac

if [ "$subcommand" == "externalchaincode-sync" ]; then
    shift
    imageName=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --imageName) imageName="$2"; shift ;;
            --configFile) shift ;; # Already parsed
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$imageName" ]; then
        echo -e "${RED}Missing required option: --imageName${NC}"
        show_help
        exit 1
    fi
    
    externalchaincode_sync "$imageName"
    
elif [ "$subcommand" == "approve" ]; then
    shift
    orgNames=()
    peerName=""
    channelName=""
    version=""
    sequence=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --configFile) shift ;; # Already parsed
            --orgName) orgNames+=("$2"); shift ;;
            --peerName) peerName="$2"; shift ;;
            --channelName) channelName="$2"; shift ;;
            --version) version="$2"; shift ;;
            --sequence) sequence="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ ${#orgNames[@]} -eq 0 ] || [ -z "$peerName" ] || [ -z "$channelName" ] || [ -z "$version" ] || [ -z "$sequence" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName (one or more), --peerName, --channelName, --version, and --sequence.${NC}"
        show_help
        exit 1
    fi
    
    approve_chaincode "$configFile" "$peerName" "$channelName" "$version" "$sequence" "${orgNames[@]}"
    
elif [ "$subcommand" == "commit" ]; then
    shift
    orgNames=()
    channelName=""
    version=""
    sequence=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --configFile) shift ;; # Already parsed
            --orgName) orgNames+=("$2"); shift ;;
            --channelName) channelName="$2"; shift ;;
            --version) version="$2"; shift ;;
            --sequence) sequence="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ ${#orgNames[@]} -eq 0 ] || [ -z "$channelName" ] || [ -z "$version" ] || [ -z "$sequence" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName (one or more), --channelName, --version, and --sequence.${NC}"
        show_help
        exit 1
    fi
    
    commit_chaincode "$configFile" "$channelName" "$version" "$sequence" "${orgNames[@]}"
    
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi