import { aws_stepfunctions as sfn } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SfnPassProps extends sfn.PassProps {
  /**
   * The props for a Pass state
   */
  readonly sfnPass?: sfn.PassProps;
}

/**
 * Creates a Pass that represents a State in the workflow of a
 * State Machine that passes the input to the output.
 */
export class SfnPassState extends Construct {
  /**
   * Props for a Pass state in a State Machine
   */
  readonly sfnPass: sfn.Pass;

  constructor(scope: Construct, id: string, props: SfnPassProps) {
    super(scope, id);
    this.sfnPass = new sfn.Pass(this, id, props.sfnPass ?? {});
  }
}
