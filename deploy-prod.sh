#!/bin/bash
set -e

echo "🔧 Building project..."
npm run build

echo "📦 Preparing production files..."
mkdir ../prod-backend-temp
cp -r dist package.json package-lock.json README.md ../prod-backend-temp

cd ../prod-backend-temp

echo "🌱 Initializing Git repo..."
git init
git checkout -b production
git add .
git commit -m "Deploy: build from main"

echo "🌐 Pushing to remote production branch..."
git remote add origin git@github.com:MediadentApp/MediadentBackend_repo.git
git push origin production --force

cd ..
rm -rf prod-backend-temp

echo "✅ Production branch updated and deployed!"