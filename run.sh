#!/bin/bash
echo "=========================================================="
echo "              ABES GO - COLLEGE ERP LAUNCHER"
echo "=========================================================="
echo ""

cd "$(dirname "$0")"

echo "[1/3] Checking Node.js dependencies..."
if [ ! -d "client/node_modules" ]; then
    echo "Frontend dependencies not found. Installing node packages..."
    cd client && npm install
    cd ..
else
    echo "Frontend dependencies are already installed."
fi

if [ ! -d "server/node_modules" ]; then
    echo "Backend dependencies not found. Installing node packages..."
    cd server && npm install
    cd ..
else
    echo "Backend dependencies are already installed."
fi
echo ""

# Setup trap to kill background processes on exit
trap 'kill $SERVER_PID $CLIENT_PID 2>/dev/null' EXIT INT TERM

echo "[2/3] Starting backend Express database server..."
cd server
npm start &
SERVER_PID=$!
cd ..

echo "[3/3] Starting frontend Vite client dashboard..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..
echo ""

echo "=========================================================="
echo "SUCCESS: ABES GO services successfully initialized!"
echo ""
echo "- Access Administrator Dashboard: http://localhost:5173/ (admin@abes.edu / admin123)"
echo "- Access Faculty grading views: sandeep@abes.edu / sandeep123"
echo "- Access Student GPA console: liam@abes.edu / liam123"
echo "=========================================================="
echo "Press [CTRL+C] to stop both servers."

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
