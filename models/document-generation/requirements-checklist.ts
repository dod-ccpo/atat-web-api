import { IPeriodOfPerformance, periodOfPerformance } from "../document-generation";

export interface IProjectOverview {
  title: string;
  scope: string;
  emergencyDeclaration: boolean;
}

export interface IOrganization {
  agency: string;
  name: string;
}

export enum ContactType {
  MISSION_OWNER = "MISSION_OWNER",
  COR = "COR",
  ACOR = "ACOR",
  FINANCIAL_POC = "FINANCIAL_POC",
}

export enum FairOpportunity {
  NO_NONE = "NO_NONE",
  YES_FAR_16_505_B_2_I_A = "YES_FAR_16_505_B_2_I_A",
  YES_FAR_16_505_B_2_I_B = "YES_FAR_16_505_B_2_I_B",
  YES_FAR_16_505_B_2_I_C = "YES_FAR_16_505_B_2_I_C",
}

export interface IContact {
  type: ContactType;
  name: string;
  email: string;
  phoneNumber: string;
  dodaac: string;
}

export interface IPackageContacts {
  missionOwnerName: string;
  cor: IContact;
  acor?: IContact;
}

export interface ICurrentContract {
  currentContractExists: boolean;
  incumbentContractorName: string;
  contractNumber: string;
  taskDeliveryOrderNumber: string;
  contractOrderStartDate: string;
  contractOrderExpirationDate: string;
  businessSize: string;
  competitiveStatus: string;
}

export interface IContractType {
  firmFixedPrice: boolean;
  timeAndMaterials: boolean;
  justification: string;
}

export interface IFOIAContact {
  fullName: string;
  email: string;
  address: string;
}

export interface ISection508 {
  section508Sufficient: boolean;
}

export interface ISensitiveInformation {
  baaRequired: boolean;
  potentialToBeHarmful: boolean;
  foiaContact: IFOIAContact;
  section508: ISection508;
}

export interface RequirementsChecklist {
  gtcNumber: string;
  projectOverview: IProjectOverview;
  organization: IOrganization;
  contacts: IPackageContacts;
  currentContract: ICurrentContract[];
  exceptionToFairOpportunity: FairOpportunity;
  periodOfPerformance: IPeriodOfPerformance;
  contractType: IContractType;
  sensitiveInformation: ISensitiveInformation;
}

const projectOverview = {
  type: "object",
  properties: {
    title: { type: "string" },
    scope: { type: "string" },
    emergencyDeclaration: { type: "boolean" },
  },
};

const organization = {
  type: "object",
  properties: {
    agency: { type: "string" },
    name: { type: "string" },
  },
};

const contact = {
  type: "object",
  nullable: true,
  properties: {
    type: {
      enum: [ContactType.MISSION_OWNER, ContactType.COR, ContactType.ACOR, ContactType.FINANCIAL_POC],
    },
    name: { type: "string" },
    email: { type: "string" },
    phoneNumber: { type: "string" },
    dodaac: { type: "string" },
  },
};

const packageContacts = {
  type: "object",
  properties: {
    missionOwnerName: { type: "string" },
    cor: contact,
    acor: contact,
  },
};

// TODO: consolidate with the 'ContractInformation' used for DOW
const currentContract = {
  type: "array",
  items: {
    type: "object",
    properties: {
      currentContractExists: { type: "boolean" },
      incumbentContractorName: { type: "string" },
      contractNumber: { type: "string" },
      taskDeliveryOrderNumber: { type: "string" },
      contractOrderExpirationDate: { type: "string" },
    },
  },
};

const contractType = {
  type: "object",
  properties: {
    firmFixedPrice: { type: "boolean" },
    timeAndMaterials: { type: "boolean" },
    justification: { type: "string" },
  },
};

const sensitiveInformation = {
  type: "object",
  properties: {
    baaRequired: { type: "boolean" },
    potentialToBeHarmful: { type: "boolean" },
    foiaContact: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
      },
    },
    section508: {
      type: "object",
      properties: {
        section508Sufficient: {
          type: "boolean",
        },
      },
    },
  },
};

const gtcNumber = {
  type: "string",
};

export const requirementsCheckList = {
  type: "object",
  properties: {
    gtcNumber,
    projectOverview,
    organization,
    contacts: packageContacts,
    currentContract,
    exceptionToFairOpportunity: {
      enum: [
        FairOpportunity.NO_NONE,
        FairOpportunity.YES_FAR_16_505_B_2_I_A,
        FairOpportunity.YES_FAR_16_505_B_2_I_B,
        FairOpportunity.YES_FAR_16_505_B_2_I_C,
      ],
    },
    // the spread operator otherwise periodOfPerformance schema
    // is invalid due to undefined periodOfPerformance
    periodOfPerformance: { ...periodOfPerformance },
    contractType,
    sensitiveInformation,
  },
  additionalProperties: false,
};
