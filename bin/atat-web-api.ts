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
const sandboxParam = app.node.tryGetContext("atat:Sandbox");

if (!utils.isString(environmentParam)) {
  console.error("An EnvironmentId must be provided");
  process.exit(1);
}

const environmentName = utils.normalizeEnvironmentName(environmentParam);
const environmentId = utils.lowerCaseEnvironmentId(environmentParam);
const isSandbox = String(sandboxParam).toLowerCase() === "true";

// These Aspects will not be enabled until more base infrastructure around KMS, etc
// is in place.
// cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// cdk.Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());

// Sandbox environments get just the API, all other environments get a pipeline to
// actually handle the deployments.
if (isSandbox) {
  const apiStack = new AtatWebApiStack(app, `${environmentName}WebApi`, {
    environmentName,
  });
  cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
} else {
  const pipelineStack = new AtatPipelineStack(app, `${environmentName}Pipeline`, {
    environmentName,
    branch: app.node.tryGetContext("atat:VersionControlBranch"),
    githubPatName: app.node.tryGetContext("atat:GitHubPatName"),
    repository: app.node.tryGetContext("atat:VersionControlRepo"),
  });
}
