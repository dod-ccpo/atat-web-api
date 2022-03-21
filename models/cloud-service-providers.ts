export enum Network {
  NETWORK_1 = "NETWORK_1",
  NETWORK_2 = "NETWORK_2",
  NETWORK_3 = "NETWORK_3",
}
export interface ICloudServiceProvider {
  readonly name: string;
  readonly uri: string;
  readonly network: Network;
}
export class CloudServiceProvider implements ICloudServiceProvider {
  readonly name: string;
  readonly uri: string;
  readonly network: Network;

  private constructor(name: string, uri: string, network: Network) {
    this.name = name;
    this.uri = uri;
    this.network = network;
  }
}
