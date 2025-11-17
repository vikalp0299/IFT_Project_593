# Author: Vikalp Parashar
#!/bin/bash

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

subcommand=$1

function show_help() {
    echo -e "${YELLOW}Help - Channel Registration Handler Script${NC}"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  register_enroll_ordererMSP    Register and enroll orderer MSP"
    echo "  register_enroll_peerMSP       Register and enroll peer MSP"
    echo
    echo -e "${YELLOW}register_enroll_ordererMSP options:${NC}"
    echo "  --ordererOrgName    Name of the orderer organization (e.g., ord)"
    echo "  --username          Username for registration (e.g., admin)"
    echo "  --password          Password for registration (e.g., adminpw)"
    echo
    echo -e "Example:"
    echo "  $0 register_enroll_ordererMSP --ordererOrgName ord --username admin --password adminpw"
    echo
    echo -e "${YELLOW}register_enroll_peerMSP options:${NC}"
    echo "  --peerOrgName       Name of the peer organization (e.g., org1)"
    echo "  --username          Username for registration (e.g., admin)"
    echo "  --password          Password for registration (e.g., adminpw)"
    echo
    echo -e "Example:"
    echo "  $0 register_enroll_peerMSP --peerOrgName org1 --username admin --password adminpw"
    echo
    echo -e "${NC}"
    exit 1
}   
function register_and_enroll_ordererMSP () {
    echo "Registering and enrolling orderer MSP for organization: $1"

    local ordererOrgName=$1
    local userName=$2
    local userSecret=$3

    echo -e "${GREEN}Registering orderer MSP with the CA...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf ca register --name=$ordererOrgName-ca --user=$userName --secret=$userSecret --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=${ordererOrgName}MSP${NC}"
    output=$(kubectl hlf ca register --name=$ordererOrgName-ca --user=$userName --secret=$userSecret \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=${ordererOrgName}MSP)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Orderer MSP '${ordererOrgName}MSP' registered successfully with the CA.${NC}"
    else
        echo -e "${RED}Failed to register orderer MSP '${ordererOrgName}MSP' with the CA.${NC}"
    fi

    echo -e "${GREEN}Enrolling orderer MSP...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf identity create --name ${ordererOrgName}-admin-sign --namespace default --ca-name ${ordererOrgName}-ca --ca-namespace default --ca ca --mspid ${ordererOrgName}MSP --enroll-id $userName --enroll-secret $userSecret${NC}"
    output=$(kubectl hlf identity create --name ${ordererOrgName}-admin-sign --namespace default \
    --ca-name ${ordererOrgName}-ca --ca-namespace default \
    --ca ca --mspid ${ordererOrgName}MSP --enroll-id $userName --enroll-secret $userSecret)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Orderer MSP '${ordererOrgName}MSP' enrolled successfully.${NC}"
    else
        echo -e "${RED}Failed to enroll orderer MSP '${ordererOrgName}MSP'.${NC}"
    fi

    echo -e "${YELLOW}Command: kubectl hlf identity create --name ${ordererOrgName}-admin-tls --namespace default --ca-name ${ordererOrgName}-ca --ca-namespace default --ca tlsca --mspid ${ordererOrgName}MSP --enroll-id $userName --enroll-secret $userSecret${NC}"
    kubectl hlf identity create --name ${ordererOrgName}-admin-tls --namespace default \
    --ca-name ${ordererOrgName}-ca --ca-namespace default \
    --ca tlsca --mspid ${ordererOrgName}MSP --enroll-id $userName --enroll-secret $userSecret
}

function register_and_enroll_peerMSP () {
    echo "Registering and enrolling peer MSP for organization: $1"

    local peerOrgName=$1
    local userName=$2
    local userSecret=$3

    echo -e "${GREEN}Registering peer MSP with the CA...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf ca register --name=$peerOrgName-ca --namespace=default --user=$userName --secret=$userSecret --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=${peerOrgName}MSP${NC}"
    output=$(kubectl hlf ca register --name=$peerOrgName-ca --namespace=default --user=$userName --secret=$userSecret \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=${peerOrgName}MSP)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Peer MSP '${peerOrgName}MSP' registered successfully with the CA.${NC}"
    else
        echo -e "${RED}Failed to register peer MSP '${peerOrgName}MSP' with the CA.${NC}"
    fi

    echo -e "${GREEN}Enrolling peer MSP...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf identity create --name ${peerOrgName}-admin --namespace default --ca-name ${peerOrgName}-ca --ca-namespace default --ca ca --mspid ${peerOrgName}MSP --enroll-id $userName --enroll-secret $userSecret${NC}"
    output=$(kubectl hlf identity create --name ${peerOrgName}-admin --namespace default \
    --ca-name ${peerOrgName}-ca --ca-namespace default \
    --ca ca --mspid ${peerOrgName}MSP --enroll-id $userName --enroll-secret $userSecret
)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Peer MSP '${peerOrgName}MSP' enrolled successfully.${NC}"
    else
        echo -e "${RED}Failed to enroll peer MSP '${peerOrgName}MSP'.${NC}"
    fi

    
}  
# Main script logic
subcommand=$1
ordererOrgName=""
peerOrgName=""
userName=""
userSecret=""
if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "register_enroll_ordererMSP" ]; then
    shift   
    # Implement orderer MSP registration and enrollment logic here
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            --username) userName="$2"; shift ;;
            --password) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    register_and_enroll_ordererMSP "$ordererOrgName" "$userName" "$userSecret"
elif [ "$subcommand" == "register_enroll_peerMSP" ]; then
    shift   
    # Implement peer MSP registration and enrollment logic here
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --peerOrgName) peerOrgName="$2"; shift ;;
            --username) userName="$2"; shift ;;
            --password) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    register_and_enroll_peerMSP "$peerOrgName" "$userName" "$userSecret"
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi
