#!/bin/bash

echo "Starting IPFS setup..."

# Start the IPFS container
echo "Starting IPFS container..."
docker-compose up -d

# Wait for IPFS to be ready
echo "Waiting for IPFS to be ready..."
sleep 10

# Check if IPFS is running
echo "Checking IPFS status..."
curl -s http://localhost:5001/api/v0/id > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ IPFS is running successfully!"
    echo "Local gateway: http://localhost:8080"
    echo "API endpoint: http://localhost:5001"
else
    echo "❌ IPFS failed to start properly"
    echo "Check the logs with: docker-compose logs"
fi

echo "Starting Node.js server..."
cd node_app
npm start
