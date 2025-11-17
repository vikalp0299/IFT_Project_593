#Author : Vikalp Parashar
#!/bin/bash

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function orderer_ca(){
   
    local orgName=$1   
    echo "Creating Orderer CA for organization: $orgName"
    echo -e "${YELLOW}Command: kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=${orgName}-ca --enroll-id=enroll --enroll-pw=enrollpw --hosts=${orgName}-ca.localho.st --istio-port=443${NC}"
    output=$(kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=$STORAGE_CLASS --capacity=1Gi --name=${orgName}-ca \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=${orgName}-ca.localho.st --istio-port=443 & wait)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Orderer Certificate Authority deployed successfully.${NC}"
        echo -e "${YELLOW}Command: kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all${NC}"
        output=$(kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all) & wait

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Orderer CA is now running.${NC}"
        else
            echo -e "${RED}Orderer CA failed to reach running state within the timeout period.${NC}"
        fi
    else
        echo -e "${RED}Failed to deploy Orderer Certificate Authority.${NC}"
    fi

}

function register_user(){
    
    local orgName=$1
    local userName=$2
    local userSecret=$3
    echo "Registering user: $userName with password: $userSecret for organization: $orgName"
    echo -e "${YELLOW}Command: kubectl hlf ca register --name=${orgName}-ca --user=$userName --secret=$userSecret --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=${orgName}MSP --ca-url=\"https://${orgName}-ca.localho.st:443\"${NC}"
    output=$(kubectl hlf ca register --name=${orgName}-ca --user=$userName --secret=$userSecret \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=${orgName}MSP --ca-url="https://${orgName}-ca.localho.st:443") & wait
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}User '${userName}' registered successfully with the Orderer CA.${NC}"
    else
        echo -e "${RED}Failed to register user '${userName}' with the Orderer CA.${NC}"
    fi

}

function deploy_orderer(){
    local orgName=$1
    local ordererCount=$2
    local userName=$3
    local userSecret=$4

    for i in $(seq 0 $((ordererCount - 1))); do
        ordererName="$orgName-node$i"
        echo -e "${GREEN}Deploying Orderer Node: $ordererName...${NC}"
        echo -e "${YELLOW}Command: kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$STORAGE_CLASS --enroll-id=$userName --mspid=${orgName}MSP \
    --enroll-pw=$userSecret --capacity=2Gi --name=$ordererName --ca-name=${orgName}-ca.default \
    --hosts=node${i}-${orgName}.localho.st --admin-hosts=admin-orderer${i}-${orgName}.localho.st --istio-port=443${NC}"

        output=$(kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=$STORAGE_CLASS --enroll-id=$userName --mspid=${orgName}MSP \
    --enroll-pw=$userSecret --capacity=2Gi --name=$ordererName --ca-name=${orgName}-ca.default \
    --hosts=node${i}-${orgName}.localho.st --admin-hosts=admin-orderer${i}-${orgName}.localho.st --istio-port=443)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Orderer node '${ordererName}' deployed successfully.${NC}"

            echo -e "${GREEN}Waiting for orderer node to be ready...${NC}"
            echo -e "${YELLOW}Command: kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --all${NC}"
            output=$(kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --all & wait)

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Orderer node '${ordererName}' is now running.${NC}"

            else
                echo -e "${RED}Orderer node '${ordererName}' failed to reach running state within the timeout period.${NC}"
            fi

        else
            echo -e "${RED}Failed to deploy orderer node '${ordererName}'.${NC}"
        fi
    done
    echo "Deploying Orderer for organization: $orgName with orderer count: $ordererCount"

}

function show_help() {
    echo -e "${YELLOW}Help - Orderer Handler Script${NC}"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  create-ca          Create orderer Certificate Authority"
    echo "  register-user      Register user with the orderer CA"
    echo "  deploy-orderer     Deploy orderer node(s)"
    echo
    echo -e "${YELLOW}create-ca options:${NC}"
    echo "  --orgName       Name of the organization (e.g., ord)"
    echo
    echo -e "Example:"
    echo "  $0 create-ca --orgName ord"
    echo
    echo -e "${YELLOW}register-user options:${NC}"
    echo "  --orgName       Name of the organization (e.g., ord)"
    echo "  --username      Name of the user to register with the CA (e.g., orderer)"
    echo "  --password      Password for the user to register with the CA (e.g., ordererpw)"
    echo
    echo -e "Example:"
    echo "  $0 register-user --orgName ord --username orderer --password ordererpw"
    echo
    echo -e "${YELLOW}deploy-orderer options:${NC}"
    echo "  --orgName       Name of the organization (e.g., ord)"
    echo "  --ordererCount  Number of orderer nodes to deploy (e.g., 3)"
    echo "  --username      Name of the user to register with the CA (e.g., orderer)"
    echo "  --password      Password for the user to register with the CA (e.g., ordererpw)"    
    echo
    echo -e "Example:"
    echo "  $0 deploy-orderer --orgName ord --ordererCount 3 --username orderer --password ordererpw"
    echo
    echo -e "${NC}"
    exit 1

}

subcommand=$1
orgName=""
ordererCount=""
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

if [ "$subcommand" == "create-ca" ]; then
    shift
    # Implement CA creation logic here
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --org|--orgName) orgName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    orderer_ca "$orgName"
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
            --org|--orgName) orgName="$2"; shift ;;
            --username) userName="$2"; shift ;;
            --password) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    register_user "$orgName" "$userName" "$userSecret"
elif [ "$subcommand" == "deploy-orderer" ]; then
    shift
    # Implement orderer deployment logic here
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --org|--orgName) orgName="$2"; shift ;;
            --ordererCount) ordererCount="$2"; shift ;;
            --username) userName="$2"; shift ;;
            --password) userSecret="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    deploy_orderer "$orgName" "$ordererCount" "$userName" "$userSecret"
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi  

