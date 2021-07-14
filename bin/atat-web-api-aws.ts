#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import "source-map-support/register";
import { AtatWebApiAwsStack } from "../lib/atat-web-api-aws-stack";

const app = new cdk.App();
const accountId = app.node.tryGetContext("account");
const region = app.node.tryGetContext("region");
const stack = new AtatWebApiAwsStack(app, "AtatWebApiAwsStack", {
  env: { account: accountId, region },
});
