
#!/bin/bash
#Author: Vikalp Parashar
# Chaincode Handler Script

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${YELLOW}Help - Chaincode Handler Script${NC}"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  create-org-identity        Create identity for an organization"
    echo "  connection-file            Generate connection profile for multiple organizations"
    echo "  upload-chaincode-package   Upload chaincode package to a peer"
    echo
    echo -e "${YELLOW}create-org-identity options:${NC}"
    echo "  --orgName              Name of the peer organization (e.g., org1)"
    echo
    echo -e "Example:"
    echo "  $0 create-org-identity --orgName org1"
    echo
    echo -e "${YELLOW}connection-file options:${NC}"
    echo "  --orgName              Peer organization name (can be specified multiple times for multi-org)"
    echo "  --ordererOrgName       Name of the orderer organization (e.g., ord)"
    echo "  --channelName          Name of the channel (e.g., demo)"
    echo
    echo -e "Example:"
    echo "  $0 connection-file --orgName org1 --ordererOrgName ord --channelName demo"
    echo "  $0 connection-file --orgName org1 --orgName org2 --ordererOrgName ord --channelName demo"
    echo
    echo -e "${YELLOW}upload-chaincode-package options:${NC}"
    echo "  --orgName              Name of the peer organization (e.g., org1)"
    echo "  --chaincodePackagePath Path to the chaincode package file (e.g., ./chaincode.tgz)"
    echo "  --peerName             Name of the peer to upload the chaincode to (e.g., peer0)"
    echo
    echo -e "Example:"
    echo "  $0 upload-chaincode-package --orgName org1 --chaincodePackagePath ./chaincode.tgz --peerName peer0"
    echo
    echo -e "${NC}"
    exit 1
}

function create_org_identity() {
    local orgName=$1
    
    echo -e "${GREEN}Creating identity for organization: ${orgName}${NC}"
    echo
    
    # Check if identity already exists
    if kubectl get fabricidentities ${orgName}-admin -n default &>/dev/null; then
        echo -e "${YELLOW}⚠ Identity ${orgName}-admin already exists, skipping creation${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Command: kubectl hlf identity create --name ${orgName}-admin --namespace default --ca-name ${orgName}-ca --ca-namespace default --ca ca --mspid ${orgName}MSP --enroll-id explorer-admin --enroll-secret explorer-adminpw --ca-enroll-id=enroll --ca-enroll-secret=enrollpw --ca-type=admin${NC}"
    echo
    
    kubectl hlf identity create --name ${orgName}-admin --namespace default \
        --ca-name ${orgName}-ca --ca-namespace default \
        --ca ca --mspid ${orgName}MSP --enroll-id explorer-admin --enroll-secret explorer-adminpw \
        --ca-enroll-id=enroll --ca-enroll-secret=enrollpw --ca-type=admin
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Identity created successfully for ${orgName}${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to create identity for ${orgName}, but continuing...${NC}"
        return 0
    fi
}


function upload_chaincode_package() {
    local orgName=$1
    local chaincodePackagePath=$2
    local peerName=$3

    output=$(kubectl hlf chaincode install --path=$chaincodePackagePath \
    --config=network.yaml --language=golang --label=$CHAINCODE_LABEL --user=$orgName-admin-default --peer=$orgName-$peerName.default)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Chaincode package uploaded successfully to ${peerName} of ${orgName}${NC}"
    else
        echo -e "${RED}Failed to upload chaincode package to ${peerName} of ${orgName}${NC}"
        exit 1
    fi
}
function create_connection_file() {
    # Parse parameters properly
    local -a orgNames=()
    local ordererOrgName=""
    local channelName=""
    
    # First N-2 args are orgNames, last 2 are ordererOrgName and channelName
    while [ $# -gt 2 ]; do
        orgNames+=("$1")
        shift
    done
    ordererOrgName="$1"
    channelName="$2"
    
    echo -e "${GREEN}Creating connection profile...${NC}"
    echo -e "${GREEN}Organizations: ${orgNames[@]}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    echo -e "${GREEN}Channel: ${channelName}${NC}"
    echo
    
    # Build MSP list for -o flags (peer orgs + orderer org)
    local mspFlags=""
    for org in "${orgNames[@]}"; do
        mspFlags="${mspFlags} -o ${org}MSP"
    done
    mspFlags="${mspFlags} -o ${ordererOrgName}MSP"
    
    # Build identities list for --identities flags (only peer orgs, not orderer)
    local identitiesFlags=""
    for org in "${orgNames[@]}"; do
        identitiesFlags="${identitiesFlags} --identities=${org}-admin.default"
    done
    
    # Create a single network configuration with all organizations
    local connectionSecret="network-cp"
    
    echo -e "${YELLOW}Creating network configuration...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf networkconfig create --name=${connectionSecret}${mspFlags} -c ${channelName}${identitiesFlags} --secret=${connectionSecret}${NC}"
    echo
    
    kubectl hlf networkconfig create --name=${connectionSecret} \
        ${mspFlags} -c ${channelName} \
        ${identitiesFlags} --secret=${connectionSecret}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Connection profile created${NC}"
        echo
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}Connection Profile Details:${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}Secret Name: ${connectionSecret}${NC}"
        echo -e "${GREEN}Channel: ${channelName}${NC}"
        echo -e "${GREEN}Organizations: ${orgNames[@]} ${ordererOrgName}${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo
        echo -e "${YELLOW}To save connection profile to file:${NC}"
        echo -e "${YELLOW}kubectl get secret ${connectionSecret} -o jsonpath=\"{.data.config\\.yaml}\" | base64 --decode > ../generated_resources/network-config.yaml${NC}"
    else
        echo -e "${RED}Failed to create connection profile${NC}"
        exit 1
    fi
}

# Main script logic
subcommand=$1

if [ "$subcommand" == "help" ] || [ -z "$subcommand" ]; then
    show_help
    exit 0
fi

if [ "$subcommand" == "create-org-identity" ]; then
    shift
    orgName=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide --orgName.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$orgName" ]; then
        echo -e "${RED}Missing required option: --orgName${NC}"
        show_help
        exit 1
    fi
    
    create_org_identity "$orgName"
    
elif [ "$subcommand" == "connection-file" ]; then
    shift
    orgNames=()
    ordererOrgName=""
    channelName=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgNames+=("$2"); shift ;;
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            --channelName) channelName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ ${#orgNames[@]} -eq 0 ] || [ -z "$ordererOrgName" ] || [ -z "$channelName" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName (one or more), --ordererOrgName, and --channelName.${NC}"
        show_help
        exit 1
    fi
    
    create_connection_file "${orgNames[@]}" "$ordererOrgName" "$channelName"
elif [ "$subcommand" == "upload-chaincode-package" ]; then
    shift
    orgName=""
    chaincodePackagePath=""
    peerName=""
    
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            --chaincodePackagePath) chaincodePackagePath="$2"; shift ;;
            --peerName) peerName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$orgName" ] || [ -z "$chaincodePackagePath" ] || [ -z "$peerName" ]; then
        echo -e "${RED}Missing required options. Please provide --orgName, --chaincodePackagePath, and --peerName.${NC}"
        show_help
        exit 1
    fi
    
    upload_chaincode_package "$orgName" "$chaincodePackagePath" "$peerName" 
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi
