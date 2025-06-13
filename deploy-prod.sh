#!/bin/bash
set -e

echo "🔧 Building project..."
npm run build

echo "📦 Preparing production files..."
rm -rf ../prod-backend-temp
mkdir -p ../prod-backend-temp
cp -r dist package.json README.md ../prod-backend-temp

cd ../prod-backend-temp

echo "🧹 Removing devDependencies using Node..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
delete pkg.devDependencies;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "🌱 Initializing Git repo..."
git init
git checkout -b production
git add .
git commit -m "Deploy: build from main on $(date '+%d-%m-%Y, %I:%M %p')"

echo "🌐 Pushing to remote production branch..."
git remote add origin git@github.com:MediadentApp/MediadentBackend_repo.git
git push origin production --force
git pull 

cd ..
sleep 1
rm -rf prod-backend-temp
echo "✅ Production branch updated and deployed!"
