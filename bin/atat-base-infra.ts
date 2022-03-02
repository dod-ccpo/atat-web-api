#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
// import { NIST80053R4Checks, NIST80053R5Checks } from "cdk-nag";
import { AtatIamStack } from "../lib/atat-iam-stack";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { AtatNetStack } from "../lib/atat-net-stack";
import * as utils from "../lib/util";

const app = new cdk.App();
// These Aspects will not be enabled until more base infrastructure around KMS, etc
// is in place.
// cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// cdk.Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
const environmentParam = app.node.tryGetContext("atat:EnvironmentId");

if (!utils.isString(environmentParam)) {
  console.error("An EnvironmentId must be provided");
  process.exit(1);
}

const environmentName = utils.normalizeEnvironmentName(environmentParam);
const environmentId = utils.lowerCaseEnvironmentId(environmentParam);

// These Aspects will not be enabled until more base infrastructure around KMS, etc
// is in place.
// cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// cdk.Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());

// const netStack = new AtatNetStack(app, `${environmentName}AtatNetStack`, {
//   vpcCidr: app.node.tryGetContext("atat:VpcCidr"),
// });
const iamStack = new AtatIamStack(app, `${environmentName}AtatIamStack`);
