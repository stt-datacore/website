#!/bin/bash
#GIT_PATH=/home/stt/datacore
GIT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

pushd $GIT_PATH

if [[ -f ".git/index.lock" ]]; then
    echo "ERROR: Git repository is locked, waiting to unlock." >&2
    sleep 5
    continue
fi

git fetch

repo_name=$(basename -s .git "$(git config --get remote.origin.url)")

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null)"

# upstream was not configured
if [[ -z "$upstream" ]]; then
    echo "ERROR: Git repository does not have an upstream source."
    exit 1
fi

git_local=$(git rev-parse @)
git_remote=$(git rev-parse "$upstream")
git_base=$(git merge-base @ "$upstream")


if [[ "$git_local" == "$git_remote" ]]; then
    echo "No update to pull."
    exit 1
elif [[ "$git_local" == "$git_base" ]]; then
    echo "Update found, pulling update and rebuilding website."
elif [[ "$git_remote" == "$git_base" ]]; then
    echo "ERROR: Local git repo is ahead of remote.  You may need to push or revert changes."
    exit 1
else
    echo "ERROR: Local git repo has diverged from remote. Unable to fix."
    exit 1
fi

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

npm install 2>&1
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
