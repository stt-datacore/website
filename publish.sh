#!/bin/bash
GIT_PATH=/home/stt/datacore

pushd $GIT_PATH
# This would be more thorough but would also require re-installing all dependencies in node_modules
#git clean -x
rm -rf ./public/
rm -rf ./public_old/
rm -rf ./.cache/
rm schema.json
rm schema.graphql

git pull 2>&1
if [ $? -ne 0 ]
then
    echo "Failed during git pull"
    exit 1
fi

npm install
if [ $? -ne 0 ]
then
    echo "Failed during npm install"
    exit 2
fi

npm run build
if [ $? -ne 0 ]
then
    echo "Failed during npm build"
    exit 3
fi

mv public_web public_old
mv public public_web
rm -rf ./public_old/
popd

# sudo systemctl restart nginx
