#!/bin/bash
# MotoRide — Auto-deploy script
# Bu script GitHub Actions tərəfindən çağırılır

set -e

cd /var/www/motoride

echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install --production

echo "🔄 Restarting MotoRide..."
pm2 restart motoride

echo "✅ Deploy completed at $(date)"
