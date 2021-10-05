#!/bin/bash
ATAT_WEB_API_DIR="${ATAT_WEB_API_DIR:-$HOME/atat-web-api}"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
echo "\$ATAT_WEB_API_DIR is ($ATAT_WEB_API_DIR)"
echo "\$NVM_DIR is ($NVM_DIR)"
. $NVM_DIR/nvm.sh
cd $ATAT_WEB_API_DIR
nvm install
npm install -g typescript aws-cdk
npm ci && npm run bootstrap && npm run build && npm run test
