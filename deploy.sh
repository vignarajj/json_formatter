#!/bin/bash

# Deploy script for GitHub Pages
echo "Building project..."
npm run build

echo "Copying built files to root..."
cp -r dist/* .

echo "Files ready for deployment!"
echo "Please commit and push these changes to GitHub:"
echo "git add ."
echo "git commit -m 'Fix asset paths for GitHub Pages'"
echo "git push origin main"
