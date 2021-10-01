#!/bin/bash
if [ $# -eq 0 ]
  then
    echo "No arguments supplied."
    echo "Expected Parameters:"
    echo "  1. The Physical ID of the AWS::ApiGateway::RestApi, for example 'd82arw4bnk'"
    exit 1
fi
today=$(date +"%Y-%m-%d")
aws apigateway get-export --export-type swagger --parameters extensions='postman' --profile atat-sandbox-dev --stage-name prod --rest-api-id $1 ~/AtatWebApi-restapi-$1-postman-export-${today}.json
echo "Exported to ~/AtatWebApi-restapi-$1-postman-export-${today}.json"
