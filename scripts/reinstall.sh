#!/bin/bash
DIVIDER="----------------------------------------------------------------------"
clear
echo "$DIVIDER"; echo "-- ATAT Web API developer reinstall"; echo "$DIVIDER"
echo "This script is for developer convenience. It assumes:"
echo " - \$ATAT_WEB_API_DIR ($ATAT_WEB_API_DIR) is defined"
echo " - nvm is installed and \$NVM_DIR ($NVM_DIR) is defined"
echo "This will do the following:"
echo " - operate from the currently selected git branch and state"
echo " - remove ALL installed node versions under nvm"
echo " - install the preferred node version specified in .nvmrc"
echo " - install the latest AWS CLI"
echo " - install the latest AWS CDK Toolkit"
echo " - install the latest TypeScript"
echo " - install all package dependencies"
echo " - bootstrap, build, and test"
echo " - display software tool versions"
read -rp "Press enter to continue or Ctrl+C to cancel"
. $NVM_DIR/nvm.sh
. $HOME/.profile
. $HOME/.bashrc
echo; echo "[Remove node versions]" && rm -rf $NVM_DIR/versions/node/ && mkdir $NVM_DIR/versions/node/
echo; echo "[Install AWS CLI]" && sudo apt install awscli
echo; echo "[Install node]" && cd $ATAT_WEB_API_DIR && nvm install
echo; echo "[Install TypeScript and AWS CDK Toolkit]" && npm install -g typescript aws-cdk
echo; echo "[Install package dependencies, bootstrap, build, and test]" && cd $ATAT_WEB_API_DIR && npm ci && npm run bootstrap && npm run build && npm run test
./versions.sh
