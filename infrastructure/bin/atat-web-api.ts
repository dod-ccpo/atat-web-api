#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { NIST80053Checks } from "cdk-nag";
import "source-map-support/register";
import { AtatAuthStack } from "../lib/atat-auth-stack";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";

const app = new cdk.App();
if (process.env.CDK_NAG_ENABLED === "1") {
  cdk.Aspects.of(app).add(new NIST80053Checks({ verbose: true }));
}
// TODO: Dynamically set this based on whether this is a sandbox environment,
// a dev environment, or something else. For now, destroy everything on delete.
const removalPolicy = cdk.RemovalPolicy.DESTROY;

// Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
const ticketId = app.node.tryGetContext("TicketId") || "";
const stacks = [];
stacks.push(
  new AtatWebApiStack(app, ticketId + "AtatWebApiStack", {
    removalPolicy,
  })
);
stacks.push(
  new AtatAuthStack(app, ticketId + "AtatAuthStack", {
    secretName: "auth/oidc/aad",
    providerName: "ATATDevAAD",
    ticketId,
    removalPolicy,
  })
);

// Perform operations on all stacks
for (const stack of stacks) {
  if (!ticketId) {
    cdk.Annotations.of(stack).addWarning("A TicketId should be provided to isolate your deployment from others");
  }

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
