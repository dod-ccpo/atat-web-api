import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { HttpMethod } from "../http";

const API_ACCESS_LOG_FORMAT = apigw.AccessLogFormat.custom(
  JSON.stringify({
    requestId: apigw.AccessLogField.contextRequestId(),
    extendedRequestId: apigw.AccessLogField.contextExtendedRequestId(),
    xrayTraceId: apigw.AccessLogField.contextXrayTraceId(),
    // This field is in the Apache Common Log Format
    requestTime: apigw.AccessLogField.contextRequestTime(),
    httpMethod: apigw.AccessLogField.contextHttpMethod(),
    protocol: apigw.AccessLogField.contextProtocol(),
    responseLength: apigw.AccessLogField.contextResponseLength(),
    status: apigw.AccessLogField.contextStatus(),
    resourcePath: apigw.AccessLogField.contextResourcePath(),
    path: apigw.AccessLogField.contextPath(),
    ip: apigw.AccessLogField.contextIdentitySourceIp(),
    user: apigw.AccessLogField.contextIdentityUser(),
    userAgent: apigw.AccessLogField.contextIdentityUserAgent(),
    // The Request ID for the integration (Lambda)
    integrationRequestId: "$context.integration.requestId",
    integrationLatency: apigw.AccessLogField.contextIntegrationLatency(),
  })
);

export interface RestApiVpcConfiguration {
  vpc: ec2.IVpc;
  interfaceEndpoint: ec2.IVpcEndpoint;
}

export interface AtatRestApiProps extends apigw.RestApiProps {
  vpcConfig?: RestApiVpcConfiguration;
  logEncryptionKey?: kms.IKey;
}

export class AtatRestApi extends Construct {
  readonly restApi: apigw.RestApiBase;

  constructor(scope: Construct, id: string, props?: AtatRestApiProps) {
    super(scope, id);
    const accessLogs = new logs.LogGroup(this, "AccessLogs", {
      retention: logs.RetentionDays.TEN_YEARS,
      encryptionKey: props?.logEncryptionKey,
    });

    // When a VPC is provided (which may not always be the case), a private
    // endpoint is configured within the given VPC using a given VPC interface
    // endpoint. Otherwise, a regional endpoint is used. Edge endpoints are not
    // configured purely for convenience (as they're not available in all
    // regions or partitions).
    const privateEndpointConfig = () => ({
      endpointConfiguration: {
        types: [apigw.EndpointType.PRIVATE],
        vpcEndpoints: [props!.vpcConfig!.interfaceEndpoint],
      },
      policy: this.permitAccessOnlyFromEndpoint(props!.vpcConfig!.interfaceEndpoint),
    });
    const regionalEndpointConfig = () => ({
      endpointTypes: [apigw.EndpointType.REGIONAL],
    });

    const restApi = new apigw.RestApi(this, "Api", {
      description: "The REST API between ATAT in ServiceNow and in the Cloud",
      ...props,
      ...(props?.vpcConfig?.vpc ? privateEndpointConfig() : regionalEndpointConfig()),
      deployOptions: {
        ...props?.deployOptions,
        cachingEnabled: true,
        cacheDataEncrypted: true,
        cacheTtl: cdk.Duration.minutes(0),
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: API_ACCESS_LOG_FORMAT,
        tracingEnabled: true,
      },
      defaultMethodOptions: {
        authorizationType: apigw.AuthorizationType.IAM,
      },
    });
    this.restApi = restApi;
  }

  /**
   * Grant a given principal access to a specific path for a specific HTTP method.
   *
   * This grants access only to this REST API for the current deployment stage.
   *
   * @param principal The IAM principal to grant access to
   * @param method The HTTP method to grant access for (or "*")
   * @param path The path to grant access to
   */
  public grantOnRoute(principal: iam.IPrincipal, method: HttpMethod | "*", path?: string) {
    principal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [this.restApi.arnForExecuteApi(method, path, this.restApi.deploymentStage.stageName)],
      })
    );
  }

  private permitAccessOnlyFromEndpoint(endpoint: ec2.IVpcEndpoint): iam.PolicyDocument {
    // Creates a relatively secure resource policy for the API Gateway resource. Only users within
    // the current account are permitted to invoke the API and all access must occur via the defined
    // VPC Interface Endpoint. The default is to allow access to the API via _any_ API Gateway
    // private endpoint within the account. We limit it here to only allow access via the expected
    // VPC.
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["execute-api:Invoke"],
          principals: [new iam.AccountRootPrincipal()],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["execute-api:Invoke"],
          principals: [new iam.AnyPrincipal()],
          conditions: {
            StringNotEquals: {
              "aws:SourceVpce": endpoint.vpcEndpointId,
            },
          },
        }),
      ],
    });
  }
}
