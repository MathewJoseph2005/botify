#!/bin/bash

# Script to start server and test API
cd ~/botify/back-end

echo "Starting server in background..."
node server.js > server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting for server to start..."
sleep 3

echo ""
echo "Testing API endpoints..."
node test-api.js

echo ""
echo "To stop the server, run: kill $SERVER_PID"
