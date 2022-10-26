import * as atatClient from "./atat-client";

const testCspConfig = {
  name: "test",
  uri: "https://cspTest.example.com/atat/api/test",
  network: "NETWORK_1",
};

jest.mock("./atat-client");
const mockedConfig = atatClient.getConfiguration as jest.MockedFn<typeof atatClient.getConfiguration>;
mockedConfig.mockImplementation(() => Promise.resolve(testCspConfig));

describe("ATAT Client", () => {
  it("successfully get CSP config", async () => {
    const config = await atatClient.getConfiguration("CSP");
    expect(config).toEqual(testCspConfig);
  });
});
