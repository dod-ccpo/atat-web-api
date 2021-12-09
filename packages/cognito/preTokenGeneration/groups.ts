import { PreTokenGenerationTriggerEvent } from "aws-lambda";

export function groupsAttribute(): string {
  return process.env.GROUPS_ATTRIBUTE_CLAIM_NAME || "custom:groups";
}

export function processSamlGroupData(groups: string[]): string[] {
  const allGroups = [];
  for (const groupString of groups) {
    allGroups.push(
      ...groupString
        .trim()
        .split(",")
        .map((groupName) => groupName.trim())
        // keep all non-empty values
        .filter((groupName) => groupName)
    );
  }
  return allGroups;
}

export function parseProviderType(event: PreTokenGenerationTriggerEvent): string {
  return JSON.parse(event.request.userAttributes.identities)[0].providerType;
}

export function parseIdpGroups(event: PreTokenGenerationTriggerEvent): string[] {
  // TODO: remove this log once GD integration is successful
  console.log(JSON.stringify(event));
  try {
    return JSON.parse(event.request.userAttributes[groupsAttribute()]);
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "Failed to parse groups",
        expectedAttribute: groupsAttribute(),
        availableAttributes: Object.keys(event.request.userAttributes),
        details: err,
      })
    );
    return [];
  }
}

export function translateGroups(event: PreTokenGenerationTriggerEvent): string[] {
  const newGroups = [];
  const originalGroups = event.request.groupConfiguration.groupsToOverride ?? [];
  const providerType = parseProviderType(event);
  const idpGroups = parseIdpGroups(event);
  if (idpGroups.length === 0) {
    return originalGroups;
  }
  switch (providerType) {
    case "OIDC":
      newGroups.push(...idpGroups);
      break;
    case "SAML":
      newGroups.push(...processSamlGroupData(idpGroups));
      break;
    default:
      // Throwing an error here would likely cause problems with the groups being set
      // instead, we will just log the issue.
      console.warn(
        JSON.stringify({
          message: "Unsupported IdP type. Unable to handle groups.",
          providerType: providerType,
          groupsValue: idpGroups,
        })
      );
      break;
  }
  return [...originalGroups, ...newGroups];
}
