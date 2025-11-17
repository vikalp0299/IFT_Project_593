#Author: Vikalp Parashar
#!/bin/bash
source ./envVarsource.sh
source ./channelEnv.sh
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color   


function show_help() {
    echo -e "${YELLOW}Help - Channel Handler Script"     
    echo "Usage: $0 create-channel --channelName <name> --ordererOrgName <org> --creatorOrgName <org1,org2,...>"
    echo
    echo "Options:"
    echo "  --channelName       Name of the channel to create (e.g., demo)"
    echo "  --ordererOrgName    Name of the orderer organization (e.g., ord)"
    echo "  --creatorOrgName    Comma-separated list of creator/peer organizations (e.g., org1,org2,org3)"
    echo
    echo -e "Example:"
    echo "  $0 create-channel --channelName demo --ordererOrgName ord --creatorOrgName org1"
    echo "  $0 create-channel --channelName demo --ordererOrgName ord --creatorOrgName org1,org2,org3"
    echo -e "${NC}"
    exit 1
}

function create_channel() {
    local channelName=$1
    local ordererOrgName=$2
    local creatorOrgNames=$3
    
    echo -e "${GREEN}Creating channel: ${channelName}${NC}"
    echo -e "${GREEN}Orderer Organization: ${ordererOrgName}${NC}"
    echo -e "${GREEN}Creator Organizations: ${creatorOrgNames}${NC}"
    
    # Convert comma-separated list to array
    IFS=',' read -ra creatorOrgArray <<< "$creatorOrgNames"
    
    # Get orderer count dynamically
    ordererCount=$(kubectl get fabricorderernodes --all-namespaces --no-headers | wc -l)
    echo -e "${GREEN}Detected ${ordererCount} orderer nodes${NC}"
    
    # Build orderers section dynamically
    orderers_yaml=""
    external_orderers_yaml=""
    orderer_endpoints_yaml=""
    consenter_mapping_yaml=""
    
    for i in $(seq 0 $((ordererCount-1))); do
        ordererNodeName="${ordererOrgName}-node${i}"
        ordererHostName="node${i}-${ordererOrgName}.localho.st"
        
        # Get the TLS cert and sign cert for this orderer
        tls_cert_var="ORDERER${i}_TLS_CERT"
        sign_cert_var="ORDERER${i}_SIGN_CERT"
        tls_cert="${!tls_cert_var}"
        sign_cert="${!sign_cert_var}"
        
        # Add to orderers list
        orderers_yaml="${orderers_yaml}    - host: ${ordererNodeName}
      port: 7050
      tlsCert: |
${tls_cert}
"
        
        # Add to external orderers to join
        if [ $i -ge 0 ]; then
            external_orderers_yaml="${external_orderers_yaml}        - host: ${ordererNodeName}
          port: 7053
"
        fi
        
        # Add to orderer endpoints
        orderer_endpoints_yaml="${orderer_endpoints_yaml}        - ${ordererHostName}:443
"
        
        # Add to consenterMapping
        consenter_mapping_yaml="${consenter_mapping_yaml}      - host: ${ordererHostName}
        port: 443
        id: $((i+1))
        msp_id: ${ordererOrgName}MSP
        client_tls_cert: |
${tls_cert}

        server_tls_cert: |
${tls_cert}

        identity: |
${sign_cert}

"
    done
    
    # Build adminPeerOrganizations section
    admin_peer_orgs_yaml=""
    for org in "${creatorOrgArray[@]}"; do
        admin_peer_orgs_yaml="${admin_peer_orgs_yaml}    - mspID: ${org}MSP
"
    done
    
    # Build peerOrganizations section
    peer_orgs_yaml=""
    for org in "${creatorOrgArray[@]}"; do
        peer_orgs_yaml="${peer_orgs_yaml}    - mspID: ${org}MSP
      caName: \"${org}-ca\"
      caNamespace: \"default\"
"
    done
    
    # Build identities section for peer orgs
    peer_identities_yaml=""
    for org in "${creatorOrgArray[@]}"; do
        peer_identities_yaml="${peer_identities_yaml}    ${org}MSP:
      secretKey: user.yaml
      secretName: ${org}-admin
      secretNamespace: default
"
    done
    
    # Ensure generated_resources directory exists
    mkdir -p ../generated_resources
    
    # Generate the YAML and write to ../generated_resources/channel.yaml
    cat > ../generated_resources/channel.yaml <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricMainChannel
metadata:
  name: ${channelName}
spec:
  name: ${channelName}
  adminOrdererOrganizations:
    - mspID: ${ordererOrgName}MSP
  adminPeerOrganizations:
${admin_peer_orgs_yaml}
  channelConfig:
    application:
      acls: null
      capabilities:
        - V2_5
      policies: null
    capabilities:
      - V3_0
    orderer:
      batchSize:
        absoluteMaxBytes: 1048576
        maxMessageCount: 100
        preferredMaxBytes: 524288
      batchTimeout: 2s
      capabilities:
        - V2_0
      smartBFT:
        request_batch_max_count: 100
        request_batch_max_bytes: 10485760
        request_batch_max_interval: "50ms"
        incoming_message_buffer_size: 200
        request_pool_size: 100000
        request_forward_timeout: "2s"
        request_complain_timeout: "20s"
        request_auto_remove_timeout: "3m"
        view_change_resend_interval: "5s"
        view_change_timeout: "20s"
        leader_heartbeat_timeout: "1m0s"
        leader_heartbeat_count: 10
        collect_timeout: "1s"
        sync_on_start: true
        speed_up_view_change: false
        leader_rotation: 2
        decisions_per_leader: 3
        request_max_bytes: 0
      consenterMapping:
${consenter_mapping_yaml}
      ordererType: BFT
      policies: null
      state: STATE_NORMAL
    policies: null
  externalOrdererOrganizations: []
  peerOrganizations:
${peer_orgs_yaml}
  identities:
    ${ordererOrgName}MSP:
      secretKey: user.yaml
      secretName: ${ordererOrgName}-admin-tls
      secretNamespace: default
    ${ordererOrgName}MSP-sign:
      secretKey: user.yaml
      secretName: ${ordererOrgName}-admin-sign
      secretNamespace: default
${peer_identities_yaml}
  externalPeerOrganizations: []
  ordererOrganizations:
    - caName: "${ordererOrgName}-ca"
      caNamespace: "default"
      externalOrderersToJoin:
${external_orderers_yaml}
      mspID: ${ordererOrgName}MSP
      ordererEndpoints:
${orderer_endpoints_yaml}
      orderersToJoin: []
  orderers:
${orderers_yaml}
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Channel YAML written to ../generated_resources/channel.yaml successfully.${NC}"
        echo -e "${YELLOW}Applying channel configuration...${NC}"
        cat ../generated_resources/channel.yaml
        kubectl apply -f ../generated_resources/channel.yaml
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Channel configuration applied successfully${NC}"
        else
            echo -e "${RED}Failed to apply channel configuration${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Failed to write channel YAML to ../generated_resources/channel.yaml.${NC}"
        exit 1
    fi
}



