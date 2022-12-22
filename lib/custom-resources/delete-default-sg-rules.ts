import { EC2, SecurityGroupRule } from "@aws-sdk/client-ec2";
import type { OnEventRequest, OnEventResponse } from "aws-cdk-lib/custom-resources/lib/provider-framework/types";

const ec2 = new EC2({ useFipsEndpoint: true });

/**
 * Handle CloudFormation Custom Resource events using the CDK Custom Resource Provider Framework.
 *
 * This will delete all Security Group Rules (Ingress and Egress) on the given Security
 * Group. This is done by querying the list of rules and then performing the delete because
 * there is no atomic operation for this.
 *
 * This _does not_ restore rules on a "Delete" or "Update" event. Any rules deleted during
 * a "Create" event are deleted forever unless manually recreated.
 */
export async function onEvent(event: OnEventRequest): Promise<OnEventResponse> {
  // There is no data to provide on a Delete operation and no resources were
  // actually created so there's nothing for us to actually destroy. The associated
  // VPC is likely about to be deleted. We _could_ try and add the rules back but
  // that is a lot of complexity.
  if (event.RequestType === "Delete") {
    return {};
  }
  // Yikes hopefully this never happens! This means someone updated the ResourceProperties
  // passed to this custom resource... which means we now apply to a new VPC. We should
  // properly remove the rules but, as we did in Delete, we're going to ignore the old
  // VPC and hope that it's just being deleted.
  if (event.RequestType === "Update") {
    console.log("Applying remediation to a new VPC without restoring the old one");
  }

  const groupId = event.ResourceProperties.DefaultSecurityGroupId;
  if (!groupId) {
    throw new Error("DefaultSecurityGroupId property is required");
  }
  const securityGroupRules = await getExistingSecurityGroupRules(groupId);
  await deleteAllIngressRules(groupId, securityGroupRules);
  await deleteAllEgressRules(groupId, securityGroupRules);

  return {
    PhysicalResourceId: groupId,
    Data: {
      DeletedRules: securityGroupRules,
    },
  };
}

async function getExistingSecurityGroupRules(groupId: string): Promise<SecurityGroupRule[]> {
  const result = await ec2.describeSecurityGroupRules({
    Filters: [{ Name: "group-id", Values: [groupId] }],
  });
  if (result.SecurityGroupRules === undefined) {
    throw new Error(`Unable to find SG with ID: ${groupId}`);
  }
  return result.SecurityGroupRules;
}

async function deleteSgRuleHelper(groupId: string, rules: SecurityGroupRule[], ruleType: "Egress" | "Ingress") {
  const ids = rules
    .filter((rule) => (ruleType === "Egress" ? !!rule.IsEgress : !rule.IsEgress))
    .map((rule) => rule.SecurityGroupRuleId)
    .filter((id): id is string => !!id);
  if (!ids.length) {
    console.log(`There are no Security Group ${ruleType} rules to delete`);
    return [];
  }

  const command = {
    GroupId: groupId,
    SecurityGroupRuleIds: ids,
  };

  console.log(`Removing Security Group ${ruleType} rules: %j`, command);
  switch (ruleType) {
    case "Egress":
      return ec2.revokeSecurityGroupEgress(command);
    case "Ingress":
      return ec2.revokeSecurityGroupIngress(command);
  }
}

async function deleteAllIngressRules(groupId: string, rules: SecurityGroupRule[]) {
  return deleteSgRuleHelper(groupId, rules, "Ingress");
}

async function deleteAllEgressRules(groupId: string, rules: SecurityGroupRule[]) {
  return deleteSgRuleHelper(groupId, rules, "Egress");
}
