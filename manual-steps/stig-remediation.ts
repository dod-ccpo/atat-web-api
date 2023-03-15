#!/usr/bin/env ts-node

import { IAM } from "@aws-sdk/client-iam";
import { S3Control } from "@aws-sdk/client-s3-control";
import { STS } from "@aws-sdk/client-sts";
import { EC2 } from "@aws-sdk/client-ec2";

const iam = new IAM({ useFipsEndpoint: true });
const s3Control = new S3Control({ useFipsEndpoint: true });
const sts = new STS({ useFipsEndpoint: true });
const ec2 = new EC2({ useFipsEndpoint: true });

async function getAccountId(): Promise<string> {
  return (await sts.getCallerIdentity({})).Account!;
}

/**
 * At an account level, block public access to all S3 buckets and objects.
 * This ensures that all access must be authenticated and authorized.
 */
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

/**
 * Set the IAM password policy to comply with organizational requirements.
 */
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

/**
 * Use the default KMS key for EBS to encrypt all EBS volumes by default.
 * There shouldn't be any EBS volumes but if one happens to exist, it will
 * be encrypted using the default `aws/ebs` KMS key.
 */
async function setDefaultEbsEncryption() {
  // First reset to using the default KMS key ID
  await ec2.resetEbsDefaultKmsKeyId({});
  const enableResult = await ec2.enableEbsEncryptionByDefault({});
  if (!enableResult.EbsEncryptionByDefault) {
    throw new Error("EBS Encryption by Default is not enabled");
  }
}

blockS3PublicAccess();
setIamPasswordPolicy();
setDefaultEbsEncryption();
