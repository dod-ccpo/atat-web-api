import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";

export interface AtatProps extends cdk.StackProps {
  eventbus?: string;
}

export class EventStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatProps) {
    super(scope, id, props);
    this.templateOptions.description =
      "Creates the necessary networking infrastructure for the ATAT transit environment";
    // Event Rule
    const rule = new events.Rule(this, "TGW-Association-rule", {
      eventPattern: {
        source: ["aws.ec2"],
        detail: {
          eventName: ["CreateTransitGatewayVpcAttachment"],
        },
      },
      //   eventBus: props.eventbus,
    });
  }
}
