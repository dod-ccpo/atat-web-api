#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import "source-map-support/register";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";

const app = new cdk.App();
const accountId = app.node.tryGetContext("account");
const region = app.node.tryGetContext("region");
// Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
const ticketId = app.node.tryGetContext("TicketId") || "";
if (ticketId === "") {
  console.warn("Hello Developer. You must provide a context variable named 'TicketId'.");
  console.warn("  For example...");
  console.warn('  $ cdk deploy -c "TicketId=AT1234"');
}
const stack = new AtatWebApiStack(app, ticketId + "AtatWebApiStack", {
  env: { account: accountId, region },
});

// Apply tags from both tag files; warn if unable to load tags from either
const tagFiles = ["tags.json", "tags-private.json"];
for (const tagFile of tagFiles) {
  try {
    getTags(tagFile).forEach((tag) => cdk.Tags.of(stack).add(tag.key, tag.value));
  } catch (err) {
    console.info("INFO: Unable to load tags from " + tagFile);
  }
}
