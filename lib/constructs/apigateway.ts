import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";

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
  interfaceEndpoint: ec2.InterfaceVpcEndpoint;
}

export interface AtatRestApiProps extends apigw.RestApiBaseProps {
  vpcConfig?: RestApiVpcConfiguration;
}

export class AtatRestApi extends Construct {
  readonly restApi: apigw.RestApiBase;

  constructor(scope: Construct, id: string, props?: AtatRestApiProps) {
    super(scope, id);
    const accessLogs = new logs.LogGroup(this, "AccessLogs");

    // When a VPC is provided (which may not always be the case), a private
    // endpoint is configured within the given VPC using a given VPC interface
    // endpoint. Otherwise, a regional endpoint is used. Edge endpoints are not
    // configured purely for convenience (as they're not available in all
    // regions or partitions).
    const isPrivateApi = !!props?.vpcConfig;
    const privateEndpointConfig = () => ({
      endpointTypes: [apigw.EndpointType.PRIVATE],
      endpointConfiguration: {
        types: [apigw.EndpointType.PRIVATE],
        vpcEndpoints: [props!.vpcConfig!.interfaceEndpoint],
      },
      policy: this.privateEndpointPolicy(props!.vpcConfig!.interfaceEndpoint),
    });
    const regionalEndpointConfig = () => ({
      endpointTypes: [apigw.EndpointType.REGIONAL],
    });

    const restApi = new apigw.RestApi(this, "Api", {
      ...props,
      ...(isPrivateApi ? privateEndpointConfig() : regionalEndpointConfig()),
      deployOptions: {
        ...props?.deployOptions,
        cachingEnabled: true,
        cacheDataEncrypted: true,
        cacheTtl: cdk.Duration.minutes(0),
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: API_ACCESS_LOG_FORMAT,
      },
    });
    this.restApi = restApi;
  }

  private privateEndpointPolicy(endpoint: ec2.InterfaceVpcEndpoint): iam.PolicyDocument {
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
          principals: [new iam.AccountPrincipal(cdk.Aws.ACCOUNT_ID)],
          actions: ["execute-api:Invoke"],
          resources: ["execute-api:/*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ["execute-api:Invoke"],
          resources: ["execute-api:/*"],
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
