GIT_PATH=/home/stt/datacore

pushd $GIT_PATH
# This would be more thorough but would also require re-installing all dependencies in node_modules
#git clean -x
rm -rf ./public/
rm -rf ./.cache/
rm schema.json
rm schema.graphql

git pull 2>&1
npm install
npm run build
popd

# sudo systemctl restart nginx
