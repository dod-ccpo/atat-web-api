import * as ec2 from "@aws-cdk/aws-ec2";
import { InterfaceVpcEndpointAwsService } from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as custom from "@aws-cdk/custom-resources";

export interface AtatNetStackProps extends cdk.StackProps {
  vpcCidr?: string;
}

export class AtatNetStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly endpoints: ec2.IVpcEndpoint[] = [];
  public readonly outputs: cdk.CfnOutput[] = [];

  constructor(scope: cdk.Construct, id: string, props: AtatNetStackProps) {
    super(scope, id);
    const vpc = new ec2.Vpc(this, "AtatVpc", {
      cidr: props.vpcCidr,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "app",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    // Default is capturing all logs and pushing to CloudWatchLogs
    vpc.addFlowLog("AllFlowLogs");
    this.vpc = vpc;
    this.outputs.push(
      new cdk.CfnOutput(this, "VpcId", {
        value: this.vpc.vpcId,
      })
    );

    const transitGatewayId = this.findTransitGateway();

    // This resource type does not seem to be available in AWS GovCloud (US) yet; however, it is
    // documented and available in the Commercial partition. It is far less fragile than
    // AWS::EC2::TransitGatewayAttachment and so we should try to make use of it when it
    // becomes available.
    // const tgwAttachment = new ec2.CfnTransitGatewayVpcAttachment(this, "TgwAttachment", {
    //   vpcId: vpc.vpcId,
    //   subnetIds: vpc.isolatedSubnets.map((subnet) => (subnet as ec2.Subnet).subnetId),
    //   options: {
    //     DnsSupport: "enable",
    //   },
    //   transitGatewayId: transitGatewayId,
    // });
    const tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, "VpcTgwAttachment", {
      vpcId: vpc.vpcId,
      subnetIds: vpc.isolatedSubnets.map((subnet) => (subnet as ec2.Subnet).subnetId),
      transitGatewayId: transitGatewayId,
    });
    this.addDefaultTransitGatewayRoute(tgwAttachment);

    const dynamodbEndpoint = vpc.addGatewayEndpoint("DynamodbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
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
      service: new InterfaceVpcEndpointAwsService("xray"),
    });
    this.endpoints.push(
      dynamodbEndpoint,
      s3Endpoint,
      apiGatewayEndpoint,
      lambdaEndpoint,
      logsEndpoint,
      sqsEndpoint,
      xrayEndpoint
    );
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
        destinationCidrBlock: "0.0.0.0/0",
        transitGatewayId: transitGatewayAttachment.transitGatewayId,
      });
      // Because only the TransitGatewayId gets passed to the CfnRoute, we may not
      // necessarily have the implicit dependency that we'd expect. If the route
      // starts Creation before the attachment is accepted and attached then the
      // route will fail to be created and the stack creation will fail.
      route.addDependsOn(transitGatewayAttachment);
      // We need to disable this check because we're actually bypassing the
      // private member check in TypeScript. This is because we may want to leverage
      // the actual `internetConnectivityEstablished` attribute later
      // eslint-disable-next-line dot-notation
      subnet["_internetConnectivityEstablished"].add(route);
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
