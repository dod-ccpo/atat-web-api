#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import "source-map-support/register";
import { AtatWebApiStack } from "../lib/atat-web-api-stack";
import { getTags } from "../lib/load-tags";

const app = new cdk.App();
const accountId = app.node.tryGetContext("account");
const region = app.node.tryGetContext("region");
const stack = new AtatWebApiStack(app, "AtatWebApiStack", {
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
