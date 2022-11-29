import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface NetworkTroubleshootingStackProps extends cdk.StackProps {
  /**
   * The VPC where the EC2 instance will be created.
   */
  vpc: ec2.IVpc;
}

export class NetworkTroubleshootingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NetworkTroubleshootingStackProps) {
    super(scope, id, props);

    const userData = ec2.UserData.forLinux();
    // Install Nginx so that something is listening; this will allow us to test
    // non-ICMP/UDP ports for traceroute, in addition to curl/wget.
    userData.addCommands("amazon-linux-extras install nginx");

    const instance = new ec2.Instance(this, "Instance", {
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.MEDIUM),
      // These AMIs have the SSM agent included out-of-the-box without additional configuration
      // required, besides the necessary permissions on the IAM role.
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        edition: ec2.AmazonLinuxEdition.STANDARD,
      }),
      userData,
      requireImdsv2: true,
      propagateTagsToVolumeOnCreation: true,
    });

    // Allow any host to reach this instance on 80/TCP or via ICMP
    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(80));
    instance.connections.allowFromAnyIpv4(ec2.Port.allIcmp());

    // Ensure that Systems Manager Session Manager property works on this instance, allowing
    // connections without having to expose/forward port 22
    instance.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

    // These outputs make it easier to view information about the instance at a glance
    new cdk.CfnOutput(this, "InstanceIp", { value: instance.instancePrivateIp });
    new cdk.CfnOutput(this, "InstanceId", { value: instance.instanceId });
    new cdk.CfnOutput(this, "InstanceAz", { value: instance.instanceAvailabilityZone });
    new cdk.CfnOutput(this, "InstanceRole", { value: instance.role.roleArn });
  }
}
