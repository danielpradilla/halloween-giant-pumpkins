#!/bin/sh
# Publish the static site.
#
#   DEPLOY_TARGET=user@host:path/to/halloween-giant-pumpkins sh scripts/deploy.sh
#
# The path after the colon is relative to the remote home directory. Assets go to v/<commit>/ so a CDN that caches
# JS, CSS and JSON for weeks can never serve an old file under a new page; index.html is uploaded last and is the
# only file that changes in place. Nothing on the server is deleted.
set -eu

: "${DEPLOY_TARGET:?Set DEPLOY_TARGET=user@host:path/to/halloween-giant-pumpkins}"
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain -- index.html src public)" ]; then
  echo "Commit changes to index.html, src/ and public/ first: the deployed version is the commit hash." >&2
  exit 1
fi
VERSION=$(git rev-parse --short=10 HEAD)
HOST=${DEPLOY_TARGET%%:*}
DIR=${DEPLOY_TARGET#*:}

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
chmod 755 "$STAGE"
mkdir -p "$STAGE/v/$VERSION"
cp -R src public "$STAGE/v/$VERSION/"
sed -e "s#\"src/#\"v/$VERSION/src/#g" \
    -e "s#\"public/#\"v/$VERSION/public/#g" \
    -e "s#halloween-giant-pumpkins/public/#halloween-giant-pumpkins/v/$VERSION/public/#g" \
    index.html > "$STAGE/index.html"

rsync -rlt "$STAGE/v" "$DEPLOY_TARGET/"
rsync -t "$STAGE/index.html" "$DEPLOY_TARGET/index.html"
ssh "$HOST" "find '$DIR' -type d -exec chmod 755 {} + && find '$DIR' -type f -exec chmod 644 {} +"
echo "Deployed $VERSION to $DEPLOY_TARGET"
