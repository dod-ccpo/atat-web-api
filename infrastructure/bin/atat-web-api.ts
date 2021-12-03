#!/usr/bin/env node
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import { NIST80053R4Checks } from "cdk-nag";
import "source-map-support/register";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compat";
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

interface Parameters {
  environmentName: string;
  environmentId: string;
  vpcCidr: string;
  baseEnv: string;
}

function resolveContextParameters(app: cdk.App): Parameters {
  const environmentParam = app.node.tryGetContext("EnvironmentId");
  if (!isString(environmentParam)) {
    throw new Error("An EnvironmentId must be provided");
  }
  const vpcCidrParam = app.node.tryGetContext("VpcCidr") ?? ec2.Vpc.DEFAULT_CIDR_RANGE;
  const baseEnvParam = app.node.tryGetContext("BaseEnv") ?? environmentParam;
  return {
    environmentName: normalizeEnvironmentName(environmentParam),
    environmentId: lowerCaseEnvironmentId(environmentParam),
    baseEnv: normalizeEnvironmentName(baseEnvParam),
    vpcCidr: vpcCidrParam,
  };
}

function applyTags(stacks: cdk.Stack[]): void {
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
}

function deployNetStack() {
  return [process.env.ATAT_DEPLOY_BASE, process.env.ATAT_DEPLOY_NET].some((deployVar) => deployVar === "1");
}

function deployIamStack() {
  return [process.env.ATAT_DEPLOY_BASE, process.env.ATAT_DEPLOY_IAM].some((deployVar) => deployVar === "1");
}

function createApp(): cdk.App {
  const app = new cdk.App();
  if (process.env.CDK_NAG_ENABLED === "1") {
    cdk.Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
  }
  const params = resolveContextParameters(app);
  const stacks: cdk.Stack[] = [];
  // Delete all resources in developer-specific sandbox environments by default, while
  // using the default for the specially-named long-lived "sandbox" resources, used
  // for persistent IAM configuration, etc.
  if (isPossibleTemporaryEnvironment(params.environmentId)) {
    cdk.Aspects.of(app).add(new RemovalPolicySetter({ globalRemovalPolicy: cdk.RemovalPolicy.DESTROY }));
  }

  // Only deploy this stack if it has been explicitly enabled. Having duplicate
  // and untested IAM resources in an account could cause issues. This
  // particular stack is likely going to need CAPABILITY_NAMED_IAM for usability
  // so
  if (deployIamStack()) {
    const iam = new AtatIamStack(app, params.environmentName + "AtatIamStack", {
      terminationProtection: true,
    });
    stacks.push(iam);
  }
  if (deployNetStack()) {
    const net = new AtatNetStack(app, params.environmentName + "AtatNetStack", {
      vpcCidr: params.vpcCidr,
      terminationProtection: true,
    });
    stacks.push(net);
  }

  stacks.forEach((stack) => {
    cdk.Annotations.of(stack).addWarning(
      "Deploying multiple base stacks in an account may cause issues. " +
        "Verify there is not already an base stack or that the existing stack is " +
        "being updated."
    );
  });

  if (!deployNetStack() && !deployIamStack()) {
    stacks.push(
      new AtatWebApiStack(app, params.environmentName + "AtatWebApiStack", {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        },
        environmentId: params.environmentId,
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
        requireAuthorization:
          !isPossibleTemporaryEnvironment(params.environmentId) || process.env.ATAT_REQUIRE_AUTH !== "false",
        vpcName: `${params.baseEnv}AtatVpc`,
      })
    );
  }

  applyTags(stacks);
  // This needs to be applied basically last to ensure no breaking properties
  // get applied after the aspect.
  cdk.Aspects.of(app).add(new GovCloudCompatibilityAspect());

  return app;
}
