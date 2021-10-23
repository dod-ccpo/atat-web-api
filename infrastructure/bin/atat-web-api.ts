#!/usr/bin/env node
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import { NIST80053R4Checks } from "cdk-nag";
import "source-map-support/register";
import { AtatIamStack } from "../lib/atat-iam-stack";
import { AtatNetStack } from "../lib/atat-net-stack";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";
import { isString, lowerCaseEnvironmentId, normalizeEnvironmentName } from "../lib/util";

const app = new cdk.App();
if (process.env.CDK_NAG_ENABLED === "1") {
  cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
}
// TODO: Dynamically set this based on whether this is a sandbox environment,
// a dev environment, or something else. For now, destroy everything on delete.
const removalPolicy = cdk.RemovalPolicy.DESTROY;

// Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
const environmentParam = app.node.tryGetContext("EnvironmentId") ?? app.node.tryGetContext("TicketId");

if (!isString(environmentParam)) {
  console.error("An EnvironmentId must be provided");
  process.exit(1);
}
if (app.node.tryGetContext("TicketId")) {
  console.warn("The TicketId context item is deprecated. Migrate to EnvironmentId.");
}

const environmentName = normalizeEnvironmentName(environmentParam);
const environmentId = lowerCaseEnvironmentId(environmentParam);

const netStack = new AtatNetStack(app, environmentName + "AtatNetStack", {
  vpcCidr: "10.10.0.0/16",
});

const stacks: cdk.Stack[] = [
  new AtatWebApiStack(app, environmentName + "AtatWebApiStack", {
    removalPolicy,
    environmentId,
    idpProps: {
      secretName: "auth/oidc/aad",
      providerName: "ATATDevAAD",
    },
    smtpProps: {
      secretName: "email/smtp",
    },
    requireAuthorization: process.env.ATAT_REQUIRE_AUTH !== "false",
    vpc: netStack.vpc,
  }),
  netStack,
];

// Only deploy this stack if it has been explicitly enabled. Having duplicate
// and untested IAM resources in an account could cause issues. This
// particular stack is likely going to need CAPABILITY_NAMED_IAM for usability
// so
if (process.env.ATAT_DEPLOY_IAM === "1") {
  stacks.push(new AtatIamStack(app, environmentName + "AtatIamStack"));
  cdk.Annotations.of(stacks[stacks.length - 1]).addWarning(
    "Deploying multiple IAM stacks in an account may cause issues. " +
      "Verify there is not already an IAM stack or that the existing stack is " +
      "being updated."
  );
}

// Perform operations on all stacks
for (const stack of stacks) {
  // Apply tags from both tag files; warn if unable to load tags from either
  const tagFiles = ["tags.json", "tags-private.json"];
  for (const tagFile of tagFiles) {
    try {
      getTags(tagFile).forEach((tag) => cdk.Tags.of(stack).add(tag.key, tag.value));
    } catch (err) {
      cdk.Annotations.of(stack).addInfo("Unable to load tags from " + tagFile);
    }
  }
}
