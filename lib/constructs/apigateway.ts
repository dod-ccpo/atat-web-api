import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import * as statement from "cdk-iam-floyd";

import { Construct } from "constructs";
import { HttpMethod } from "aws-cdk-lib/aws-events";

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
  // TODO: REMOVE THIS ATTRIBUTE. This is a temporary workaround to resolve issues
  // with networking. At the moment, the rest of the networking infrastructure
  // (across accounts) does not fully and properly support ingress traffic. This
  // must be removed once those fixes are in-place.
  tempDontUseVpcEndpoint?: boolean;
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
    const isPrivateApi = !!props?.vpcConfig && !props.vpcConfig.tempDontUseVpcEndpoint;
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

  /**
   * Grant a given user access to a specific path for a specific HTTP method.
   *
   * This grants access only to this REST API for the current deployment stage.
   *
   * @param user The IAM user to grant access to
   * @param method The HTTP method to grant access for (or "*")
   * @param path The path to grant access to
   */
  public grantOnRoute(user: iam.IUser, method: HttpMethod | "*", path = "/") {
    user.addToPrincipalPolicy(
      new statement.ExecuteApi()
        .toInvoke()
        .on(this.restApi.arnForExecuteApi(method, path, this.restApi.deploymentStage.stageName))
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
        new statement.ExecuteApi().toInvoke().onAllResources().forCdkPrincipal(new iam.AccountRootPrincipal()),
        new statement.ExecuteApi()
          .deny()
          .toInvoke()
          .onAllResources()
          .forPublic()
          .ifAwsSourceVpce(endpoint.vpcEndpointId, new statement.Operator().stringNotEquals()),
      ],
    });
  }
}
