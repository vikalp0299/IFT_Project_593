#!/bin/bash

# Ensure generated_resources directory exists
mkdir -p ../generated_resources

# Clean up old files from generated_resources
rm -f ../generated_resources/code.tar.gz ../generated_resources/connection.json ../generated_resources/metadata.json

CHAINCODE_NAME=asset
CHAINCODE_LABEL=asset

cat << METADATA-EOF > "../generated_resources/metadata.json"
{
    "type": "ccaas",
    "label": "${CHAINCODE_LABEL}"
}
METADATA-EOF

cat > "../generated_resources/connection.json" <<CONN_EOF
{
  "address": "${CHAINCODE_NAME}:7052",
  "dial_timeout": "10s",
  "tls_required": false
}
CONN_EOF

# Create tarballs in generated_resources
cd ../generated_resources
tar -czf code.tar.gz connection.json
tar -czf chaincode.tgz metadata.json code.tar.gz
cd ../scripts

PACKAGE_ID=$(kubectl hlf chaincode calculatepackageid --path=../generated_resources/chaincode.tgz --language=node --label=$CHAINCODE_LABEL)
echo "PACKAGE_ID=$PACKAGE_ID"
export PACKAGE_ID=$PACKAGE_ID