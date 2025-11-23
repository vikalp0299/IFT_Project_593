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
    echo -e "${GREEN}Chaincode Function Script${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 --configFile <config> --orgName <org> --peerName <peer> --channelName <channel> --chaincode <name> --fcn <function> [options]"
    echo
    echo -e "${YELLOW}Required Parameters:${NC}"
    echo "  --configFile     Path to network config YAML"
    echo "  --orgName        Organization admin name"
    echo "  --peerName       Peer name"
    echo "  --channelName    Channel name"
    echo "  --chaincode      Chaincode name"
    echo "  --fcn            Function to execute (InitLedger, GetAllFiles, CreateFile, ProposeEdit, ApproveEdit, RejectEdit)"
    echo
    echo -e "${YELLOW}Function-Specific Parameters:${NC}"
    echo
    echo -e "${BLUE}InitLedger:${NC}"
    echo "  No additional parameters required"
    echo
    echo -e "${BLUE}GetAllFiles:${NC}"
    echo "  --args           Optional query arguments (default: '[]')"
    echo
    echo -e "${BLUE}CreateFile:${NC}"
    echo "  --fileId         File identifier"
    echo "  --filename       File name"
    echo "  --ipfsCid        IPFS content identifier"
    echo "  --size           File size in bytes"
    echo "  --allowedOrgsStr Comma-separated org list (e.g., vikMSP,sunMSP)"
    echo "                   Will be converted to JSON array [\"vikMSP\",\"sunMSP\"]"
    echo "  --multiSigRequired  true/false (optional, default: false)"
    echo "  --createdAt      ISO timestamp (optional, will auto-generate if not provided)"
    echo "  --requiredOrgsStr   Comma-separated org list for required approvals (optional)"
    echo "  --metadata       JSON metadata string (optional)"
    echo
    echo -e "${BLUE}UpdateFile (used for both proposing and approving edits):${NC}"
    echo "  --fileId         File identifier to edit"
    echo "  --ipfsCid        New IPFS CID (or proposal data as JSON string)"
    echo "  --size           New file size in bytes"
    echo "  --metadata       Optional metadata (JSON string)"
    echo
    echo
    echo -e "${BLUE}ApproveEdit:${NC}"
    echo "  --fileId         File identifier"
    echo "  --proposalId     Proposal ID to approve"
    echo "  --approver       Approver's MSP ID (e.g., sunMSP)"
    echo
    echo -e "${BLUE}RejectEdit:${NC}"
    echo "  --fileId         File identifier"
    echo "  --proposalId     Proposal ID to reject"
    echo "  --rejector       Rejector's MSP ID (e.g., sunMSP)"
    echo "  --reason         Reason for rejection (optional)"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo "  # Initialize Ledger"
    echo "  $0 --configFile ../generated_resources/network-config.yaml \\"
    echo "     --orgName vik-admin-default --peerName vik-peer0.default \\"
    echo "     --channelName test --chaincode asset --fcn InitLedger"
    echo
    echo "  # Get All Files"
    echo "  $0 --configFile ../generated_resources/network-config.yaml \\"
    echo "     --orgName vik-admin-default --peerName vik-peer0.default \\"
    echo "     --channelName test --chaincode asset --fcn GetAllFiles"
    echo
    echo "  # Create File"
    echo "  $0 --configFile ../generated_resources/network-config.yaml \\"
    echo "     --orgName vik-admin-default --peerName vik-peer0.default \\"
    echo "     --channelName test --chaincode asset --fcn CreateFile \\"
    echo "     --fileId file123 --filename document.pdf --ipfsCid QmXyz123 \\"
    echo "     --size 1024 --allowedOrgsStr vikMSP,sunMSP"
    echo
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --configFile) configFile="$2"; shift ;;
        --orgName) orgName="$2"; shift ;;
        --peerName) peerName="$2"; shift ;;
        --channelName) channelName="$2"; shift ;;
        --chaincode) chaincode="$2"; shift ;;
        --fcn) fcn="$2"; shift ;;
        --args) args="$2"; shift ;;
        --fileId) fileId="$2"; shift ;;
        --filename) filename="$2"; shift ;;
        --ipfsCid) ipfsCid="$2"; shift ;;
        --size) size="$2"; shift ;;
        --allowedOrgsStr) allowedOrgsStr="$2"; shift ;;
        --multiSigRequired) multiSigRequired="$2"; shift ;;
        --createdAt) createdAt="$2"; shift ;;
        --requiredOrgsStr) requiredOrgsStr="$2"; shift ;;
        --metadata) metadata="$2"; shift ;;
        --newContent) newContent="$2"; shift ;;
        --proposer) proposer="$2"; shift ;;
        --proposalId) proposalId="$2"; shift ;;
        --approver) approver="$2"; shift ;;
        --rejector) rejector="$2"; shift ;;
        --reason) reason="$2"; shift ;;
        --proposedAt) proposedAt="$2"; shift ;;
        *) echo -e "${RED}Unknown parameter: $1${NC}"; show_help; exit 1 ;;
    esac
    shift
