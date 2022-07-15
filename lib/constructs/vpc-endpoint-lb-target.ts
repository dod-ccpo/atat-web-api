import * as cdk from "aws-cdk-lib";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as cr from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct, IDependable } from "constructs";

/**
 * Properties to create a TargetGroup pointing to a VPC endpoint
 */
interface VpcEndpointBaseTargetGroupProps {
  /**
   * The VPC Endpoint ID to use as a target for the Target Group.
   */
  readonly endpoint: ec2.IInterfaceVpcEndpoint;
  // This is defined on ApplicationTargetGroupProps as ec2.IVpc | undefined and we want to
  // make sure that it's provided.
  readonly vpc: ec2.IVpc;
}

export type VpcEndpointApplicationTargetGroupProps = elbv2.ApplicationTargetGroupProps &
  VpcEndpointBaseTargetGroupProps;
export type VpcEndpointNetworkTargetGroupProps = elbv2.NetworkTargetGroupProps & VpcEndpointBaseTargetGroupProps;

/**
 * A base construct for creating a TargetGroup pointing to a VPC Endpoint.
 *
 * @param T the type of TargetGroup to create (Application or Network)
 */
abstract class VpcEndpointBaseTargetGroup<T extends elbv2.ITargetGroup>
  extends Construct
  implements elbv2.ITargetGroup
{
  /**
   * The created TargetGroup.
   *
   * Implementing classes may (and should) use this to delegate calls. It should be
   * treated as readonly (but that cannot be enforced).
   */
  protected targetGroup: T;

  /**
   * The JSON data to use to specify the Target information.
   *
   * This will be a CloudFormation intrinsic function (likely a `GetAtt` or `Ref`). It
   * is important to not treat it as if it is a valid object.
   */
  protected readonly targetJson: cdk.IResolvable;

  public get targetGroupName(): string {
    return this.targetGroup.targetGroupName;
  }

  public get targetGroupArn(): string {
    return this.targetGroup.targetGroupArn;
  }

  public get loadBalancerArns(): string {
    return this.targetGroup.loadBalancerArns;
  }

  public get loadBalancerAttached(): IDependable {
    return this.targetGroup.loadBalancerAttached;
  }

  constructor(
    scope: Construct,
    id: string,
    props: VpcEndpointApplicationTargetGroupProps | VpcEndpointNetworkTargetGroupProps
  ) {
    super(scope, id);
    const { endpoint, ...targetGroupProps } = props;

    // TargetType isn't supported but if IP was provided (which we will set it to anyway), then
    // we'll allow that specific value since it doesn't change any behavior
    if (props.targetType && props.targetType !== elbv2.TargetType.IP) {
      throw new Error("targetType is not a supported property for VPC Endpoint Target Groups");
    }
    if (props.targets) {
      throw new Error("Additional targets are not supported for VPC Endpoint Target Groups");
    }

    // This is the custom reasource responsible for building the JSON data that can be used
    // to specify target information for the Load Balancer. This has to be a custom resource
    // because the information that we need (the IP addresses of the ENIs associated with the
    // VPC Endpoint) is not available as an attribute of the CloudFormation resource. In fact,
    // because it requires multiple API calls (ec2:DescribeVpcEndpoints
    // and ec2:DescribeNetworkInterfaces) we cannot use the nicer `AwsCustomResource` construct
    // and instead must write our own handler with the Provider framework.
    const handler = new nodejs.NodejsFunction(this, "VpcEndpointHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: "lib/custom-resources/endpoint-ips.ts",
      handler: "onEvent",
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:DescribeVpcEndpoints", "ec2:DescribeNetworkInterfaces"],
          resources: ["*"],
        }),
      ],
    });
    const vpcEndpointIpProvider = new cr.Provider(this, "VpcEndpointIps", {
      onEventHandler: handler,
    });
    const customResource = new cdk.CustomResource(this, "ApiGatewayEndpointIps", {
      serviceToken: vpcEndpointIpProvider.serviceToken,
      properties: {
        VpcEndpointId: endpoint.vpcEndpointId,
        Port: targetGroupProps.port ?? 443,
      },
    });

    // This is the key within the `Data` field of the custom resource.
    this.targetJson = customResource.getAtt("Targets");
  }
}

/**
 * Allows using a VPC Endpoint as the target for an Application Load Balancer
 */
export class VpcEndpointApplicationTargetGroup
  extends VpcEndpointBaseTargetGroup<elbv2.ApplicationTargetGroup>
  implements elbv2.IApplicationTargetGroup
{
  constructor(scope: Construct, id: string, props: VpcEndpointApplicationTargetGroupProps) {
    super(scope, id, props);
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", props);
    const targetGroupCfn = this.targetGroup.node.defaultChild as elbv2.CfnTargetGroup;
    targetGroupCfn.addPropertyOverride("Targets", this.targetJson);
    targetGroupCfn.addPropertyOverride("TargetType", "ip");
  }

  registerListener(listener: elbv2.IApplicationListener, associatingConstruct?: IConstruct | undefined): void {
    return this.targetGroup.registerListener(listener, associatingConstruct);
  }

  registerConnectable(connectable: ec2.IConnectable, portRange?: ec2.Port | undefined): void {
    return this.targetGroup.registerConnectable(connectable, portRange);
  }

  addTarget(...targets: elbv2.IApplicationLoadBalancerTarget[]): void {
    throw new Error("Additional targets are not supported for VpcEndpointApplicationTargetGroup");
  }
}

/**
 * Allows using a VPC Endpoint as the target for a Network Load Balancer.
 */
export class VpcEndpointNetworkTargetGroup
  extends VpcEndpointBaseTargetGroup<elbv2.NetworkTargetGroup>
  implements elbv2.INetworkTargetGroup
{
  constructor(scope: Construct, id: string, props: VpcEndpointNetworkTargetGroupProps) {
    super(scope, id, props);
    this.targetGroup = new elbv2.NetworkTargetGroup(this, "TargetGroup", props);
    const targetGroupCfn = this.targetGroup.node.defaultChild as elbv2.CfnTargetGroup;
    targetGroupCfn.addPropertyOverride("Targets", this.targetJson);
    targetGroupCfn.addPropertyOverride("TargetType", "ip");
  }

  registerListener(listener: elbv2.INetworkListener): void {
    return this.targetGroup.registerListener(listener);
  }

  addTarget(...targets: elbv2.INetworkLoadBalancerTarget[]): void {
    throw new Error("Additional targets are not supported for VpcEndpointNetworkTargetGroup");
  }
}
