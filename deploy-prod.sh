#!/bin/bash
set -e

COMMIT_DESCRIPTION=""

echo "🔧 Building project..."
npm run build

echo "📦 Cloning production branch to temp folder..."
rm -rf ../prod-backend-temp
git clone --branch production git@github.com:MediadentApp/MediadentBackend_repo.git ../prod-backend-temp

echo "📦 Copying build files to temp folder..."
cp -r dist ../prod-backend-temp/
cp package.json ../prod-backend-temp/
cp README.md ../prod-backend-temp/

cd ../prod-backend-temp

echo "🧹 Removing devDependencies from package.json..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json'));
  delete pkg.devDependencies;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "📦 Committing updated production build..."
git add .
git commit -m "Deploy: update build on $(date '+%d-%m-%Y, %I:%M %p')" -m "$COMMIT_DESCRIPTION" || echo "⚠️ Nothing to commit"
git push origin production

cd ..
rm -rf ../prod-backend-temp
echo "✅ Production branch updated!"

if [ -f config.env ]; then
  source config.env
  echo "🚀 Deploying the production..., URL:$DEPLOYMENT_URL"
  curl -X GET "$DEPLOYMENT_URL"
fi