done

# Validate required parameters
if [ -z "$configFile" ] || [ -z "$orgName" ] || [ -z "$peerName" ] || [ -z "$channelName" ] || [ -z "$chaincode" ] || [ -z "$fcn" ]; then
    echo -e "${RED}Error: Missing required parameters${NC}"
    show_help
    exit 1
fi

# Execute based on function
case "$fcn" in
    InitLedger)
        echo -e "${GREEN}Initializing ledger...${NC}"
        kubectl hlf chaincode invoke --config="${configFile}" \
            --user="${orgName}" --peer="${peerName}" \
            --chaincode="${chaincode}" --channel="${channelName}" \
            --fcn=InitLedger
        ;;
        
    GetAllFiles)
        echo -e "${GREEN}Retrieving all files...${NC}"
        
        # Default args if not provided
        if [ -z "$args" ]; then
            args="[]"
        fi
        
        # Execute query and format with jq
        output=$(kubectl hlf chaincode query --config="${configFile}" \
            --user="${orgName}" --peer="${peerName}" \
            --chaincode="${chaincode}" --channel="${channelName}" \
            --fcn=GetAllFiles -a "${args}")
        
        echo -e "${BLUE}Files retrieved:${NC}"
        
        # Check if jq is available
        if command -v jq &> /dev/null; then
            echo "$output" | jq '.'
        else
            echo "$output"
        fi
        
        echo -e "${GREEN}✓ GetAllFiles completed${NC}"
        ;;
        
    CreateFile)
        # Validate CreateFile parameters
        if [ -z "$fileId" ] || [ -z "$filename" ] || [ -z "$ipfsCid" ] || [ -z "$size" ] || [ -z "$allowedOrgsStr" ]; then
            echo -e "${RED}Error: CreateFile requires --fileId, --filename, --ipfsCid, --size, and --allowedOrgsStr${NC}"
            show_help
            exit 1
        fi
        
        # Set defaults for optional parameters
        if [ -z "$multiSigRequired" ]; then
            multiSigRequired="false"
        fi
        if [ -z "$createdAt" ]; then
            createdAt=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        fi
        if [ -z "$requiredOrgsStr" ]; then
            requiredOrgsStr=""
        fi
        if [ -z "$metadata" ]; then
            metadata="{}"
        fi
        
        # Convert comma-separated org lists to JSON array format
        # Input: vikMSP,sunMSP  -> Output: ["vikMSP","sunMSP"]
        IFS=',' read -ra ALLOWED_ORGS <<< "$allowedOrgsStr"
        allowedOrgsJson="["
        for i in "${!ALLOWED_ORGS[@]}"; do
            if [ $i -gt 0 ]; then
                allowedOrgsJson+=","
            fi
            allowedOrgsJson+="\"${ALLOWED_ORGS[$i]}\""
        done
        allowedOrgsJson+="]"
        
        # Convert requiredOrgs if provided
        if [ -n "$requiredOrgsStr" ]; then
            IFS=',' read -ra REQUIRED_ORGS <<< "$requiredOrgsStr"
            requiredOrgsJson="["
            for i in "${!REQUIRED_ORGS[@]}"; do
                if [ $i -gt 0 ]; then
                    requiredOrgsJson+=","
                fi
                requiredOrgsJson+="\"${REQUIRED_ORGS[$i]}\""
            done
            requiredOrgsJson+="]"
        else
            requiredOrgsJson="[]"
        fi
        
        echo -e "${GREEN}Creating file in ledger...${NC}"
        echo -e "${BLUE}Parameters:${NC}"
        echo -e "  fileId: ${fileId}"
        echo -e "  filename: ${filename}"
        echo -e "  ipfsCid: ${ipfsCid}"
        echo -e "  size: ${size}"
        echo -e "  allowedOrgs: ${allowedOrgsJson}"
        echo -e "  multiSigRequired: ${multiSigRequired}"
        echo -e "  createdAt: ${createdAt}"
        echo -e "  requiredOrgs: ${requiredOrgsJson}"
        echo -e "  metadata: ${metadata}"
        
        # Invoke CreateFile chaincode
        # Parameters: fileId, filename, ipfsCid, size, allowedOrgs, multiSigRequired, createdAt, requiredOrgs, metadata
        kubectl hlf chaincode invoke --config="${configFile}" \
            --user="${orgName}" --peer="${peerName}" \
            --chaincode="${chaincode}" --channel="${channelName}" \
            --fcn=CreateFile \
            -a "${fileId}" \
            -a "${filename}" \
            -a "${ipfsCid}" \
            -a "${size}" \
            -a "${allowedOrgsJson}" \
            -a "${multiSigRequired}" \
            -a "${createdAt}" \
            -a "${requiredOrgsJson}" \
            -a "${metadata}"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ File created successfully${NC}"
        else
            echo -e "${RED}✗ File creation failed${NC}"
            exit 1
        fi
        ;;
    
    UpdateFile)
        echo -e "${GREEN}Updating file (propose/approve edit)...${NC}"
        
        # Validate required parameters
        if [ -z "$fileId" ] || [ -z "$ipfsCid" ] || [ -z "$size" ]; then
            echo -e "${RED}Error: Missing required parameters for UpdateFile${NC}"
            echo -e "${YELLOW}Required: --fileId, --ipfsCid, --size${NC}"
            exit 1
        fi
        
        # Extract proposedAt timestamp from metadata JSON if not explicitly provided
        if [ -z "$proposedAt" ] && [ -n "$metadata" ]; then
            proposedAt=$(echo "$metadata" | grep -o '"proposedAt":"[^"]*"' | cut -d'"' -f4)
        fi
        
        echo -e "${BLUE}Parameters:${NC}"
        echo -e "  fileId: ${fileId}"
        echo -e "  ipfsCid: ${ipfsCid}"
        echo -e "  size: ${size}"
        [ -n "$metadata" ] && echo -e "  metadata: ${metadata}"
        [ -n "$proposedAt" ] && echo -e "  proposedAt: ${proposedAt}"
        
        # Always pass 5 parameters when metadata is present (chaincode expects 5 params)
        if [ -n "$metadata" ]; then
            # Use empty string for proposedAt if not available
            timestamp="${proposedAt:-}"
            echo -e "${YELLOW}Executing: kubectl hlf chaincode invoke --config=\"${configFile}\" --user=\"${orgName}\" --peer=\"${peerName}\" --chaincode=\"${chaincode}\" --channel=\"${channelName}\" --fcn=UpdateFile -a \"${fileId}\" -a \"${ipfsCid}\" -a \"${size}\" -a \"${metadata}\" -a \"${timestamp}\"${NC}"
            kubectl hlf chaincode invoke --config="${configFile}" \
                --user="${orgName}" --peer="${peerName}" \
                --chaincode="${chaincode}" --channel="${channelName}" \
                --fcn=UpdateFile \
                -a "${fileId}" \
                -a "${ipfsCid}" \
                -a "${size}" \
                -a "${metadata}" \
                -a "${timestamp}"
        else
            echo -e "${YELLOW}Executing: kubectl hlf chaincode invoke --config=\"${configFile}\" --user=\"${orgName}\" --peer=\"${peerName}\" --chaincode=\"${chaincode}\" --channel=\"${channelName}\" --fcn=UpdateFile -a \"${fileId}\" -a \"${ipfsCid}\" -a \"${size}\"${NC}"
            kubectl hlf chaincode invoke --config="${configFile}" \
                --user="${orgName}" --peer="${peerName}" \
                --chaincode="${chaincode}" --channel="${channelName}" \
                --fcn=UpdateFile \
                -a "${fileId}" \
                -a "${ipfsCid}" \
                -a "${size}"
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ UpdateFile executed successfully${NC}"
        else
            echo -e "${RED}✗ UpdateFile failed${NC}"
            exit 1
        fi
        ;;
    
    ApproveEdit)
        echo -e "${GREEN}Approving edit proposal...${NC}"
        
        # Validate required parameters
        if [ -z "$fileId" ] || [ -z "$proposalId" ]; then
            echo -e "${RED}Error: Missing required parameters for ApproveEdit${NC}"
            echo -e "${YELLOW}Required: --fileId, --proposalId${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Parameters:${NC}"
        echo -e "  fileId: ${fileId}"
        echo -e "  proposalId: ${proposalId}"
        
        echo -e "${YELLOW}Executing: kubectl hlf chaincode invoke --config=\"${configFile}\" --user=\"${orgName}\" --peer=\"${peerName}\" --chaincode=\"${chaincode}\" --channel=\"${channelName}\" --fcn=ApproveEdit -a \"${fileId}\" -a \"${proposalId}\"${NC}"
        
        # Invoke ApproveEdit chaincode (only needs fileId and proposalId)
        kubectl hlf chaincode invoke --config="${configFile}" \
            --user="${orgName}" --peer="${peerName}" \
            --chaincode="${chaincode}" --channel="${channelName}" \
            --fcn=ApproveEdit \
            -a "${fileId}" \
            -a "${proposalId}"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ ApproveEdit executed successfully${NC}"
        else
            echo -e "${RED}✗ ApproveEdit failed${NC}"
            exit 1
        fi
        ;;
    
    RejectEdit)
        echo -e "${GREEN}Rejecting edit proposal...${NC}"
        
        # Validate required parameters  
        if [ -z "$fileId" ]; then
            echo -e "${RED}Error: Missing required parameter for RejectEdit${NC}"
            echo -e "${YELLOW}Required: --fileId${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Parameters:${NC}"
        echo -e "  fileId: ${fileId}"
        
        # Invoke RejectEdit chaincode (only needs fileId)
        kubectl hlf chaincode invoke --config="${configFile}" \
            --user="${orgName}" --peer="${peerName}" \
            --chaincode="${chaincode}" --channel="${channelName}" \
            --fcn=RejectEdit \
            -a "${fileId}"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Edit proposal rejected successfully${NC}"
        else
            echo -e "${RED}✗ Edit rejection failed${NC}"
            exit 1
        fi
        ;;
        
    *)
        echo -e "${RED}Error: Unknown function '${fcn}'${NC}"
        echo -e "${YELLOW}Supported functions: InitLedger, GetAllFiles, CreateFile, ProposeEdit, ApproveEdit, RejectEdit${NC}"
        show_help
        exit 1
        ;;
esac