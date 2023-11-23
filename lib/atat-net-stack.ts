import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as events from "aws-cdk-lib/aws-events";
import * as logs from "aws-cdk-lib/aws-logs";
import * as custom from "aws-cdk-lib/custom-resources";
import { VpcDefaultSecurityGroupRuleRemover } from "./constructs/vpc-default-sg-rule-remove";
import { Construct, DependencyGroup } from "constructs";

const DEFAULT_ROUTE = "0.0.0.0/0";

export interface AtatNetStackProps extends cdk.StackProps {
  /**
   * The CIDR block to use for the VPC.
   *
   * If this is not provided, the default value from the CDK's VPC construct
   * will be used. VPCs with overlapping ranges may cause routing issues for
   * the application. This value should almost always be provided.
   */
  vpcCidr?: string;
  vpcFlowLogBucket?: string;
  tgwEventBus?: string;
}

/**
 * Create the necessary networking infrastructure for the ATAT application.
 *
 * This provisions a VPC with an attachment to a Transit Gateway and sets that
 * TGW as the default route for the subnets in the VPC. As necessary, VPC
 * Endpoints (interface and/or gateway) are created to ensure private connectivity
 * to the AWS services used by the ATAT application.
 */
export class AtatNetStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly endpoints: { [key: string]: ec2.IInterfaceVpcEndpoint };
  public readonly outputs: cdk.CfnOutput[] = [];

  constructor(scope: Construct, id: string, props: AtatNetStackProps) {
    super(scope, id);
    this.templateOptions.description = "Creates the necessary networking infrastructure for the ATAT application";

    const vpc = new ec2.Vpc(this, "AtatVpc", {
      ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "app",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    this.vpc = vpc;
    this.outputs.push(
      new cdk.CfnOutput(this, "VpcId", {
        value: this.vpc.vpcId,
      })
    );

    // Capture all VPC flow logs and send to CloudWatch Logs with indefinite retention.
    // Flow log format made to meet C5ISR log format requirement
    /* eslint-disable no-template-curly-in-string */
    vpc.addFlowLog("AllFlowLogs", {
      logFormat: [
        ec2.LogFormat.VERSION,
        ec2.LogFormat.custom("${vpc-id}"),
        ec2.LogFormat.custom("${subnet-id}"),
        ec2.LogFormat.custom("${instance-id}"),
        ec2.LogFormat.custom("${interface-id}"),
        ec2.LogFormat.custom("${account-id}"),
        ec2.LogFormat.custom("${type}"),
        ec2.LogFormat.SRC_ADDR,
        ec2.LogFormat.DST_ADDR,
        ec2.LogFormat.SRC_PORT,
        ec2.LogFormat.DST_PORT,
        ec2.LogFormat.PKT_SRC_ADDR,
        ec2.LogFormat.PKT_DST_ADDR,
        ec2.LogFormat.PROTOCOL,
        ec2.LogFormat.BYTES,
        ec2.LogFormat.PACKETS,
        ec2.LogFormat.custom("${start}"),
        ec2.LogFormat.custom("${end}"),
        ec2.LogFormat.custom("${action}"),
        ec2.LogFormat.custom("${tcp-flags}"),
        ec2.LogFormat.custom("${log-status}"),
        /* eslint-enable no-template-curly-in-string */
      ],
      destination: ec2.FlowLogDestination.toCloudWatchLogs(
        new logs.LogGroup(this, "vpc-cssp-cwl-logs", {
          retention: logs.RetentionDays.INFINITE,
        })
      ),
    });

    if (props.tgwEventBus) {
      const eventrule = new events.Rule(this, "TGW-Association-rule", {
        eventPattern: {
          source: ["aws.ec2"],
          detail: {
            eventName: ["CreateTransitGatewayVpcAttachment"],
          },
        },
      });
      eventrule.addTarget(new targets.EventBus(events.EventBus.fromEventBusArn(this, "External", props.tgwEventBus)));
    }

    // const dnsLogsGroup = new logs.LogGroup(this, "VpcDnsQueryLogs", {
    //   retention: logs.RetentionDays.INFINITE,
    // });
    // // Capture all DNS queries made by all hosts in the VPC
    // const dnsLoggingConfig = new route53Resolver.CfnResolverQueryLoggingConfig(this, "DnsLogging", {
    //   destinationArn: dnsLogsGroup.logGroupArn,
    // });
    // const vpcDnsLogging = new route53Resolver.CfnResolverQueryLoggingConfigAssociation(this, "VpcDnsLogging", {
    //   resolverQueryLogConfigId: dnsLoggingConfig.attrId,
    //   resourceId: vpc.vpcId,
    // });

    const transitGatewayId = this.findTransitGateway();

    const tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, "VpcTgwAttachment", {
      vpcId: vpc.vpcId,
      subnetIds: vpc.isolatedSubnets.map((subnet) => (subnet as ec2.Subnet).subnetId),
      transitGatewayId,
    });
    this.addDefaultTransitGatewayRoute(tgwAttachment);

    const s3Endpoint = vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    const apiGatewayEndpoint = vpc.addInterfaceEndpoint("ApiGatewayEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    const lambdaEndpoint = vpc.addInterfaceEndpoint("LambdaEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
    });
    const logsEndpoint = vpc.addInterfaceEndpoint("LogsEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });
    const sqsEndpoint = vpc.addInterfaceEndpoint("SqsEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SQS,
    });
    const xrayEndpoint = vpc.addInterfaceEndpoint("XrayEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.XRAY,
    });
    const secretsManagerEndpoint = vpc.addInterfaceEndpoint("SecretsManager", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
    const stepFunctionsEndpoint = vpc.addInterfaceEndpoint("StepFunctions", {
      service: ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
    });
    const ec2Endpoint = vpc.addInterfaceEndpoint("Ec2Endpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2,
    });
    const ec2MessagesEndpoint = vpc.addInterfaceEndpoint("Ec2MessagesEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });
    const cloudformationEndpoint = vpc.addInterfaceEndpoint("CloudFormationEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION,
    });
    this.endpoints = {
      ...this.endpoints,
      apigateway: apiGatewayEndpoint,
      lambda: lambdaEndpoint,
      logs: logsEndpoint,
      sqs: sqsEndpoint,
      xray: xrayEndpoint,
      secrets: secretsManagerEndpoint,
      sfn: stepFunctionsEndpoint,
      ec2: ec2Endpoint,
      ec2Messages: ec2MessagesEndpoint,
      cloudformation: cloudformationEndpoint,
    };

    // The firewall in our environment performs NAT, so the source IP address will
    // always "look like" it comes from, well, just about anywhere. Because of our
    // network architecture (and because this will always exist in an isolated subnet),
    // this 0.0.0.0/0 rule is mostly safe. If the firewall were instead modified to
    // perform break-and-inspect, the source IP address would become the Firewall's
    // IP address.
    apiGatewayEndpoint.connections.allowFromAnyIpv4(
      ec2.Port.tcp(443),
      "Allow HTTPS connections via NAT to the API Gateway"
    );

    // Delete all rules from the default security group of the VPC
    const defaultSgCleanup = new VpcDefaultSecurityGroupRuleRemover(this, "RemoveDefaultSGRules", { vpc });
    // Explicitly depend on resources that may be necessary for sending creation and deletion
    // events.
    defaultSgCleanup.node.addDependency(ec2Endpoint, cloudformationEndpoint, s3Endpoint);
  }

  private addDefaultTransitGatewayRoute(transitGatewayAttachment: ec2.CfnTransitGatewayAttachment) {
    const subnets = this.vpc.isolatedSubnets as ec2.Subnet[];
    subnets.forEach((subnet, index) => {
      const table = subnet.routeTable.routeTableId;
      // The CDK does not support adding a Transit Gateway Route to a subnet directly
      // (as of v1.125.0) so we have to create the CfnRoute manually. There is not a
      // L2 construct for Routes.
      const route = new ec2.CfnRoute(this, `Subnet${index + 1}DefaultRouteToTgw`, {
        routeTableId: table,
        destinationCidrBlock: DEFAULT_ROUTE,
        transitGatewayId: transitGatewayAttachment.transitGatewayId,
      });
      // Because only the TransitGatewayId gets passed to the CfnRoute, we may not
      // necessarily have the implicit dependency that we'd expect. If the route
      // starts Creation before the attachment is accepted and attached then the
      // route will fail to be created and the stack creation will fail.
      route.addDependsOn(transitGatewayAttachment);
      (subnet.internetConnectivityEstablished as DependencyGroup).add(route);
    });
  }

  private findTransitGateway(): string {
    // Because we're performing a lookup at stack-creation time, a Custom Resource
    // must be used because CloudFormation natively doesn't have a means to lookup
    // resources. Doing the lookup at runtime is easier than trying to perform the
    // lookup at synthesis time or requiring knowing the specific ID of the TGW.
    //
    // This also returns only the first Transit Gateway found in the account. If there
    // is more than one Transit Gateway in the account, this is not guaranteed to always
    // return the same Transit Gateway (because there is not guaranteed ordering in the
    // EC2 DescribeTransitGateways API). This will fail if there are not any Transit
    // Gateways in an account. Without writing custom code, there isn't an obvious way to
    // return an error if there is more than one Transit Gateway.
    //
    // Using the EC2 DescribeTransitGateways API was selected over the RAM ListResources
    // API to avoid relying on an implementation detail about how the resource is shared
    // as well as the name of the EC2 API call being more expressive. ListResources does not
    // provide any greater controls to filter the resource without knowing the ID of the
    // account sharing the TGW or the resource ARN of the TGW.
    //
    // Ideally this information would instead be shared with us via Systems Manager Parameter
    // Store (or at least the Account ID that owns the TGW) and we would not need to rely
    // on a custom resource or "guessing" the right gateway.
    const findTgw = new custom.AwsCustomResource(this, "FindTransitGateway", {
      onCreate: {
        service: "EC2",
        action: "describeTransitGateways",
        physicalResourceId: custom.PhysicalResourceId.fromResponse("TransitGateways.0.TransitGatewayId"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: custom.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    return findTgw.getResponseField("TransitGateways.0.TransitGatewayId");
  }
}
