#!/bin/bash
#Author: Vikalp Parashar

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${YELLOW}Help - Follower Channel Handler Script"     
    echo "Usage: $0 join-channel --channelName <name> --mainChannelName <name> --orgName <org> --ordererOrgName <org> [--ordererNode <node>] [--dryRun]"
    echo
    echo "Options:"
    echo "  --channelName       Name of the follower channel resource (e.g., demo)"
    echo "  --mainChannelName   Name of the main channel to join (e.g., test)"
    echo "  --orgName           Single peer organization joining (e.g., org1)"
    echo "  --ordererOrgName    Name of the orderer organization (e.g., ord)"
    echo "  --ordererNode       Orderer node number to use (default: 0, e.g., 0, 1, 2)"
    echo "  --dryRun            Optional: Only generate YAML file, do not apply to cluster"
    echo
    echo -e "Example:"
    echo "  $0 join-channel --channelName demo --mainChannelName test --orgName org1 --ordererOrgName ord"
    echo "  $0 join-channel --channelName demo --mainChannelName test --orgName org2 --ordererOrgName ord --ordererNode 1"
    echo "  $0 join-channel --channelName demo --mainChannelName test --orgName org1 --ordererOrgName ord --dryRun"
    echo -e "${NC}"
    exit 1
}

function join_channel() {
    local channelName=$1
    local mainChannelName=$2
    local orgName=$3
    local ordererOrgName=$4
    local ordererNode=${5}
    local dryRun=${6}
    
    echo -e "${GREEN}Follower Channel Name: ${channelName}${NC}"
    echo -e "${GREEN}Main Channel Name: ${mainChannelName}${NC}"
    echo -e "${GREEN}Organization: ${orgName}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    if [ "$dryRun" == "true" ]; then
        echo -e "${YELLOW}Mode: Dry Run (YAML only, no apply)${NC}"
    fi
    
    # Count peers for the organization
    peerCount=$(kubectl get fabricpeers --all-namespaces --no-headers | grep "${orgName}-peer" | wc -l)
    echo -e "${GREEN}Detected ${peerCount} peer nodes for ${orgName}${NC}"
    
    # Get orderer count and show available orderers
    ordererCount=$(kubectl get fabricorderernodes --all-namespaces --no-headers | wc -l)
    echo -e "${GREEN}Detected ${ordererCount} orderer nodes${NC}"
    
    # If ordererNode not specified, show interactive menu
    if [ -z "$ordererNode" ]; then
        echo -e "${YELLOW}Available orderer nodes:${NC}"
        for i in $(seq 0 $((ordererCount-1))); do
            echo -e "${YELLOW}  [$i] ${ordererOrgName}-node${i}${NC}"
        done
        echo -e "${GREEN}Select orderer node [0-$((ordererCount-1))]:${NC} "
        read ordererNode
        
        # Validate input
        if ! [[ "$ordererNode" =~ ^[0-9]+$ ]] || [ "$ordererNode" -ge "$ordererCount" ] || [ "$ordererNode" -lt 0 ]; then
            echo -e "${RED}Invalid orderer node selection. Using default: 0${NC}"
            ordererNode=0
        fi
    fi
    
    # Use specified orderer node
    ordererNodeName="${ordererOrgName}-node${ordererNode}"
    echo -e "${GREEN}Using orderer: ${ordererNodeName}${NC}"
    
    # Build anchor peers section for this organization
    anchor_peers_yaml=""
    for i in $(seq 0 $((peerCount-1))); do
        anchor_peers_yaml="${anchor_peers_yaml}    - host: ${orgName}-peer${i}.default
      port: 7051
"
    done
    
    # Build peers to join section for this organization
    peers_to_join_yaml=""
    for i in $(seq 0 $((peerCount-1))); do
        peers_to_join_yaml="${peers_to_join_yaml}    - name: ${orgName}-peer${i}
      namespace: default
"
    done
    
    # MSP ID for this org
    mspId=${orgName}MSP
    
    # Get TLS certificate for the selected orderer node
    export IDENT_8=$(printf "%8s" "")
    echo -e "${YELLOW}Command: kubectl get fabricorderernodes ${ordererNodeName} -o=jsonpath='{.status.tlsCert}'${NC}"
    tls_cert=$(kubectl get fabricorderernodes ${ordererNodeName} -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/")
    
    orderers_yaml="    - certificate: |
${tls_cert}
      url: grpcs://${ordererNodeName}.default:7050
"
    
    # Ensure generated_resources directory exists
    mkdir -p ../generated_resources
    
    # Generate FabricFollowerChannel YAML
    cat > ../generated_resources/follower-channel.yaml <<EOF
---
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: ${channelName}-${orgName}msp
spec:
  anchorPeers:
${anchor_peers_yaml}
  hlfIdentity:
    secretKey: user.yaml
    secretName: ${orgName}-admin
    secretNamespace: default
  mspId: ${mspId}
  name: ${mainChannelName}
  externalPeersToJoin: []
  orderers:
${orderers_yaml}
  peersToJoin:
${peers_to_join_yaml}
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Follower Channel YAML written to ../generated_resources/follower-channel.yaml successfully.${NC}"
        
        if [ "$dryRun" == "true" ]; then
            echo -e "${YELLOW}Dry run mode: Skipping kubectl apply${NC}"
            echo -e "${GREEN}✓ YAML file generated: ../generated_resources/follower-channel.yaml${NC}"
        else
            echo -e "${GREEN}Applying follower channel configuration...${NC}"
            kubectl apply -f ../generated_resources/follower-channel.yaml
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Follower channel configuration applied successfully for ${orgName}${NC}"
            else
                echo -e "${RED}Failed to apply follower channel configuration${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${RED}Failed to write follower channel YAML to ../generated_resources/follower-channel.yaml.${NC}"
        exit 1
    fi
}

# Main script logic
subcommand=$1
channelName=""
mainChannelName=""
orgName=""
ordererOrgName=""
ordererNode="0"
dryRun="false"

if [ "$subcommand" == "help" ]; then
    show_help
    exit 0
fi

if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "join-channel" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
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
    
    join_channel "$channelName" "$mainChannelName" "$orgName" "$ordererOrgName" "$ordererNode" "$dryRun"
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi
