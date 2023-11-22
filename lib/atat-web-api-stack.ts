// These are required because CDK uses "new <object>" as a way to create side-effects
// No known alternative to satisfy not using the result of the constructor.
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { UserPermissionBoundary } from "./aspects/user-only-permission-boundary";
import { AtatNetStack } from "./atat-net-stack";
import { ApiSfnFunction } from "./constructs/api-sfn-function";
import { ApiUser } from "./constructs/api-user";
import { AtatRestApi, AtatRestApiProps } from "./constructs/apigateway";
import { CostApiImplementation } from "./constructs/cost-api-implementation";
import * as idp from "./constructs/identity-provider";
import { ProvisioningWorkflow } from "./constructs/provisioning-sfn-workflow";
import { VpcEndpointApplicationTargetGroup } from "./constructs/vpc-endpoint-lb-target";
import { HttpMethod } from "./http";
import { NagSuppressions } from "cdk-nag";
import * as cr from "aws-cdk-lib/custom-resources";

export interface ApiCertificateOptions {
  domainName: string;
  acmCertificateArn: string;
}

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentName: string;
  albeventbusARN: string;
  network?: AtatNetStack;
  isSandbox?: boolean;
  apiDomain?: ApiCertificateOptions;
  vpcFlowLogBucket?: AtatNetStack;
}

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatWebApiStackProps) {
    let result = null;
    super(scope, id, props);
    NagSuppressions.addStackSuppressions(this, [
      // This is a temporary supression (hopefully) and we will adopt this as soon as the feature
      // is actually available within the GovCloud partition. We have internally opened an
      // AWS Support case for this issue.
      {
        id: "NIST.800.53.R4-CloudWatchLogGroupEncrypted",
        reason: "CloudFormation does not support KmsKeyId for AWS::Logs::LogGroup in us-gov-west-1",
      },
    ]);

    // This forces all created `AwsCustomResource` constructs to use a VPC. The reasoning for
    // this requires some understanding of how the CDK creates an `AwsCustomResource` construct.
    // At the base, it is a `lambda.SingletonFunction` which gets reused across the stack. This
    // also means that if we create this first in the stack, it will be reused any time that
    // `AwsCustomResource` is used in our constructs or within the CDK's inner constructs across
    // this stack.
    // sts:GetCallerIdentity is the most nop API action that one can think of and it's the only
    // API call that can never return a permission error so long as you've got valid credentials
    // so it seems like a pretty reasonable choice for this.
    // Because we don't control all the places where an `AwsCustomResource` is created and it's
    // not viable for us to reimplement all of them ourselves to avoid CDK-created ones, this is
    // the best possible workaround.
    if (props.network) {
      result = new cr.AwsCustomResource(this, "NopCustomResource", {
        onUpdate: {
          service: "STS",
          action: "getCallerIdentity",
          physicalResourceId: cr.PhysicalResourceId.of("unused-value"),
        },
        // vpc: props.network?.vpc,
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE }),
      });

      NagSuppressions.addResourceSuppressionsByPath(
        this,
        `/${this.node.path}/AWS679f53fac002430cb0da5b7982bd2287/Resource`,
        [
          {
            id: "NIST.800.53.R4-LambdaInsideVPC",
            reason:
              "The AwsCustomResource type does not support being placed in a VPC. " +
              "This can only ever make limited-permissions calls that will appear in CloudTrail.",
          },
        ]
      );
    }

    const { environmentName, network } = props;
    const apiProps: AtatRestApiProps = {
      restApiName: `${environmentName}HothApi`,
      binaryMediaTypes: [
        "application/json",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    };
    if (network) {
      apiProps.vpcConfig = {
        vpc: network.vpc,
        interfaceEndpoint: network.endpoints.apigateway,
      };
    }

    const accessLogsBucket = new s3.Bucket(this, "LoadBalancerAccessLogs", {
      // Elastic Load Balancing Log Delivery requires SSE-S3 and _does not_ support
      // SSE-KMS. This still ensures that log data is encrypted at rest.
      // Default retention for object lock is 365 days
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      objectLockEnabled: true,
      objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
    });

    enum Classification {
      // Used on the Cloud Trail Logs, Cloud Trail S3 bucket, and LoadBalancerAccessLogs s3 bucket
      UNCLASSIFIED = "UNCLASS",
    }
    Tags.of(accessLogsBucket).add("Classification", Classification.UNCLASSIFIED);

    NagSuppressions.addResourceSuppressions(accessLogsBucket, [
      {
        id: "NIST.800.53.R4-S3BucketLoggingEnabled",
        reason: "The ideal bucket for this to log to is itself. That creates complexity with receiving other logs",
      },
      {
        id: "NIST.800.53.R4-S3BucketReplicationEnabled",
        reason: "Cross region replication is not required for this use case",
      },
      {
        id: "NIST.800.53.R4-S3BucketDefaultLockEnabled",
        reason: "Server Access Logs cannot be delivered to a bucket with Object Lock enabled",
      },
    ]);
    const api = new AtatRestApi(this, "HothApi", apiProps);
    if (props.apiDomain && network) {
      const certificate = acm.Certificate.fromCertificateArn(this, "ApiCertificate", props.apiDomain.acmCertificateArn);
      const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
        vpc: network.vpc,
        internetFacing: false,
        deletionProtection: true,
        dropInvalidHeaderFields: true,
      });
      loadBalancer.logAccessLogs(accessLogsBucket);
      NagSuppressions.addResourceSuppressions(loadBalancer, [
        { id: "NIST.800.53.R4-ALBWAFEnabled", reason: "Palo Alto NGFW is in use" },
      ]);

      loadBalancer.setAttribute("routing.http.drop_invalid_header_fields.enabled", "true");

      loadBalancer.addListener("HttpsListener", {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        sslPolicy: elbv2.SslPolicy.FORWARD_SECRECY_TLS12_RES_GCM,
        certificates: [certificate],
        defaultTargetGroups: [
          new VpcEndpointApplicationTargetGroup(this, "VpcEndpointTarget", {
            endpoint: network.endpoints.apigateway,
            port: 443,
            vpc: network.vpc,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            healthCheck: {
              // Unfortunately, there is not a great way to actually invoke a health route
              // on the AWS API Gateway because we would need to send some kind of header in
              // order to successfully hit our API via the endpoint. We would hve to send
              // either the Host or x-apigw-api-id headers and we can only specify paths.
              // If we at least get a response and that response is either a 200 or it's a
              // 403 (which is what API Gateway will return when we've failed to provide the
              // header), then we should be all good.
              // TODO: Perhaps mitigate this by closely monitoring the number of 4xx or 5xx
              // returned from the ALB or if the ALB receives a large number of requests that
              // never make it to the API Gateway? Other solutions may be available.
              healthyHttpCodes: "200,403",
            },
          }),
        ],
      });
      // We're behind NAT so we need to allow this
      loadBalancer.connections.allowFromAnyIpv4(ec2.Port.tcp(443));
      // We manually set the targets so we need to allow this
      // TODO: Fix that in the TargetGroup config?
      loadBalancer.connections.allowToAnyIpv4(ec2.Port.tcp(443));
      result = new cdk.CfnOutput(this, "LoadBalancerDns", { value: loadBalancer.loadBalancerDnsName });
      NagSuppressions.addResourceSuppressions(loadBalancer, [
        {
          id: "NIST.800.53.R4-ALBWAFEnabled",
          reason: "Layer 7 rules are applied on a separate firewall appliance",
        },
      ]);
    }
    // Custom Resource to describe the ApiGw endpoint IPs and send to custom EventBus
    // in the transit account for Net Firewall Migration

    // Initialize the AWS SDK
    if (props.apiDomain && network && props.albeventbusARN) {
      // props.environmentName !== "Sandbox"
      const endpointHandler = new nodejs.NodejsFunction(this, "ApiEndpointHandler", {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: "lib/custom-resources/endpoint-ips-apigw.ts",
        handler: "onEvent",
        vpc: network.vpc,
        initialPolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ec2:DescribeVpcEndpoints", "ec2:DescribeNetworkInterfaces", "events:PutEvents"],
            resources: ["*"],
          }),
        ],
        environment: {
          albEventBusArn: props.albeventbusARN,
        },
      });

      const apiEndpointIpProvider = new cr.Provider(this, "ApiEndpointIps", {
        onEventHandler: endpointHandler,
        vpc: network.vpc,
      });

      const apiGwCustomResource = new cdk.CustomResource(this, "ApiGatewayEndpointIps", {
        serviceToken: apiEndpointIpProvider.serviceToken,
        properties: {
          VpcEndpointId: network.endpoints.apigateway.vpcEndpointId,
        },
      });
    }

    const readUser = new ApiUser(this, "ReadUser", { secretPrefix: "api/user/snow", username: "ReadUser" });
    const writeUser = new ApiUser(this, "WriteUser", { secretPrefix: "api/user/snow", username: "WriteUser" });
    api.grantOnRoute(readUser.user, HttpMethod.GET);
    api.grantOnRoute(writeUser.user, "*");

    result = new cdk.CfnOutput(this, "ReadUserAccessKey", { value: readUser.accessKey.secretName });
    result = new cdk.CfnOutput(this, "WriteUserAccessKey", { value: writeUser.accessKey.secretName });

    [readUser, writeUser].forEach((user) => {
      NagSuppressions.addResourceSuppressions(
        user,
        [
          {
            id: "NIST.800.53.R4-IAMUserGroupMembership",
            reason: "These users are created automatically and the lack of group membership is intentional",
          },
          {
            id: "NIST.800.53.R4-IAMUserNoPolicies",
            reason:
              "Attaching IAM policies to the user is intentional. " +
              "The user will not be modified outside of CloudFormation and is not part of a larger group.",
          },
        ],
        true
      );
    });

    // Ensure that no IAM users in this Stack can ever do anything
    // except for invoke the created API Gateway.
    // This defines the *maximum* set of permissions any user can ever
    // have and (as a permissions boundary) does not directly grant any
    // permissions.
    cdk.Aspects.of(this).add(
      new UserPermissionBoundary(
        new iam.ManagedPolicy(this, "ApiUserBoundary", {
          document: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [api.restApi.arnForExecuteApi()],
              }),
              // This may seem a little redundant; however, implicit denies
              // in permissions boundaries do not limit resource-based policies.
              // So we need an _explicit_ deny for any action other than
              // `execute-api:*` so that one of the users cannot mistakenly be
              // given an identity-based policy that grants something like
              // s3:GetObject on * while an S3 bucket allows the user to read
              // from that bucket.
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                notActions: ["execute-api:Invoke"],
                notResources: [api.restApi.arnForExecuteApi()],
              }),
            ],
          }),
        })
      )
    );

    const atatIdp = new idp.CognitoIdentityProvider(this, "AtatIdp", {
      domainPrefix: `atat${environmentName.toLowerCase()}`,
      scopeConfig: [
        {
          resourceServerName: "atat",
          scopes: [
            { name: "read-cost", description: "Allow reading cost information" },
            { name: "read-portfolio", description: "Allow reading information about portfolios" },
            { name: "write-portfolio", description: "Allow creating and updating portfolios" },
          ],
        },
      ],
    });

    result = new cdk.CfnOutput(this, "IdpDiscoveryUrl", {
      value: atatIdp.discoveryUrl(),
    });

    // State Machine and workflow
    const provisioningSfn = new ProvisioningWorkflow(this, "ProvisioningWorkflow", {
      environmentName,
      idp: atatIdp,
      vpc: network?.vpc,
    });

    // Provisioning lambda that translates and invokes the state machine
    const provisioningJob = new ApiSfnFunction(this, "ProvisioningJobRequest", {
      method: HttpMethod.POST,
      handlerPath: "api/provision/start-provisioning-job.ts",
      stateMachine: provisioningSfn.stateMachine,
      vpc: network?.vpc,
    });

    // APIGW Provisioning Job Resource
    const provisioningJobResource = api.restApi.root.addResource("provisioning-jobs");
    provisioningJobResource.addMethod(provisioningJob.method, new apigw.LambdaIntegration(provisioningJob.fn));
    provisioningJobResource.addMethod(
      provisioningSfn.provisioningQueueConsumer.method,
      new apigw.LambdaIntegration(provisioningSfn.provisioningQueueConsumer.fn)
    );

    // TODO: No longer need this functionality as we are not producing .html or .pdf documents
    // APIGW Document Generation Resource
    const generateDocumentResource = api.restApi.root.addResource("generate-document");
    const documentGenerationLayer = new lambda.LayerVersion(this, "GenerateDocumentSupportLayer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      code: lambda.Code.fromAsset("document-generation/templates", {}),
    });
    const generateDocumentFn = new nodejs.NodejsFunction(this, "GenerateDocumentFunction", {
      entry: "document-generation/generate-document.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 512,
      bundling: {
        nodeModules: ["@sparticuz/chromium", "puppeteer-core"],
      },
      layers: [documentGenerationLayer],
      timeout: cdk.Duration.seconds(60),
      vpc: network?.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    generateDocumentResource.addMethod(HttpMethod.POST, new apigw.LambdaIntegration(generateDocumentFn));

    // Build all Cost Resources
    result = new CostApiImplementation(this, {
      environmentName,
      apiParent: api.restApi.root,
      vpc: props?.network?.vpc,
      idp: atatIdp,
    });
  }
}
