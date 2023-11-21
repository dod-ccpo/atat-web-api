import {
  DescribeNetworkInterfacesCommand,
  DescribeNetworkInterfacesCommandOutput,
  DescribeVpcEndpointsCommand,
  DescribeVpcEndpointsCommandOutput,
  EC2Client,
} from "@aws-sdk/client-ec2";
import type { OnEventRequest } from "aws-cdk-lib/custom-resources/lib/provider-framework/types";
import { mockClient } from "aws-sdk-client-mock";
import { onEvent } from "./endpoint-ips";

const ec2Mock = mockClient(EC2Client);

const NO_VPC_ENDPOINTS_REPONSE: DescribeVpcEndpointsCommandOutput = { VpcEndpoints: [], $metadata: {} };
const NO_NETWORK_INTERFACE_RESPONSE: DescribeNetworkInterfacesCommandOutput = { NetworkInterfaces: [], $metadata: {} };
const SINGLE_VPC_ENDPOINT: DescribeVpcEndpointsCommandOutput = {
  VpcEndpoints: [
    {
      VpcEndpointId: "vpce-01234567890123",
      VpcEndpointType: "Interface",
      VpcId: "vpc-01231432432",
      ServiceName: "com.amazonaws.us-gov-west-1.execute-api",
      State: "Available",
      PolicyDocument: "",
      RouteTableIds: [],
      SubnetIds: ["subnet-0ffasdfa", "subnet-0asdfas1"],
      Groups: [
        {
          GroupId: "sg-01231524",
          GroupName: "Test-Security-Group",
        },
      ],
      PrivateDnsEnabled: true,
      RequesterManaged: false,
      NetworkInterfaceIds: ["eni-0124515241231", "eni-293413435asdf"],
      DnsEntries: [],
      CreationTimestamp: new Date(),
      Tags: [],
      OwnerId: "123456789012",
    },
  ],
  $metadata: {},
};

const NETWORK_INTERFACES: { [key: string]: DescribeNetworkInterfacesCommandOutput } = {
  "eni-0124515241231": {
    NetworkInterfaces: [
      {
        AvailabilityZone: "us-east-1a",
        Description: "VPC Endpoint Interface vpce-01234567890123",
        Groups: [
          {
            GroupId: "sg-01231524",
            GroupName: "Test-Security-Group",
          },
        ],
        InterfaceType: "vpc_endpoint",
        NetworkInterfaceId: "eni-0683001414f50c104",
        OwnerId: "123456789012",
        PrivateIpAddress: "192.168.1.10",
        SubnetId: "subnet-0ffasdfa",
      },
    ],
    $metadata: {},
  },
  "eni-293413435asdf": {
    NetworkInterfaces: [
      {
        AvailabilityZone: "us-east-1b",
        Description: "VPC Endpoint Interface vpce-01234567890123",
        Groups: [
          {
            GroupId: "sg-01231524",
            GroupName: "Test-Security-Group",
          },
        ],
        InterfaceType: "vpc_endpoint",
        NetworkInterfaceId: "eni-293413435asdf",
        OwnerId: "123456789012",
        PrivateIpAddress: "192.168.2.37",
        SubnetId: "subnet-0asdfas1",
      },
    ],
    $metadata: {},
  },
};

const makeRequest = (data: Partial<OnEventRequest>): OnEventRequest => ({
  ResponseURL: "",
  RequestType: "Create",
  ServiceToken: "",
  StackId: "arn:aws:",
  RequestId: "cffbdc90-1c72-4657-9463-fc57dcb4a365",
  LogicalResourceId: "TestResource",
  ResourceType: "Test::Resource",
  ...data,
  ResourceProperties: {
    ServiceToken: "",
    ...(data?.ResourceProperties ?? {}),
  },
});

const setupFullResponses = (endpointId: string) => {
  ec2Mock
    .on(DescribeVpcEndpointsCommand, {
      Filters: [
        {
          Name: "vpc-endpoint-id",
          Values: [endpointId],
        },
      ],
    })
    .resolves(SINGLE_VPC_ENDPOINT)
    .on(DescribeNetworkInterfacesCommand, {
      Filters: [{ Name: "network-interface-id", Values: ["eni-0124515241231"] }],
    })
    .resolves(NETWORK_INTERFACES["eni-0124515241231"])
    .on(DescribeNetworkInterfacesCommand, {
      Filters: [{ Name: "network-interface-id", Values: ["eni-293413435asdf"] }],
    })
    .resolves(NETWORK_INTERFACES["eni-293413435asdf"]);
};

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
    setupFullResponses(endpointId);
    expect(await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, ServiceToken: "" } }))).toEqual(
      {
        PhysicalResourceId: endpointId,
        Data: {
          Targets: [
            {
              Port: 443,
              Id: "192.168.1.10",
              AvailabilityZone: "us-east-1a",
            },
            {
              Port: 443,
              Id: "192.168.2.37",
              AvailabilityZone: "us-east-1b",
            },
          ],
        },
      }
    );
  });
  it("uses a port if provided", async () => {
    const endpointId = "vpce-01234567890123";
    const port = 1024;
    setupFullResponses(endpointId);
    expect(
      await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, Port: port, ServiceToken: "" } }))
    ).toEqual({
      PhysicalResourceId: endpointId,
      Data: {
        Targets: [
          {
            Port: port,
            Id: "192.168.1.10",
            AvailabilityZone: "us-east-1a",
          },
          {
            Port: port,
            Id: "192.168.2.37",
            AvailabilityZone: "us-east-1b",
          },
        ],
      },
    });
  });
});
