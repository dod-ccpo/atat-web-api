#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { NIST80053Checks } from "cdk-nag";
import "source-map-support/register";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";

const app = new cdk.App();
if (process.env.CDK_NAG_ENABLED === "1") {
  cdk.Aspects.of(app).add(new NIST80053Checks({ verbose: true }));
}

// Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
const ticketId = app.node.tryGetContext("TicketId") || "";
const stack = new AtatWebApiStack(app, ticketId + "AtatWebApiStack", {});
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
