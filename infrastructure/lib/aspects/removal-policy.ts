import { RemovalPolicy, CfnResource, IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";

export interface RemovalPolicySetterProps {
  globalRemovalPolicy?: RemovalPolicy;
}

/**
 * Consistently apply a RemovalPolicy to all nodes in the tree.
 */
export class RemovalPolicySetter implements IAspect {
  private readonly globalRemovalPolicy?: RemovalPolicy;
  constructor(props?: RemovalPolicySetterProps) {
    this.globalRemovalPolicy = props?.globalRemovalPolicy;
  }

  public visit(node: IConstruct): void {
    // Removal policies must be set only (and directly) on CfnResource objects,
    // the higher level constructs don't support it. We also should not set one
    // if one was not provided (at the risk of returning it to undefined)
    if (node instanceof CfnResource && this.globalRemovalPolicy) {
      node.applyRemovalPolicy(this.globalRemovalPolicy);
    }
  }
}
