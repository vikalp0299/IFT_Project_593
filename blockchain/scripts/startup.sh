#Author: Vikalp Parashar
#!/bin/bash

# Source environment variables
source ./envVarsource.sh

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

#Cleaning up any previous cluster
echo -e "${GREEN}Cleaning up any previous cluster...${NC}"
echo -e "${YELLOW}Command: kind delete cluster${NC}"
output=$(kind delete cluster & wait)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Previous cluster deleted successfully.${NC}"
else
    echo -e "${YELLOW}No previous cluster to delete or deletion failed.${NC}"
fi

# Start the application
echo -e "${GREEN}Starting the application...${NC}"
echo -e "${YELLOW}Command: kind create cluster --config=../setup/kind-config.yaml${NC}"

output=$(kind create cluster --config=../setup/kind-config.yaml & wait)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Cluster created successfully.${NC}"
else
    echo -e "${RED}Failed to create cluster.${NC}"
fi


#Setting Istio binaries on the machine
echo -e "${GREEN}Setting Istio binaries path...${NC}"
export PATH="$PATH:$PWD/../istio-1.20.0/bin"
echo -e "${GREEN}Istio binaries path set to: $PWD/../istio-1.20.0/bin${NC}"


#Installing Istio on the cluster
echo -e "${GREEN}Installing Istio on the cluster...${NC}"
echo -e "${YELLOW}Command: kubectl create namespace istio-system${NC}"

output=$(kubectl create namespace istio-system & wait)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Namespace 'istio-system' created successfully.${NC}"
else
    echo -e "${YELLOW}Namespace 'istio-system' may already exist.${NC}"
fi
echo -e "${YELLOW}Command: istioctl operator init${NC}"
output=$(istioctl operator init & wait)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Istio operator initialized successfully.${NC}"
else
    echo -e "${RED}Failed to initialize Istio operator.${NC}"
fi
echo -e "${YELLOW}Command: kubectl apply -f ../setup/istio-operator.yaml${NC}"

output=$(kubectl apply -f ../setup/istio-operator.yaml & wait)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Istio operator applied successfully.${NC}"
else
    echo -e "${RED}Failed to apply Istio operator.${NC}"
fi

for i in {1..2}; do
    echo "Configuring internal DNS... Attempt $i"
    echo -e "${YELLOW}Command: kubectl apply -f ../setup/istio-dns.yaml${NC}"
    output=$(kubectl apply -f ../setup/istio-dns.yaml & wait)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Internal DNS configured successfully on attempt $i.${NC}"
    else
        echo -e "${RED}Failed to configure internal DNS on attempt $i.${NC}"
    fi
done

echo -e "${GREEN}Applied internal DNS configuration.${NC}"
echo

echo -e "${GREEN}Installing hlf-operator...${NC}"
echo -e "${YELLOW}Command: helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update${NC}"
output=$(helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update & wait)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Helm repository added successfully.${NC}"
else
    echo -e "${RED}Failed to add Helm repository.${NC}"
fi
echo -e "${YELLOW}Command: helm upgrade --install hlf-operator --version=1.11.0-beta3 -- kfs/hlf-operator${NC}"

output=$(helm upgrade --install hlf-operator --version=1.11.0-beta3 -- kfs/hlf-operator & wait)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Helm chart upgraded successfully.${NC}"
else
    echo -e "${RED}Failed to upgrade Helm chart.${NC}"
fi

echo -e "${GREEN}Installing Kubectl plugins...${NC}"
echo -e "${YELLOW}Command: kubectl krew install hlf${NC}"
output=$(kubectl krew install hlf & wait)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Kubectl plugins installed successfully.${NC}"
else
    echo -e "${RED}Failed to install Kubectl plugins.${NC}"
fi