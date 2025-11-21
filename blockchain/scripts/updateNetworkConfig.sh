#!/bin/bash

# Script to add a user to the network-config.yaml file
# Usage: ./updateNetworkConfig.sh <username> <orgName> [namespace]

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 <username> <orgName> [namespace]"
    echo ""
    echo "Arguments:"
    echo "  username    - The username for the blockchain identity"
    echo "  orgName     - The organization name (e.g., sun, org, vik)"
    echo "  namespace   - Kubernetes namespace (default: default)"
    echo ""
    echo "Example:"
    echo "  $0 amaterasu sun"
    echo "  $0 testuser org default"
    exit 1
}

# Check if help is requested
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    usage
fi

# Validate arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    usage
fi

USERNAME="$1"
ORG_NAME="$2"
NAMESPACE="${3:-default}"

# Derive names
SECRET_NAME="${ORG_NAME}-${USERNAME}"
USER_IDENTITY="${ORG_NAME}-${USERNAME}-default"
MSP_ID="${ORG_NAME}MSP"

# Path to network-config.yaml
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NETWORK_CONFIG="${SCRIPT_DIR}/../generated_resources/network-config.yaml"

echo -e "${YELLOW}Adding user to network configuration...${NC}"
echo "Username:     $USERNAME"
echo "Organization: $ORG_NAME"
echo "Secret Name:  $SECRET_NAME"
echo "User ID:      $USER_IDENTITY"
echo "MSP ID:       $MSP_ID"
echo "Namespace:    $NAMESPACE"
echo ""

# Check if network-config.yaml exists
if [ ! -f "$NETWORK_CONFIG" ]; then
    echo -e "${RED}Error: network-config.yaml not found at $NETWORK_CONFIG${NC}"
    exit 1
fi

# Check if secret exists (with retry for timing issues)
echo -e "${YELLOW}Checking if secret exists...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0
SECRET_EXISTS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
        SECRET_EXISTS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "Waiting for secret to be available... (attempt $RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    fi
done

if [ "$SECRET_EXISTS" = false ]; then
    echo -e "${RED}Error: Secret $SECRET_NAME does not exist in namespace $NAMESPACE${NC}"
    echo "Please create the blockchain identity first using extraUser.sh"
    exit 1
fi
echo -e "${GREEN}✓ Secret $SECRET_NAME exists${NC}"

# Get certificate and key from the secret
echo -e "${YELLOW}Retrieving certificate and key...${NC}"
CERT_PEM=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.cert\.pem}' | base64 -d)
KEY_PEM=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.key\.pem}' | base64 -d)

if [ -z "$CERT_PEM" ] || [ -z "$KEY_PEM" ]; then
    echo -e "${RED}Error: Could not retrieve certificate or key from secret${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Certificate and key retrieved${NC}"

# Check if user already exists in config
if grep -q "${USER_IDENTITY}:" "$NETWORK_CONFIG"; then
    echo -e "${YELLOW}Warning: User $USER_IDENTITY already exists in network-config.yaml${NC}"
    echo -e "${YELLOW}User will be updated with new certificate and key${NC}"
    # User already exists, we'll update it by removing and re-adding
    # This will be handled by the insertion logic which finds the position
fi

# Update YAML using text manipulation (no Python dependencies needed)
echo -e "${YELLOW}Updating network-config.yaml...${NC}"

# Create a temporary file with the user entry
TMP_USER_ENTRY=$(mktemp)
cat > "$TMP_USER_ENTRY" <<EOF_USER
      ${USER_IDENTITY}:
        cert:
          pem: |
$(echo "$CERT_PEM" | sed 's/^/            /')
        key:
          pem: |
$(echo "$KEY_PEM" | sed 's/^/            /')
EOF_USER

# Check if user already exists and remove it
if grep -q "^      ${USER_IDENTITY}:" "$NETWORK_CONFIG"; then
    echo -e "${YELLOW}User ${USER_IDENTITY} already exists, updating...${NC}"
    # Create a temporary file without the old user entry
    TMP_CONFIG=$(mktemp)
    awk -v user="      ${USER_IDENTITY}:" '
    BEGIN { skip=0 }
    {
        if ($0 == user) {
            skip=1
            next
        }
        if (skip && /^      [a-z]/) {
            skip=0
        }
        if (!skip) print
    }
    ' "$NETWORK_CONFIG" > "$TMP_CONFIG"
    mv "$TMP_CONFIG" "$NETWORK_CONFIG"
