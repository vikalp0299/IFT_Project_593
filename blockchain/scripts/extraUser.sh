#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show help
show_help() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Extra User Identity Creation Script${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 --username <username> --orgName <org> [options]"
    echo
    echo -e "${YELLOW}Required Parameters:${NC}"
    echo "  --username       Username for the identity"
    echo "  --orgName        Organization name (e.g., org, vik, sun)"
    echo
    echo -e "${YELLOW}Optional Parameters:${NC}"
    echo "  --password       Password for enrollment (default: userpw)"
    echo "  --namespace      Kubernetes namespace (default: default)"
    echo "  --caEnrollId     CA enrollment ID (default: enroll)"
    echo "  --caEnrollSecret CA enrollment secret (default: enrollpw)"
    echo "  --caType         CA type (default: admin)"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo "  # Create user identity for user 'john' in organization 'org'"
    echo "  $0 --username john --orgName org"
    echo
    echo "  # Create user identity with custom password"
    echo "  $0 --username jane --orgName vik --password jane123"
    echo
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

# Default values
namespace="default"
password="userpw"
caEnrollId="enroll"
caEnrollSecret="enrollpw"
caType="admin"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --username) username="$2"; shift ;;
        --orgName) orgName="$2"; shift ;;
        --password) password="$2"; shift ;;
        --namespace) namespace="$2"; shift ;;
        --caEnrollId) caEnrollId="$2"; shift ;;
        --caEnrollSecret) caEnrollSecret="$2"; shift ;;
        --caType) caType="$2"; shift ;;
        *) echo -e "${RED}Unknown parameter: $1${NC}"; show_help; exit 1 ;;
    esac
    shift
done

# Validate required parameters
if [ -z "$username" ] || [ -z "$orgName" ]; then
    echo -e "${RED}Error: Missing required parameters${NC}"
    echo -e "${YELLOW}Username and orgName are required${NC}"
    show_help
    exit 1
fi

# Derive values from orgName
caName="${orgName}-ca"
mspId="${orgName}MSP"
identityName="${orgName}-${username}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Creating Blockchain Identity${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Username:${NC}          ${username}"
echo -e "${BLUE}Organization:${NC}      ${orgName}"
echo -e "${BLUE}Identity Name:${NC}     ${identityName}"
echo -e "${BLUE}CA Name:${NC}           ${caName}"
echo -e "${BLUE}MSP ID:${NC}            ${mspId}"
echo -e "${BLUE}Namespace:${NC}         ${namespace}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if CA exists
echo -e "${BLUE}Checking if CA ${caName} exists...${NC}"
echo -e "${YELLOW}Command: kubectl get fabriccas ${caName} -n ${namespace}${NC}"
if ! kubectl get fabriccas ${caName} -n ${namespace} &>/dev/null; then
    echo -e "${RED}Error: CA '${caName}' does not exist in namespace '${namespace}'${NC}"
    echo -e "${YELLOW}Please ensure the organization CA is created first${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CA ${caName} exists${NC}"
echo

# Step 1: Register user in CA
echo -e "${BLUE}Step 1: Registering user ${username} in CA ${caName}...${NC}"
echo -e "${YELLOW}Executing command:${NC}"
echo "kubectl hlf ca register --name ${caName} --user ${username} --secret ${password} \\"
echo "    --type client --enroll-id ${caEnrollId} --enroll-secret ${caEnrollSecret} --mspid ${mspId}"
echo

kubectl hlf ca register --name ${caName} --user ${username} --secret ${password} \
    --type client --enroll-id ${caEnrollId} --enroll-secret ${caEnrollSecret} --mspid ${mspId}

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ User registration might have failed or user already exists${NC}"
    echo -e "${BLUE}Continuing with identity creation...${NC}"
    echo
fi

echo -e "${GREEN}✓ User registration step completed${NC}"
echo

# Step 2: Create the identity (enrollment)
echo -e "${BLUE}Step 2: Creating blockchain identity (enrolling user ${username})...${NC}"
echo -e "${BLUE}Checking if identity ${identityName} already exists...${NC}"
echo -e "${YELLOW}Command: kubectl get secret ${identityName} -n ${namespace}${NC}"
if kubectl get secret ${identityName} -n ${namespace} &>/dev/null; then
    echo -e "${YELLOW}⚠ Identity '${identityName}' already exists${NC}"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Deleting existing identity...${NC}"
        echo -e "${YELLOW}Command: kubectl delete secret ${identityName} -n ${namespace}${NC}"
        kubectl delete secret ${identityName} -n ${namespace}
        echo -e "${GREEN}✓ Existing identity deleted${NC}"
    else
        echo -e "${YELLOW}Identity creation cancelled${NC}"
        exit 0
    fi
fi

# Create the identity
echo -e "${BLUE}Creating blockchain identity for user ${username}...${NC}"
echo -e "${YELLOW}Executing command:${NC}"
echo "kubectl hlf identity create --name ${identityName} --namespace ${namespace} \\"
echo "    --ca-name ${caName} --ca-namespace ${namespace} \\"
echo "    --ca ca --mspid ${mspId} --enroll-id ${username} --enroll-secret ${password} \\"
echo "    --ca-enroll-id=${caEnrollId} --ca-enroll-secret=${caEnrollSecret} --ca-type=${caType}"
echo

kubectl hlf identity create --name ${identityName} --namespace ${namespace} \
    --ca-name ${caName} --ca-namespace ${namespace} \
    --ca ca --mspid ${mspId} --enroll-id ${username} --enroll-secret ${password} \
    --ca-enroll-id=${caEnrollId} --ca-enroll-secret=${caEnrollSecret} --ca-type=${caType}

if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ Identity Created Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}Identity Details:${NC}"
    echo -e "  Name:          ${identityName}"
    echo -e "  Username:      ${username}"
    echo -e "  Organization:  ${orgName}"
    echo -e "  MSP ID:        ${mspId}"
    echo -e "  Secret Name:   ${identityName}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}This identity can now be used to:${NC}"
    echo "  - Upload files to the blockchain"
    echo "  - Query blockchain data"
    echo "  - Interact with chaincode as user: ${username}"
    echo
    
    # Update network-config.yaml automatically
    echo -e "${YELLOW}Step 3: Updating network-config.yaml...${NC}"
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    UPDATE_SCRIPT="${SCRIPT_DIR}/updateNetworkConfig.sh"
    
    if [ -f "$UPDATE_SCRIPT" ]; then
        echo "Adding user to network configuration file..."
        if "$UPDATE_SCRIPT" "$username" "$orgName" "$namespace"; then
            echo -e "${GREEN}✓ Network configuration updated${NC}"
        else
            echo -e "${YELLOW}Warning: Failed to update network-config.yaml${NC}"
            echo -e "${YELLOW}You may need to add the user manually or run:${NC}"
            echo -e "${YELLOW}  ./updateNetworkConfig.sh $username $orgName $namespace${NC}"
        fi
    else
        echo -e "${YELLOW}Note: updateNetworkConfig.sh not found${NC}"
        echo -e "${YELLOW}User identity created but not added to network-config.yaml${NC}"
        echo -e "${YELLOW}To add manually, run:${NC}"
        echo -e "${YELLOW}  ./updateNetworkConfig.sh $username $orgName $namespace${NC}"
    fi
    echo
    
    exit 0
else
    echo
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Identity Creation Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${YELLOW}Please check the error messages above${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  - CA ${caName} not found or not ready"
    echo "  - User ${username} not registered in CA"
    echo "  - Incorrect credentials"
    echo
    exit 1
fi
