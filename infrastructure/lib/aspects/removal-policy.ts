import * as cdk from "@aws-cdk/core";

export interface RemovalPolicySetterProps {
  globalRemovalPolicy?: cdk.RemovalPolicy;
}

/**
 * Consistently apply a RemovalPolicy to all nodes in the tree.
 */
export class RemovalPolicySetter implements cdk.IAspect {
  private readonly globalRemovalPolicy?: cdk.RemovalPolicy;
  constructor(props?: RemovalPolicySetterProps) {
    this.globalRemovalPolicy = props?.globalRemovalPolicy;
  }

  public visit(node: cdk.IConstruct): void {
    // Removal policies must be set only (and directly) on CfnResource objects,
    // the higher level constructs don't support it. We also should not set one
    // if one was not provided (at the risk of returning it to undefined)
    if (node instanceof cdk.CfnResource && this.globalRemovalPolicy) {
      node.applyRemovalPolicy(this.globalRemovalPolicy);
    }
  }
}
