#!/usr/bin/env ts-node

import { IAM } from "@aws-sdk/client-iam";
import { S3Control } from "@aws-sdk/client-s3-control";
import { STS } from "@aws-sdk/client-sts";

const iam = new IAM({ useFipsEndpoint: true });
const s3Control = new S3Control({ useFipsEndpoint: true });
const sts = new STS({ useFipsEndpoint: true });

async function getAccountId(): Promise<string> {
  return (await sts.getCallerIdentity({})).Account!;
}

async function blockS3PublicAccess() {
  s3Control.putPublicAccessBlock({
    AccountId: await getAccountId(),
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
}

function setIamPasswordPolicy() {
  iam.updateAccountPasswordPolicy({
    AllowUsersToChangePassword: true,
    HardExpiry: true,
    // V-222545
    MaxPasswordAge: 60,
    // V-222536
    MinimumPasswordLength: 15,
    PasswordReusePrevention: 24,
    RequireLowercaseCharacters: true,
    RequireNumbers: true,
    RequireSymbols: true,
    RequireUppercaseCharacters: true,
  });
}

blockS3PublicAccess();
setIamPasswordPolicy();
