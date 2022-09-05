import { createApp } from "./app";

const cidrError =
  "A VpcCidr must be provided for non-Sandbox environments (use the atat:VpcCidr context key) and it must be" +
  " a valid CIDR block";

describe("Validation tests", () => {
  const validCidr = "10.0.255.0/16";

  it("should throw error if not EnvironmentId", async () => {
    expect(() => {
      createApp({
        context: {
          "atat:Sandbox": true,
          "atat:VpcCidr": validCidr,
        },
      });
    }).toThrow("An EnvironmentId must be provided (use the atat:EnvironmentId context key)");
  });

  it("should not have ViprCidr if Sandbox", async () => {
    expect(() => {
      createApp({
        context: {
          "atat:EnvironmentId": "myEnvironment",
          "atat:Sandbox": true,
          "atat:VpcCidr": validCidr,
        },
      });
    }).toThrow("atat:VpcCidr must NOT be provided for Sandbox environments.");
  });

  it("should have ViprCidr if not Sandbox", async () => {
    expect(() => {
      createApp({
        context: {
          "atat:EnvironmentId": "myEnvironment",
          "atat:Sandbox": false,
        },
      });
    }).toThrow(cidrError);
  });

  it("should not throw Error if all inputs valid for Sandbox environment", async () => {
    expect(() => {
      createApp({
        context: {
          "atat:EnvironmentId": "myEnvironment",
          "atat:Sandbox": true,
        },
      });
    }).not.toThrow(cidrError);
  });

  it("should not throw Error if all inputs valid for non-Sandbox environment", async () => {
    expect(() => {
      createApp({
        context: {
          "atat:EnvironmentId": "myEnvironment",
          "atat:Sandbox": false,
          "atat:VpcCidr": validCidr,
        },
      });
    }).not.toThrow(cidrError);
  });
});

describe("CIDR tests", () => {
  let context: Record<string, unknown> = {};

  beforeEach(() => {
    context = {
      "atat:EnvironmentId": "myEnvironment",
      "atat:Sandbox": false,
    };
  });

  it("should throw if VpcCidr arbitrary string", async () => {
    context["atat:VpcCidr"] = "not a CIDR block";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr has too few octets", async () => {
    context["atat:VpcCidr"] = "10.0.0/24";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr has too many octets", async () => {
    context["atat:VpcCidr"] = "10.1.2.3.4/24";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr octet out of range", async () => {
    context["atat:VpcCidr"] = "10.0.500.0/20";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr missing netmask", async () => {
    context["atat:VpcCidr"] = "10.0.0.0";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr netmask too small", async () => {
    context["atat:VpcCidr"] = "10.0.0.0/14";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr netmask too large", async () => {
    context["atat:VpcCidr"] = "10.0.0.0/30";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });
});
