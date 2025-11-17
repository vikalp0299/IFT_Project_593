#Author : Vikalp Parashar
#!/bin/bash

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${YELLOW}Help - Peer Handler Script"     
    echo "Usage: $0 deploy-peer --orgName <OrgName> --peerName <PeerName> --username <username> --password <password>"
    echo
    echo "Subcommand: deploy-peer"
    echo
    echo "Options:"
    echo "  --orgName       Name of the organization (e.g., org1)"
    echo "  --peerName      Name of the peer to deploy (e.g., peer0)"
    echo "  --username      Name of the user to register with the CA (e.g., peer)"
    echo "  --password      Password for the user to register with the CA (e.g., peerpw)"
    echo
    echo -e "Example:"
    echo "  $0 deploy-peer --orgName org1 --peerName peer0 --username peer --password peerpw"
    echo -e "${NC}"
    exit 1
}


function deploy_peer() {
    local orgName=$1
    local peerName=$2
    local userName=$3
    local userSecret=$4

    echo -e "${GREEN}Deploying Peer Node...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=$userName --mspid=${orgName}MSP --enroll-pw=$userSecret --capacity=5Gi --name=${orgName}-${peerName} --ca-name=${orgName}-ca.default --hosts=${peerName}-${orgName}.localho.st --istio-port=443${NC}"

    output=$(kubectl hlf peer create --statedb=leveldb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=$STORAGE_CLASS --enroll-id=$userName --mspid=${orgName}MSP \
        --enroll-pw=$userSecret --capacity=5Gi --name=${orgName}-${peerName} --ca-name=${orgName}-ca.default \
        --hosts=${peerName}-${orgName}.localho.st --istio-port=443 & wait)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Peer node '${peerName}' deployed successfully.${NC}"

        echo -e "${GREEN}Waiting for peer node to be ready...${NC}"
        echo -e "${YELLOW}Command: kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all${NC}"
        output=$(kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all & wait)

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Peer node '${peerName}' is now running.${NC}"
        else
            echo -e "${RED}Peer node '${peerName}' failed to reach running state within the timeout period.${NC}"
        fi
        
    else
        echo -e "${RED}Failed to deploy peer node '${peerName}'.${NC}"
    fi
}

subcommand=$1
orgName=""
peerName=""
userName=""
userSecret=""

if [ "$subcommand" == "help" ]; then
    show_help
    exit 0
fi
if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "deploy-peer" ]; then
    shift   
    if [ $# -eq 0 ]; then
        echo -e "${RED}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            --peerName) peerName="$2"; shift ;;
            --username) userName="$2"; shift ;;
            --password) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift

    
    done
    if [ -z "$orgName" ] || [ -z "$peerName" ] || [ -z "$userName" ] || [ -z "$userSecret" ]; then
        echo -e "${YELLOW}Missing required options. Please provide --org, --peer, --username, and --password.${NC}"
        show_help
        exit 1
    fi
    deploy_peer "$orgName" "$peerName" "$userName" "$userSecret"
else
    echo -e "${RED}Unknown subcommand: $subcommand${NC}"
    show_help
    exit 1
fi