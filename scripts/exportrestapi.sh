#!/bin/bash
AWS_PROFILE="${AWS_PROFILE:-atat-sandbox-dev}"
if [ $# -eq 0 ]
  then
    echo "No arguments supplied."
    echo "Expected Parameters:"
    echo "  1. The ID of a AWS::ApiGateway::RestApi, for example 'd82arw4bnk'"
    echo
    echo "RestApis visible to AWS profile ${AWS_PROFILE}:"
    aws apigateway get-rest-apis --profile ${AWS_PROFILE} | jq -c '.items[] | (.createdDate |= todate) | {rest_api_id: .id, stack_name: .tags."aws:cloudformation:stack-name", created_date: .createdDate}'
    echo
    echo "To switch AWS profiles, set an environment variable, for example 'export AWS_PROFILE=atat-sandbox-dev'"
    exit 1
fi
today=$(date +"%Y-%m-%d")
output=~/${AWS_PROFILE}-restapi-$1-${today}.json
aws apigateway get-export --export-type oas30 --parameters extensions='postman' --profile ${AWS_PROFILE} --stage-name prod --rest-api-id $1 ${output}
echo
echo "OpenAPI 3.0.x-type export with Postman extensions written to ${output}"
