import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { IConstruct } from "constructs";

export class UserPermissionBoundary implements cdk.IAspect {
  private readonly policy: iam.ManagedPolicy;
  constructor(boundary: iam.ManagedPolicy) {
    this.policy = boundary;
  }

  visit(node: IConstruct): void {
    if (!(node instanceof iam.User)) {
      return;
    }
    iam.PermissionsBoundary.of(node).apply(this.policy);
  }
}
