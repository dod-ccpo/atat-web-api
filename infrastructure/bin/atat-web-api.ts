#!/usr/bin/env node
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import { NIST80053R4Checks } from "cdk-nag";
import "source-map-support/register";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import { AtatIamStack } from "../lib/atat-iam-stack";
import { AtatNetStack } from "../lib/atat-net-stack";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";
import {
  isString,
  lowerCaseEnvironmentId,
  normalizeEnvironmentName,
  isPossibleTemporaryEnvironment,
} from "../lib/util";

const app = new cdk.App();
if (process.env.CDK_NAG_ENABLED === "1") {
  cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
}

// Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
const environmentParam = app.node.tryGetContext("EnvironmentId") ?? app.node.tryGetContext("TicketId");
const vpcCidrParam = app.node.tryGetContext("VpcCidr") ?? ec2.Vpc.DEFAULT_CIDR_RANGE;

if (!isString(environmentParam)) {
  console.error("An EnvironmentId must be provided");
  process.exit(1);
}
if (app.node.tryGetContext("TicketId")) {
  console.warn("The TicketId context item is deprecated. Migrate to EnvironmentId.");
}

const environmentName = normalizeEnvironmentName(environmentParam);
const environmentId = lowerCaseEnvironmentId(environmentParam);

// Delete all resources in developer-specific sandbox environments by default, while
// using the default for the specially-named long-lived "sandbox" resources, used
// for persistent IAM configuration, etc.
if (isPossibleTemporaryEnvironment(environmentId)) {
  cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
}

const netStack = new AtatNetStack(app, environmentName + "AtatNetStack", {
  vpcCidr: vpcCidrParam,
});

const stacks: cdk.Stack[] = [
  new AtatWebApiStack(app, environmentName + "AtatWebApiStack", {
    environmentId,
    idpProps: [
      {
        secretName: "auth/oidc/aad",
        providerName: "ATATDevAAD",
      },
      {
        secretName: "auth/oidc/gd",
        providerName: "GlobalDirectory",
      },
    ],
    smtpProps: {
      secretName: "email/smtp",
    },
    // Require authorization whenever we're deploying a non-temporary environment
    // or in temporary environments that have "ATAT_REQUIRE_AUTH" unset or set to
    // any value other than "false"
    requireAuthorization: !isPossibleTemporaryEnvironment(environmentId) || process.env.ATAT_REQUIRE_AUTH !== "false",
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
