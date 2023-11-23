import { EC2, NetworkInterface } from "@aws-sdk/client-ec2";

const ec2 = new EC2({ useFipsEndpoint: true });

export async function getEnisForVpcEndpoint(vpcEndpointId: string): Promise<NetworkInterface[]> {
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
