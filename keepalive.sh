#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  npx next dev -p 3000 --turbopack > /home/z/my-project/dev.log 2>&1 &
  CHILD_PID=$!
  echo "Child PID: $CHILD_PID"
  
  # Monitor child
  while kill -0 $CHILD_PID 2>/dev/null; do
    sleep 5
  done
  
  echo "Server died, restarting in 3s..."
  sleep 3
done
