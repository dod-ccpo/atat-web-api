/* eslint-disable no-unused-expressions */
import {
  DescribeNetworkInterfacesCommand,
  DescribeNetworkInterfacesCommandOutput,
  DescribeVpcEndpointsCommand,
  EC2Client,
} from "@aws-sdk/client-ec2";
import { mockClient } from "aws-sdk-client-mock";
import { onEvent } from "./endpoint-ips-apigw";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import {
  NO_NETWORK_INTERFACE_RESPONSE,
  NO_VPC_ENDPOINTS_REPONSE,
  SINGLE_VPC_ENDPOINT,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  NETWORK_INTERFACES,
  endpointData,
  makeRequest,
  setupFullResponses,
} from "./endpoint-ips-test-fixtures";

const ec2Mock = mockClient(EC2Client);
const eventMock = mockClient(EventBridgeClient);

// const setupFullResponses = (endpointId: string) => {
//   ec2Mock
//     .on(DescribeVpcEndpointsCommand, {
//       Filters: [
//         {
//           Name: "vpc-endpoint-id",
//           Values: [endpointId],
//         },
//       ],
//     })
//     .resolves(SINGLE_VPC_ENDPOINT)
//     .on(DescribeNetworkInterfacesCommand, {
//       Filters: [{ Name: "network-interface-id", Values: ["eni-0124515241231"] }],
//     })
//     .resolves(NETWORK_INTERFACES["eni-0124515241231"])
//     .on(DescribeNetworkInterfacesCommand, {
//       Filters: [{ Name: "network-interface-id", Values: ["eni-293413435asdf"] }],
//     })
//     .resolves(NETWORK_INTERFACES["eni-293413435asdf"]);
// };

describe("VPC Endpoint Client IP address", () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  it("does nothing on a Delete", async () => {
    expect(await onEvent(makeRequest({ RequestType: "Delete" }))).toEqual({});
  });

  it("throws some exception when endpoint ID not provided", async () => {
    expect(onEvent(makeRequest({ RequestType: "Create" }))).rejects.toThrow("VpcEndpointId property is required");
  });

  it("throws if the VPC Endpoint ID is invalid", async () => {
    ec2Mock.on(DescribeVpcEndpointsCommand).resolves(NO_VPC_ENDPOINTS_REPONSE);
    expect(
      onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: "fake-endpoint", ServiceToken: "" } }))
    ).rejects.toThrow();
  });

  it("throws if a VPC endpoint has no interfaces", async () => {
    ec2Mock
      .on(DescribeVpcEndpointsCommand)
      .resolves(SINGLE_VPC_ENDPOINT)
      .on(DescribeNetworkInterfacesCommand)
      .resolves(NO_NETWORK_INTERFACE_RESPONSE);
    expect(
      onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: "fake-endpoint", ServiceToken: "" } }))
    ).rejects.toThrow();
  });

  it("gives a valid response when state is valid", async () => {
    const endpointId = "vpce-01234567890123";
    expect(await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, ServiceToken: "" } }))).toEqual(
      { describeEndpointIps }
    );
  });;
  });

  it("uses a port if provided", async () => {
    const endpointId = "vpce-01234567890123";
    setupFullResponses(endpointId);
    expect(await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, ServiceToken: "" } }))).toEqual(
      { describeEndpointIps }
    );
  });
});

//   it("uses a port if provided", async () => {
//     const endpointId = "vpce-01234567890123";
//     setupFullResponses(endpointId);
//     const port = 443;
//     // const expectedData = endpointData(endpointId, port);
//     expect(
//       await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, Port: port, ServiceToken: "" } }))
//     ).toEqual({
//       PhysicalResourceId: endpointId,
//       Data: {
//         Targets: [
//           {
//             Port: port,
//             Id: "192.168.1.10",
//             AvailabilityZone: "us-east-1a",
//           },
//           {
//             Port: port,
//             Id: "192.168.2.37",
//             AvailabilityZone: "us-east-1b",
//           },
//         ],
//       },
//     });
//   });
// });

// it("Send Event to Event bus ARN", async () => {
//   const expectedData = endpointData(endpointId, port);
//   eventMock.on(PutEventsCommand).resolves(SINGLE_VPC_ENDPOINT);
//   expectedData;
// });
