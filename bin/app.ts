import * as cdk from "aws-cdk-lib";
import * as utils from "../lib/util";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { AtatPipelineStack } from "../lib/atat-pipeline-stack";

export function createApp(props?: cdk.AppProps): cdk.App {
  const app = new cdk.App(props);

  const environmentParam = app.node.tryGetContext("atat:EnvironmentId");
  const sandboxParam = app.node.tryGetContext("atat:Sandbox");
  const vpcCidrParam = app.node.tryGetContext("atat:VpcCidr");

  if (!utils.isString(environmentParam)) {
    const err = "An EnvironmentId must be provided (use the atat:EnvironmentId context key)";
    console.error(err);
    throw new Error(err);
  }

  const environmentName = utils.normalizeEnvironmentName(environmentParam);
  // We need to be able to handle the value being undefined or some unexpected type.
  // Because "false" (as a string) is truthy, we need to allow specific values.
  const isSandbox = ["true", "1", "yes"].includes(String(sandboxParam).toLowerCase());

  // For a sandbox environment, developers are allowed to deploy just the API stack
  // (and in fact, that is preferred). Aspects get applied directly to ensure that
  // resources are torn down and that the stack will work in GovCloud (which is where
  // most/all development occurs). Within the pipeline, applying aspects and choosing
  // the specific stacks to deploy happens within the Stage resource. In fact, within
  // the pipeline, things that we do to the app here have no effect. Any Aspects
  // applied here will impact _only_ the pipeline stack itself (but should take effect
  // either through a manual deployment or the automatic self-mutation step).
  if (isSandbox) {
    // Sandbox environments (which do NOT have a VPC) must NOT have a VpcCidr parameter
    if (utils.isString(vpcCidrParam) || validateCidr(vpcCidrParam)) {
      const err = "A VpcCidr must NOT be provided for Sandbox environments.";
      console.error(err);
      throw new Error(err);
    }
    const apiStack = new AtatWebApiStack(app, `${environmentName}WebApi`, {
      environmentName,
    });
    cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
    cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());
  } else {
    // Non Sandbox environments (which have a VPC) must have a VpcCidr parameter
    if (!utils.isString(vpcCidrParam) || !validateCidr(vpcCidrParam)) {
      const err =
        "A VpcCidr must be provided for non-Sandbox environments (use the atat:VpcCidr context key) " +
        "and it must be a valid CIDR block.";
      console.error(err);
      throw new Error(err);
    }

    // Context values can not be supplied via the CLI during self-mutation; therefore, we
    // cannot include the environment name in the stack at this time. This does limit
    // us to having a single pipeline per account until we come up with a more thorough
    // solution (but that is likely okay for now). A workaround to this is that if you
    // do need to perform integration testing for the pipeline (by building a test stack),
    // you can just temporarily change the `id` parameter from "Pipeline" to another
    // static value.
    const pipelineStack = new AtatPipelineStack(app, "AtatEnvironmentPipeline", {
      environmentName,
      vpcCidr: vpcCidrParam,
      repository: app.node.tryGetContext("atat:VersionControlRepo"),
      branch: app.node.tryGetContext("atat:VersionControlBranch"),
      githubPatName: app.node.tryGetContext("atat:GitHubPatName"),
    });
  }
  return app;
}

// Ensure that we have a CIDR block that will be allowed by AWS VPC
function validateCidr(cidr: string): boolean {
  const AWS_MIN_NETMASK = 16;
  const AWS_MAX_NETMASK = 28;
  try {
    const [address, prefix] = cidr.split("/");
    const prefixInt = parseInt(prefix);
    if (!prefixInt || prefixInt < AWS_MIN_NETMASK || prefixInt > AWS_MAX_NETMASK) {
      return false;
    }
    const octets = address
      .split(".")
      .map((oct) => parseInt(oct))
      .filter((oct) => oct >= 0 && oct <= 255);
    return octets.length === 4;
  } catch (err) {
    return false;
  }
}
