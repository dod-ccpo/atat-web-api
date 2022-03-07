export enum Network {
  NETWORK_1 = "NETWORK_1",
  NETWORK_2 = "NETWORK_2",
  NETWORK_3 = "NETWORK_3",
}
export interface ICloudServiceProvider {
  name: string;
  uri: string;
  networks: Array<Network>;
}
export class CloudServiceProvider implements ICloudServiceProvider {
  readonly name: string;
  readonly uri: string;
  readonly networks: Array<Network>;

  // CSPs details
  public static readonly CSP_A = new CloudServiceProvider("CSP_A", "https://www.cspA.com/v1", [Network.NETWORK_2]);
  public static readonly CSP_B = new CloudServiceProvider("CSP_B", "https://www.cspB.com/v1", []);
  public static readonly CSP_C = new CloudServiceProvider("CSP_C", "https://www.cspC.com/v1", [Network.NETWORK_1]);
  public static readonly CSP_D = new CloudServiceProvider("CSP_D", "https://www.cspD.com/v1", [
    Network.NETWORK_2,
    Network.NETWORK_3,
  ]);

  private constructor(name: string, uri: string, networks: Array<Network>) {
    this.name = name;
    this.uri = uri;
    this.networks = [...networks];
  }
}
