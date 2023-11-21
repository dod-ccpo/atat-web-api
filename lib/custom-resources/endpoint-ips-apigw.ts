import { EC2, NetworkInterface } from "@aws-sdk/client-ec2";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { PropagatedTagSource } from "aws-cdk-lib/aws-ecs";
import type { OnEventRequest, OnEventResponse } from "aws-cdk-lib/custom-resources/lib/provider-framework/types";

const ec2 = new EC2({ useFipsEndpoint: true });
const eventBridgeClient = new EventBridgeClient({ region: "us-gov-west-1" }); // Replace with your target region

export async function onEvent(event: OnEventRequest): Promise<OnEventResponse> {
  if (event.RequestType === "Delete") {
    return {};
  }

  const endpointId = event.ResourceProperties.VpcEndpointId;

  if (!endpointId) {
    throw new Error("VpcEndpointId property is required");
  }

  const endpointInterfaces = await getEnisForVpcEndpoint(endpointId);
  if (!endpointInterfaces.length) {
    throw new Error(`Vpc Endpoint "${endpointId}" does not exist (or does not have ENIs)`);
  }

  // Prepare the event detail using the ENI information
  const eventDetail = JSON.stringify({
    ENIInformation: endpointInterfaces.map((eni) => ({
      Id: eni.PrivateIpAddress,
      AvailabilityZone: eni.AvailabilityZone,
    })),
  });

  // Send the event to EventBridge
  await sendEventToEventBridge(eventDetail);

  return {
    PhysicalResourceId: endpointId,
    Data: {
      Targets: endpointInterfaces.map((eni) => ({
        Port: event.ResourceProperties.Port ?? 443,
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

async function sendEventToEventBridge(eventDetail: string): Promise<void> {
  const eventParams = {
    Entries: [
      {
        Source: "event.sender.source",
        DetailType: "EventA.Sent",
        Detail: eventDetail,
        EventBusName: process.env.albEventBusArn,
      },
    ],
  };

  await eventBridgeClient.send(new PutEventsCommand(eventParams));
}
