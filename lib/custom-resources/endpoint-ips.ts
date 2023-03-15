import { EC2, NetworkInterface } from "@aws-sdk/client-ec2";
import type { OnEventRequest, OnEventResponse } from "aws-cdk-lib/custom-resources/lib/provider-framework/types";

const ec2 = new EC2({ useFipsEndpoint: true });

/**
 * Handle CloudFormation Custom Resource events using the CDK Custom Resource Provider Framework.
 *
 * This will, given a VPC Endpoint ID, determine the full list of IP addresses associated with
 * that endpoint and return data in a list suitable for an Elastic Load Balancing V2 Target
 * configuration. The output can be passed directly (via a `GetAtt`) to the underlying
 * CloudFormation resource.
 */
export async function onEvent(event: OnEventRequest): Promise<OnEventResponse> {
  // There is no data to provide on a Delete operation and no resources were
  // actually created so there's nothing for us to actually destroy.
  if (event.RequestType === "Delete") {
    return {};
  }

  const endpointId = event.ResourceProperties.VpcEndpointId;
  if (!endpointId) {
    throw new Error("VpcEndpointId property is required");
  }
  // Every (or at least nearly every) VPC endpoint uses port 443, so this is a really
  // safe default but we can use a different value if one is provided.
  const port = event.ResourceProperties.Port ?? 443;

  const endpointInterfaces = await getEnisForVpcEndpoint(endpointId);
  if (!endpointInterfaces.length) {
    throw new Error(`Vpc Endpoint "${endpointId}" does not exist (or does not have ENIs)`);
  }

  // On either a Create or Update event, we need to re-determine the IP addresses
  // as they may change if the resource changes.
  return {
    PhysicalResourceId: endpointId,
    Data: {
      Targets: endpointInterfaces.map((eni) => ({
        Port: port,
        Id: eni.PrivateIpAddress,
        AvailabilityZone: eni.AvailabilityZone,
      })),
    },
  };
}

async function getEnisForVpcEndpoint(vpcEndpointId: string): Promise<NetworkInterface[]> {
  const interfaceIds = (
    await ec2.describeVpcEndpoints({
      Filters: [
        {
          Name: "vpc-endpoint-id",
          Values: [vpcEndpointId],
        },
      ],
    })
  )?.VpcEndpoints?.flatMap((endpoint) => endpoint.NetworkInterfaceIds).filter((eni): eni is string => !!eni);

  return (
    await Promise.all(
      interfaceIds?.flatMap((id) =>
        ec2.describeNetworkInterfaces({ Filters: [{ Name: "network-interface-id", Values: [id] }] })
      ) ?? []
    )
  )
    ?.flatMap((result) => result.NetworkInterfaces)
    ?.filter((eni): eni is NetworkInterface => !!eni);
}