fi

# Find the line number where we should insert the user (after "users:" in the organization)
LINE_NUM=$(grep -n "^  ${MSP_ID}:" "$NETWORK_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
    echo -e "${RED}Error: Could not find organization ${MSP_ID} in network-config.yaml${NC}"
    rm "$TMP_USER_ENTRY"
    exit 1
fi

# Find the users: line after the organization
USERS_LINE=$(tail -n +$LINE_NUM "$NETWORK_CONFIG" | grep -n "^    users:" | head -1 | cut -d: -f1)

if [ -z "$USERS_LINE" ]; then
    echo -e "${RED}Error: Could not find users section for ${MSP_ID}${NC}"
    rm "$TMP_USER_ENTRY"
    exit 1
fi

# Calculate actual line number for users: line
USERS_ACTUAL_LINE=$((LINE_NUM + USERS_LINE - 1))

# Find the last user entry before peers: or orderers: section
# We need to find where to insert: after the last user or right after users: if no users exist
INSERT_LINE=$USERS_ACTUAL_LINE

# Look for existing users (lines that start with "      " followed by a name and ":")
# and find the last one before we hit peers: or orderers:
TEMP_LINE=$((USERS_ACTUAL_LINE + 1))
TOTAL_LINES=$(wc -l < "$NETWORK_CONFIG")

while [ $TEMP_LINE -le $TOTAL_LINES ]; do
    LINE_CONTENT=$(sed -n "${TEMP_LINE}p" "$NETWORK_CONFIG")
    
    # Check if we've reached peers: or orderers: section
    if echo "$LINE_CONTENT" | grep -q "^    peers:\|^    orderers:"; then
        break
    fi
    
    # Check if this is a user entry (starts with 6 spaces, then word chars, then colon)
    if echo "$LINE_CONTENT" | grep -q "^      [a-z0-9-]*:"; then
        # Find the end of this user's definition
        SEARCH_LINE=$((TEMP_LINE + 1))
        while [ $SEARCH_LINE -le $TOTAL_LINES ]; do
            SEARCH_CONTENT=$(sed -n "${SEARCH_LINE}p" "$NETWORK_CONFIG")
            # If we hit another user or peers:/orderers:, we found the end
            if echo "$SEARCH_CONTENT" | grep -q "^      [a-z0-9-]*:\|^    peers:\|^    orderers:"; then
                INSERT_LINE=$((SEARCH_LINE - 1))
                break
            fi
            SEARCH_LINE=$((SEARCH_LINE + 1))
        done
        # If we didn't find the end, insert at the last line we searched
        if [ $SEARCH_LINE -gt $TOTAL_LINES ]; then
            INSERT_LINE=$TOTAL_LINES
        fi
        TEMP_LINE=$SEARCH_LINE
    else
        TEMP_LINE=$((TEMP_LINE + 1))
    fi
done

# Insert the user entry after the calculated position
TMP_CONFIG=$(mktemp)
head -n $INSERT_LINE "$NETWORK_CONFIG" > "$TMP_CONFIG"
cat "$TMP_USER_ENTRY" >> "$TMP_CONFIG"
tail -n +$((INSERT_LINE + 1)) "$NETWORK_CONFIG" >> "$TMP_CONFIG"
mv "$TMP_CONFIG" "$NETWORK_CONFIG"

rm "$TMP_USER_ENTRY"
echo "Successfully added user $USER_IDENTITY to network-config.yaml"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ User $USER_IDENTITY successfully added to network-config.yaml${NC}"
    echo ""
    echo "You can now use this user with kubectl hlf commands:"
    echo -e "${YELLOW}kubectl hlf chaincode invoke --config=../generated_resources/network-config.yaml \\"
    echo "    --user=$USER_IDENTITY --peer=${ORG_NAME}-peer0.default \\"
    echo "    --chaincode=asset --channel=test \\"
    echo "    --fcn=SomeFunction${NC}"
else
    echo -e "${RED}Error: Failed to update network-config.yaml${NC}"
    exit 1
fi
