import {
  DescribeNetworkInterfacesCommand,
  DescribeNetworkInterfacesCommandOutput,
  DescribeVpcEndpointsCommand,
  DescribeVpcEndpointsCommandOutput,
  EC2Client,
} from "@aws-sdk/client-ec2";
import type { OnEventRequest } from "aws-cdk-lib/custom-resources/lib/provider-framework/types";
import { mockClient } from "aws-sdk-client-mock";
import { onEvent } from "./delete-default-sg-rules";

const ec2Mock = mockClient(EC2Client);

export const NO_VPC_ENDPOINTS_REPONSE: DescribeVpcEndpointsCommandOutput = { VpcEndpoints: [], $metadata: {} };
export const NO_NETWORK_INTERFACE_RESPONSE: DescribeNetworkInterfacesCommandOutput = {
  NetworkInterfaces: [],
  $metadata: {},
};
export const SINGLE_VPC_ENDPOINT: DescribeVpcEndpointsCommandOutput = {
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

export const NETWORK_INTERFACES: { [key: string]: DescribeNetworkInterfacesCommandOutput } = {
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

export const makeRequest = (data: Partial<OnEventRequest>): OnEventRequest => ({
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

export const setupFullResponses = (endpointId: string) => {
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

export const serviceTokenData = async (endpointId: string) => {
  setupFullResponses(endpointId);
  expect(await onEvent(makeRequest({ ResourceProperties: { VpcEndpointId: endpointId, ServiceToken: "" } }))).toEqual({
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
  });
};
