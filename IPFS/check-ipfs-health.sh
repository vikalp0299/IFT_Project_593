#!/bin/bash

echo "========================================="
echo "IPFS Integration Health Check"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "   Please start Docker Desktop"
    exit 1
fi
echo "✅ Docker is running"

# Check if IPFS container is running
if docker ps | grep -q "ipfs-local-node"; then
    echo "✅ IPFS container is running"
else
    echo "❌ IPFS container is not running"
    echo "   Run: cd IPFS && docker-compose up -d"
    exit 1
fi

# Check IPFS API
echo ""
echo "Testing IPFS API (port 5001)..."
if curl -s -f http://localhost:5001/api/v0/id > /dev/null; then
    echo "✅ IPFS API is accessible"
    PEER_ID=$(curl -s http://localhost:5001/api/v0/id | grep -o '"ID":"[^"]*"' | cut -d'"' -f4)
    echo "   Peer ID: $PEER_ID"
else
    echo "❌ IPFS API is not accessible"
    echo "   Check: docker-compose logs ipfs"
    exit 1
fi

# Check IPFS Gateway
echo ""
echo "Testing IPFS Gateway (port 8080)..."
if curl -s -f http://localhost:8080/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme > /dev/null; then
    echo "✅ IPFS Gateway is accessible"
else
    echo "⚠️  IPFS Gateway might not be ready yet"
    echo "   This is not critical for file uploads"
fi

# Check IPFS version
echo ""
echo "IPFS Version:"
curl -s -X POST http://localhost:5001/api/v0/version | grep -o '"Version":"[^"]*"' | cut -d'"' -f4

# Check storage stats
echo ""
echo "Storage Stats:"
curl -s -X POST http://localhost:5001/api/v0/repo/stat | python3 -m json.tool 2>/dev/null | grep -A 3 "RepoSize\|StorageMax\|NumObjects" || echo "   (stats unavailable)"

echo ""
echo "========================================="
echo "✅ IPFS Integration is ready!"
echo "========================================="
echo ""
echo "IPFS Endpoints:"
echo "  API:     http://localhost:5001"
echo "  Gateway: http://localhost:8080"
echo "  P2P:     localhost:4001"
echo ""
echo "Backend will automatically use IPFS for new file uploads"
echo "and fall back to local storage if IPFS is unavailable."
