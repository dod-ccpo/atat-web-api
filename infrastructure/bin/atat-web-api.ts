#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { NIST80053Checks } from "cdk-nag";
import "source-map-support/register";
import { AtatAuthStack } from "../lib/atat-auth-stack";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";
import { isString, lowerCaseEnvironmentId, normalizeEnvironmentName } from "../lib/util";

const app = new cdk.App();
if (process.env.CDK_NAG_ENABLED === "1") {
  cdk.Aspects.of(app).add(new NIST80053Checks({ verbose: true }));
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

const stacks = [
  new AtatWebApiStack(app, environmentName + "AtatWebApiStack", {
    removalPolicy,
  }),
  new AtatAuthStack(app, environmentName + "AtatAuthStack", {
    secretName: "auth/oidc/aad",
    providerName: "ATATDevAAD",
    environmentId,
    removalPolicy,
  }),
];

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
