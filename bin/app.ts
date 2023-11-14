import * as cdk from "aws-cdk-lib";
import * as utils from "../lib/util";
import { ApiCertificateOptions, AtatWebApiStack } from "../lib/atat-web-api-stack";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { AtatPipelineStack } from "../lib/atat-pipeline-stack";
import { AtatContextValue } from "../lib/context-values";

export function createApp(props?: cdk.AppProps): cdk.App {
  const app = new cdk.App(props);

  const environmentParam = AtatContextValue.ENVIRONMENT_ID.resolve(app);
  const sandboxParam = AtatContextValue.SANDBOX_ENVIRONMENT.resolve(app);
  const vpcCidrParam = AtatContextValue.VPC_CIDR.resolve(app);
  const apiDomainParam = AtatContextValue.API_DOMAIN_NAME.resolve(app);
  const apiCertParam = AtatContextValue.API_CERTIFICATE_ARN.resolve(app);
  const deployRegion = AtatContextValue.DEPLOY_REGION.resolve(app);
  const vpcFlowLogBucketParam = AtatContextValue.VPC_FLOW_LOG_BUCKET.resolve(app);
  const branchParam = AtatContextValue.VERSION_CONTROL_BRANCH.resolve(app);

  if (!utils.isString(environmentParam)) {
    const err = `An EnvironmentId must be provided (use the ${AtatContextValue.ENVIRONMENT_ID} context key)`;
    console.error(err);
    throw new Error(err);
  }

  let apiCertOptions: ApiCertificateOptions | undefined;

  if (utils.isString(apiDomainParam) !== utils.isString(apiCertParam)) {
    const err =
      `Both or neither of ${AtatContextValue.API_DOMAIN_NAME} ` +
      `and ${AtatContextValue.API_CERTIFICATE_ARN} must be specified`;
    console.error(err);
    throw new Error(err);
  } else if (apiDomainParam && apiCertParam) {
    apiCertOptions = {
      domainName: apiDomainParam,
      acmCertificateArn: apiCertParam,
    };
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
      const err = `${AtatContextValue.VPC_CIDR} must NOT be provided for Sandbox environments.`;
      console.error(err);
      throw new Error(err);
    }
    const apiStack = new AtatWebApiStack(app, `${environmentName}WebApi`, {
      environmentName,
      vpcFlowLogBucket: vpcFlowLogBucketParam,
      isSandbox,
      apiDomain: apiCertOptions,
      env: {
        region: deployRegion,
      },
    });
    cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
    cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());
  } else {
    // Non Sandbox environments (which have a VPC) must have a VpcCidr parameter
    if (!utils.isString(vpcCidrParam) || !validateCidr(vpcCidrParam)) {
      const err =
        `A VpcCidr must be provided for non-Sandbox environments (use the ${AtatContextValue.VPC_CIDR} context key) ` +
        "and it must be a valid CIDR block.";
      console.error(err);
      throw new Error(err);
    }
    if (!utils.isString(vpcFlowLogBucketParam)) {
      const err =
        `A bucket to store VPC Flow Logs must be provided` +
        `(use the ${AtatContextValue.VPC_FLOW_LOG_BUCKET} context key).`;
      console.error(err);
      throw new Error(err);
    }

    if (!utils.isString(branchParam)) {
      const err = `A Branch name must be provided (use the ${AtatContextValue.VERSION_CONTROL_BRANCH} context key)`;
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
      branch: branchParam,
      apiDomain: apiCertOptions,
      vpcFlowLogBucket: vpcFlowLogBucketParam,
      // Set the notification email address, unless we're building the account where
      // sandbox environments live because our inboxes would never recover.
      notificationEmail: environmentName === "Sandbox" ? undefined : AtatContextValue.NOTIFICATION_EMAIL.resolve(app),
      env: {
        region: deployRegion,
      },
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