# Main script logic
subcommand=$1
channelName=""
ordererOrgName=""
creatorOrgName=""

if [ "$subcommand" == "help" ]; then
    show_help
    exit 0
fi

if [ -z "$subcommand" ]; then
    echo -e "${RED}No command provided.${NC}"
    show_help
    exit 1
fi

if [ "$subcommand" == "create-channel" ]; then
    shift
    if [ $# -eq 0 ]; then
        echo -e "${YELLOW}No options provided. Please provide the required options.${NC}"
        show_help
        exit 1
    fi
    
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --channelName) channelName="$2"; shift ;;
            --ordererOrgName) ordererOrgName="$2"; shift ;;
            --creatorOrgName) creatorOrgName="$2"; shift ;;
            *) echo -e "${RED}Unknown parameter passed: $1${NC}"; show_help; exit 1 ;;
        esac
        shift
    done
    
    if [ -z "$channelName" ] || [ -z "$ordererOrgName" ] || [ -z "$creatorOrgName" ]; then
        echo -e "${RED}Missing required options. Please provide --channelName, --ordererOrgName, and --creatorOrgName.${NC}"
        show_help
        exit 1
    fi
    
    create_channel "$channelName" "$ordererOrgName" "$creatorOrgName"
else
    echo -e "${RED}Unknown command: $subcommand${NC}"
    show_help
    exit 1
fi