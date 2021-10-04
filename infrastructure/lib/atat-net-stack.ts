import * as ec2 from "@aws-cdk/aws-ec2";
import { CfnTransitGatewayAttachment, IVpcEndpoint } from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as custom from "@aws-cdk/custom-resources";

export interface AtatNetStackProps extends cdk.StackProps {
  vpcCidr?: string;
}

export class AtatNetStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly endpoints: IVpcEndpoint[] = [];

  constructor(scope: cdk.Construct, id: string, props: AtatNetStackProps) {
    super(scope, id);
    const vpc = new ec2.Vpc(this, "AtatVpc", {
      cidr: props.vpcCidr,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "poc",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    this.vpc = vpc;
    const vpcOutput = new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
    });
    const transitGatewayId = this.findTransitGateway();
    const tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, "VpcTgwAttachment", {
      vpcId: vpc.vpcId,
      subnetIds: vpc.isolatedSubnets.map((subnet) => (subnet as ec2.Subnet).subnetId),
      transitGatewayId: transitGatewayId,
    });
    // This resource type does not seem to be available in AWS GovCloud (US) yet; however, it is
    // documented and available in the Commercial partition. It is far less fragile than
    // AWS::EC2::TransitGatewayAttachment and so we should try to make use of it.
    // const tgwAttachment = new ec2.CfnTransitGatewayVpcAttachment(this, "TgwAttachment", {
    //   vpcId: vpc.vpcId,
    //   subnetIds: vpc.isolatedSubnets.map((subnet) => (subnet as ec2.Subnet).subnetId),
    //   options: {
    //     DnsSupport: "enable",
    //   },
    //   transitGatewayId: transitGatewayId,
    // });
    this.addDefaultTransitGatewayRoute(tgwAttachment);

    const dynamodbEndpoint = vpc.addGatewayEndpoint("DynamodbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
    const s3Endpoint = vpc.addInterfaceEndpoint("S3Endpoint", {
      service: { name: `com.amazonaws.${cdk.Aws.REGION}.s3`, port: 443, privateDnsDefault: false },
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
    this.endpoints.push(dynamodbEndpoint, s3Endpoint, apiGatewayEndpoint, lambdaEndpoint, logsEndpoint, sqsEndpoint);
  }

  private addDefaultTransitGatewayRoute(transitGatewayAttachment: CfnTransitGatewayAttachment) {
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
