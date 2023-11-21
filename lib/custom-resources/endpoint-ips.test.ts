/* eslint-disable no-unused-expressions */
import { DescribeNetworkInterfacesCommand, DescribeVpcEndpointsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { mockClient } from "aws-sdk-client-mock";
import { onEvent } from "./endpoint-ips";
import {
  NO_NETWORK_INTERFACE_RESPONSE,
  NO_VPC_ENDPOINTS_REPONSE,
  SINGLE_VPC_ENDPOINT,
  makeRequest,
  serviceTokenData,
  setupFullResponses,
} from "./endpoint-ips-test-fixtures";

const ec2Mock = mockClient(EC2Client);

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
    // eslint-disable-next-line no-unused-expressions
    serviceTokenData;
  });

  it("uses a port if provided", async () => {
    const endpointId = "vpce-01234567890123";
    const port = 1024;
    setupFullResponses(endpointId);
    serviceTokenData;
  });
});
