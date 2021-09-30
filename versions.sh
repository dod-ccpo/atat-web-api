#!/bin/bash
DIVIDER="----------------------------------------------------------------------"
echo "$DIVIDER"; echo "-- Software Tool Versions"; echo "$DIVIDER"
echo "[user]"
whoami
echo
echo "[os]"
PRETTY_NAME=$(grep -oP '(?<=^PRETTY_NAME=).+' /etc/os-release | tr -d '"')
echo "$PRETTY_NAME"
uname -a
echo
echo "[Node.js]"
echo "node $(node --version)"
echo "npm $(npm --version)"
echo
echo "[TypeScript]"
echo "tsc $(tsc --version)"
echo
echo "[AWS CLI]"
echo "aws $(aws --version)"
echo
echo "[AWS CDK Toolkit]"
echo "cdk $(cdk --version)"
echo
