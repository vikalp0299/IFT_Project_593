#Author: Vikalp Parashar
#!/bin/bash

# Source environment variables
source ./envVarsource.sh

#Deploying CA
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

subcommand=$1
orgName=""
userName=""
userSecret=""

function register_user() {
    local orgName=$1
    local userName=$2
    local userSecret=$3
    
    echo -e "${GREEN}Registering user with the CA...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf ca register --name=${orgName}-ca --user=${userName} --secret=${userSecret} --type=peer --enroll-id enroll --enroll-secret=enrollpw --mspid ${orgName}MSP${NC}"

    output=$(kubectl hlf ca register --name=${orgName}-ca --user=${userName} --secret=${userSecret} --type=peer \
        --enroll-id enroll --enroll-secret=enrollpw --mspid ${orgName}MSP)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}User '${userName}' registered successfully with the CA.${NC}"
    else
        echo -e "${RED}Failed to register user '${userName}' with the CA.${NC}"
    fi
}   

function deploy_ca() {
    local orgName=$1
    echo -e "${GREEN}Deploying Certificate Authority...${NC}"
    echo -e "${YELLOW}Command: kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=${orgName}-ca --enroll-id=enroll --enroll-pw=enrollpw --hosts=${orgName}-ca.localho.st --istio-port=443${NC}"

    output=$(kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=${orgName}-ca \
        --enroll-id=enroll --enroll-pw=enrollpw --hosts=${orgName}-ca.localho.st --istio-port=443 & wait)
    
    echo -e "${YELLOW}Command: kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all${NC}"
    output=$(kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all  & wait) 
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Certificate Authority deployed successfully.${NC}"
        test_connectivity
    else
        echo -e "${RED}Failed to deploy Certificate Authority.${NC}"
    fi
}
function test_connectivity() {
    echo -e "${GREEN}Testing connectivity to the CA...${NC}"
    echo -e "${YELLOW}Command: curl -k https://org1-ca.localho.st:443/cainfo${NC}"
    
    output=$(curl -k https://org1-ca.localho.st:443/cainfo & wait)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Connectivity to the CA verified successfully.${NC}"
    else
        echo -e "${RED}Failed to verify connectivity to the CA.${NC}"
    fi
}

function show_help() {
    echo -e "${YELLOW}Help - CA Handler Script${NC}"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  deploy-ca          Deploy Certificate Authority"
    echo "  register-user      Register a user with the CA"
    echo
    echo -e "${YELLOW}deploy-ca options:${NC}"
    echo "  --orgName         Name of the organization (e.g., org1)"
    echo
    echo -e "Example:"
    echo "  $0 deploy-ca --orgName org1"
    echo
    echo -e "${YELLOW}register-user options:${NC}"
    echo "  --orgName         Name of the organization (e.g., org1)"
    echo "  --userName        Name of the user to register (e.g., peer)"
    echo "  --userSecret      Secret/password for the user (e.g., peerpw)"
    echo
    echo -e "Example:"
    echo "  $0 register-user --orgName org1 --userName peer --userSecret peerpw"
    echo
    echo -e "${NC}"
    exit 1
}

if [ "$subcommand" == "help" ]; then
    show_help
    exit 0
fi
if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "deploy-ca" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
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

    # Set default values if not provided
    # orgName=${orgName:-org1}
    
    deploy_ca "$orgName" 
    wait
    
    exit 0
elif [ "$subcommand" == "register-user" ]; then
    shift   
    # Implement user registration logic here
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --orgName) orgName="$2"; shift ;;
            --userName) userName="$2"; shift ;;
            --userSecret) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    register_user "$orgName" "$userName" "$userSecret"
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi

#echo -e "${GREEN}Deploying Certificate Authority...${NC}"

