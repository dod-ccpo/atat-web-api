#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
// import { NIST80053R4Checks, NIST80053R5Checks } from "cdk-nag";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { AtatPipelineStack } from "../lib/atat-pipeline-stack";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import * as utils from "../lib/util";

const app = new cdk.App();

const environmentParam = app.node.tryGetContext("atat:EnvironmentId");

if (!utils.isString(environmentParam)) {
  console.error("An EnvironmentId must be provided");
  process.exit(1);
}

const environmentName = utils.normalizeEnvironmentName(environmentParam);
const environmentId = utils.lowerCaseEnvironmentId(environmentParam);

// Delete all resources in developer-specific sandbox environments by default, while
// using the default for the specially-named long-lived "sandbox" resources, used
// for persistent IAM configuration, etc.
if (utils.isPossibleTemporaryEnvironment(environmentId)) {
  cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
}
// These Aspects will not be enabled until more base infrastructure around KMS, etc
// is in place.
// cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// cdk.Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());

const apiStack = new AtatPipelineStack(app, `Pipeline`, {
  environmentName,
  branch: "feature/cdk-pipelines",
  githubPatSecretPath: "auth/github/pat-7176", // pragma: allowlist secret
});
