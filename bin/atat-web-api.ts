#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
// import { NIST80053R4Checks, NIST80053R5Checks } from "cdk-nag";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";

const app = new cdk.App();
// These Aspects will not be enabled until more base infrastructure around KMS, etc
// is in place.
// cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// cdk.Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());

new AtatWebApiStack(app, "AtatWebApiStack", {});
