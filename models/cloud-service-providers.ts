export enum CloudServiceProvider {
  CSP_A = "CSP_A",
  CSP_B = "CSP_B",
  CSP_C = "CSP_C",
  CSP_D = "CSP_D",
}

export enum CloudServiceProviderUri {
  A = "www.cspA.com/v1",
  B = "www.cspB.com/v1",
  C = "www.cspC.com/v1",
  D = "www.cspD.com/v1",
}

export enum Network {
  NETWORK_1 = "NETWORK_1",
  NETWORK_2 = "NETWORK_2",
  NETWORK_3 = "NETWORK_3",
}

export const CSP_URI = {
  [CloudServiceProvider.CSP_A]: CloudServiceProviderUri.A,
  [CloudServiceProvider.CSP_B]: CloudServiceProviderUri.B,
  [CloudServiceProvider.CSP_C]: CloudServiceProviderUri.C,
  [CloudServiceProvider.CSP_D]: CloudServiceProviderUri.D,
};
