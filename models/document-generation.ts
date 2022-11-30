/* eslint-disable camelcase */
import { APIGatewayEventRequestContext } from "aws-lambda";

export enum AwardType {
  INITIAL_AWARD = "INITIAL_AWARD",
  MODIFICATION = "MODIFICATION",
}

export enum DocumentType {
  DESCRIPTION_OF_WORK = "DESCRIPTION_OF_WORK",
  INDEPENDENT_GOVERNMENT_COST_ESTIMATE = "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
  INCREMENTAL_FUNDING_PLAN = "INCREMENTAL_FUNDING_PLAN",
}

export enum PeriodType {
  BASE = "BASE",
  OPTION = "OPTION",
}

export enum PeriodUnit {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export enum TimeFrame {
  NO_LATER_THAN = "NO_LATER_THAN",
  NO_SOONER_THAN = "NO_SOONER_THAN",
}

export enum AddressType {
  FOREIGN = "FOREIGN",
  MILITARY = "MILITARY",
  US = "US",
}

export enum Classification {
  U = "U", // Unclassified
  S = "S", // Secret
  TS = "TS", // Top Secret
}

export enum ImpactLevel {
  IL2 = "IL2",
  IL4 = "IL4",
  IL5 = "IL5",
  IL6 = "IL6",
}

export enum InstanceLocation {
  CSP = "CSP",
  HYBRID = "HYBRID",
  ON_PREMISE = "ON_PREMISE",
}

export enum TargetCspName {
  CSP_A = "CSP_A",
  CSP_B = "CSP_B",
  CSP_C = "CSP_C",
  CSP_D = "CSP_D",
}

export enum PricingModel {
  ON_DEMAND = "ON_DEMAND",
  PAY_AS_YOU_GO = "PAY_AS_YOU_GO",
  RESERVED = "RESERVED",
}

export enum StorageUnit {
  GB = "GB",
  TB = "TB",
}

export enum ServiceOfferingGroup {
  ADVISORY = "ADVISORY",
  APPLICATIONS = "APPLICATIONS",
  COMPUTE = "COMPUTE",
  DATABASE = "DATABASE",
  DEVELOPER_TOOLS = "DEVELOPER_TOOLS",
  EDGE_COMPUTING = "EDGE_COMPUTING",
  GENERAL_XAAS = "GENERAL_XAAS",
  IOT = "IOT",
  MACHINE_LEARNING = "MACHINE_LEARNING",
  NETWORKING = "NETWORKING",
  SECURITY = "SECURITY",
  TRAINING = "TRAINING",
}
export interface TemplatePaths {
  [DocumentType.DESCRIPTION_OF_WORK]: { html: string; css: string };
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: { excel: string };
  [DocumentType.INCREMENTAL_FUNDING_PLAN]: { word: string };
}
export interface IAward {
  contractAwardType: AwardType;
  effectiveDate: string;
  modificationOrder: number | undefined;
}

export interface IContractInformation {
  contractInformation: string;
  currentContractExists: boolean;
  contractExpirationDate: string;
  incumbentContractorName: string;
  previousTaskOrderNumber: string;
}

export interface IPeriod {
  periodType: PeriodType;
  periodUnitCount: number;
  periodUnit: PeriodUnit | string;
  optionOrder: number;
}

export interface IClassificationLevel {
  classificationLevel: Classification;
  impactLevel: ImpactLevel;
}

export interface IEnvironmentInstance {
  instanceName: string;
  classificationLevel: IClassificationLevel;
  instanceLocation: InstanceLocation;
  cspRegion: TargetCspName;
  performanceTier: string;
  pricingModel: PricingModel;
  pricingModelExpiration: string;
  operatingSystemLicensing: string;
  numberOfVcpus: number;
  storageType: string;
  storageAmount: number;
  storageUnit: StorageUnit;
  memoryAmount: number;
  memoryUnit: StorageUnit;
  dataEgressMonthlyAmount: number;
  dataEgressMonthlyUnit: StorageUnit;
}

export interface ICurrentEnvironment {
  currentEnvironmentExists: boolean;
  environmentInstances: IEnvironmentInstance[];
  additionalInfo: string;
}

export interface IClassificationInstance {
  usageDescription: string;
  selectedPeriods: IPeriod[];
  classificationLevel: IClassificationLevel;
  needForEntireTaskOrderDuration: boolean;
}

export interface IServiceOffering {
  name: string;
  serviceOfferingGroup: ServiceOfferingGroup;
}

export interface ISelectedServiceOffering {
  serviceOffering: IServiceOffering;
  classificationInstances: IClassificationInstance[];
  otherServiceOffering: string;
}

export interface IPeriodOfPerformance {
  basePeriod: IPeriod;
  optionPeriods: IPeriod[];
  popStartRequest: boolean;
  requestedPopStartDate: string;
  timeFrame: TimeFrame;
  recurringRequirement: boolean;
}

export interface IGFEOverview {
  dpasUnitId: string;
  propertyCustodianName: string;
  dpasCustodianNumber: string;
  propertyAccountable: boolean;
  gfeOrGfpFurnished: boolean;
}

export interface IContractConsiderations {
  packagingShippingNoneApply: boolean;
  packagingShippingOther: boolean;
  packagingShippingOtherExplanation: string;
  potentialConflictOfInterest: boolean;
  conflictOfInterestExplanation: string;
  contractorProvidedTransfer: boolean;
  contractorRequiredTraining: boolean;
  requiredTrainingServices: string[];
}

export interface ISensitiveInformation {
  piiPresent: boolean;
  workToBePerformed: string;
  systemOfRecordName: string;
  FOIACityApoFpo: string;
  FOIACountry: string;
  FOIAStreetAddress1: string;
  FOIAStreetAddress2: string;
  FOIAAddressType: AddressType;
  FOIAStateProvinceCode: string;
  FOIAFullName: string;
  FOIAEmail: string;
  FOIAZipPostalCode: string;
  BAARequired: boolean;
  potentialToBeHarmful: boolean;
  section508Sufficient: boolean;
  accessibilityReqs508: string;
}

export interface DescriptionOfWork {
  awardHistory: IAward[];
  contractInformation: IContractInformation;
  toTitle: string;
  scope: string;
  scopeSurge: number;
  currentEnvironment: ICurrentEnvironment;
  selectedServiceOfferings: ISelectedServiceOffering[];
  periodOfPerformance: IPeriodOfPerformance;
  gfeOverview: IGFEOverview;
  contractConsiderations: IContractConsiderations;
  section508AccessibilityStandards: ISensitiveInformation;
}

export enum FundingType {
  FS_FORM = "FS_FORM",
  MIPR = "MIPR",
}
export enum IdiqClin {
  CLOUD_1000 = "1000_CLOUD",
  CLOUD_SUPPORT_2000 = "2000_CLOUD_SUPPORT",
  OTHER_3000 = "3000_OTHER",
}

interface IFundingDocument {
  fundingType: FundingType;
  gtcNumber?: string;
  orderNumber?: string;
  miprNumber?: string;
}

export interface IPeriodLineItem {
  clin: string;
  idiqClin: IdiqClin;
  dowTaskNumber: string;
  serviceOffering: string;
  itemDescriptionOrConfigSummary: string;
  monthlyPrice: number;
  monthsInPeriod: number;
}
export interface IPeriodEstimate {
  period: IPeriod;
  periodLineItems: IPeriodLineItem[];
}
export interface IndependentGovernmentCostEstimate {
  fundingDocument: IFundingDocument;
  surgeCapabilities: number;
  periodsEstimate: IPeriodEstimate[];
}

export interface IFundingIncrement {
  amount: number;
  description: string;
  order: number;
}
export interface IncrementalFundingPlan {
  requirementsTitle: string;
  missionOwner: string;
  estimatedTaskOrderValue: number;
  initialAmount: number;
  remainingAmount: number;
  fundingIncrements: IFundingIncrement[];
  fundingDocument: IFundingDocument;
  scheduleText?: string;
  contractNumber?: string;
  taskOrderNumber?: string;
}

export interface GenerateDocumentRequest {
  documentType: DocumentType;
  templatePayload: DescriptionOfWork | IndependentGovernmentCostEstimate | IncrementalFundingPlan;
}

export interface RequestEvent<T> {
  body: T;
  requestContext: APIGatewayEventRequestContext;
}

// Schema validation used by middy
const awardHistory = {
  type: "array",
  items: {
    type: "object",
    properties: {
      contractAwardType: { enum: [AwardType.INITIAL_AWARD, AwardType.MODIFICATION] },
      effectiveDate: { type: "string" },
      modificationOrder: { type: "string" },
    },
  },
};

const classificationLevel = {
  type: "object",
  properties: {
    classification: { enum: [Classification.U, Classification.S, Classification.TS] },
    impactLevel: { enum: [ImpactLevel.IL2, ImpactLevel.IL4, ImpactLevel.IL5, ImpactLevel.IL6, null] },
  },
};

const contractInformation = {
  type: "object",
  properties: {
    contractNumber: { type: "string" },
    currentContractExists: { type: "boolean" },
    contractExpirationDate: { type: "string" },
    incumbentContractorName: { type: "string" },
    previousTaskOrderNumber: { type: "string" },
  },
};

const environmentInstance = {
  type: "object",
  properties: {
    instanceName: { type: "string" },
    classificationLevel,
    instanceLocation: { enum: [InstanceLocation.CSP, InstanceLocation.HYBRID, InstanceLocation.ON_PREMISE] },
    cspRegion: { enum: [TargetCspName.CSP_A, TargetCspName.CSP_B, TargetCspName.CSP_C, TargetCspName.CSP_D, null] },
    performanceTier: { type: "string" },
    pricingModel: { enum: [PricingModel.ON_DEMAND, PricingModel.PAY_AS_YOU_GO, PricingModel.RESERVED] },
    pricingModelExpiration: { type: "string" },
    operatingSystemLicensing: { type: "string" },
    numberOfVcpus: { type: "integer" },
    storageType: { type: "string", nullable: true },
    storageAmount: { type: "integer" },
    storageUnit: { enum: [StorageUnit.GB, StorageUnit.TB] },
    memoryAmount: { type: "integer" },
    memoryUnit: { enum: [StorageUnit.GB, StorageUnit.TB] },
    dataEgressMonthlyAmount: { type: "integer" },
    dataEgressMonthlyUnit: { enum: [StorageUnit.GB, StorageUnit.TB] },
  },
};

const currentEnvironment = {
  type: "object",
  properties: {
    currentEnvironmentExists: { type: "boolean" },
    environmentInstances: { type: "array", items: environmentInstance },
    additionalInfo: { type: "string" },
  },
};

const serviceOffering = {
  type: "object",
  properties: {
    name: { type: "string" },
    serviceOfferingGroup: {
      enum: [
        ServiceOfferingGroup.ADVISORY,
        ServiceOfferingGroup.APPLICATIONS,
        ServiceOfferingGroup.COMPUTE,
        ServiceOfferingGroup.DATABASE,
        ServiceOfferingGroup.DEVELOPER_TOOLS,
        ServiceOfferingGroup.EDGE_COMPUTING,
        ServiceOfferingGroup.GENERAL_XAAS,
        ServiceOfferingGroup.IOT,
        ServiceOfferingGroup.MACHINE_LEARNING,
        ServiceOfferingGroup.NETWORKING,
        ServiceOfferingGroup.SECURITY,
        ServiceOfferingGroup.TRAINING,
        null,
      ],
    },
  },
};

const period = {
  type: "object",
  properties: {
    periodType: { enum: [PeriodType.BASE, PeriodType.OPTION] },
    periodUnitCount: { type: "integer" },
    periodUnit: { enum: [PeriodUnit.DAY, PeriodUnit.MONTH, PeriodUnit.WEEK, PeriodUnit.YEAR] },
    optionOrder: { type: "integer", nullable: true },
  },
};

const classificationInstance = {
  type: "object",
  properties: {
    usageDescription: { type: "string" },
    selectedPeriods: { type: "array", items: period },
    classificationLevel,
    needForEntireTaskOrderDuration: { type: "boolean" },
  },
};

const selectedServiceOfferings = {
  type: "object",
  properties: {
    serviceOffering,
    classificationInstances: { type: "array", items: classificationInstance },
    otherServiceOffering: { type: "string" },
  },
};

const periodOfPerformance = {
  type: "object",
  properties: {
    basePeriod: period,
    optionPeriods: { type: "array", items: period },
    popStartRequest: { type: "boolean" },
    requestedPopStartDate: { type: "string" },
    timeFrame: { enum: [TimeFrame.NO_LATER_THAN, TimeFrame.NO_SOONER_THAN] },
    recurringRequirement: { type: "boolean" },
  },
};

const gfeOverview = {
  type: "object",
  properties: {
    dpasUnitId: { type: "string" },
    propertyCustodianName: { type: "string" },
    dpasCustodianNumber: { type: "string" },
    propertyAccountable: { type: "boolean" },
    gfeOrGfpFurnished: { type: "boolean" },
  },
};

const contractConsiderations = {
  type: "object",
  properties: {
    packagingShippingNoneApply: { type: "boolean" },
    packagingShippingOther: { type: "boolean" },
    packagingShippingOtherExplanation: { type: "string" },
    potentialConflictOfInterest: { type: "boolean" },
    conflictOfInterestExplanation: { type: "string" },
    contractorProvidedTransfer: { type: "boolean" },
    contractorRequiredTraining: { type: "boolean" },
    requiredTrainingServices: { type: "array", items: { type: "string" } },
  },
};

const section508AccessibilityStandards = {
  type: "object",
  properties: {
    piiPresent: { type: "boolean" },
    workToBePerformed: { type: "string" },
    systemOfRecordName: { type: "string" },
    FOIACityApoFpo: { type: "string" },
    FOIACountry: { type: "string" },
    FOIAStreetAddress1: { type: "string" },
    FOIAStreetAddress2: { type: "string" },
    FOIAAddressType: { enum: [AddressType.FOREIGN, AddressType.MILITARY, AddressType.US, null] },
    FOIAStateProvinceCode: { type: "string" },
    FOIAFullName: { type: "string" },
    FOIAEmail: { type: "string" },
    FOIAZipPostalCode: { type: "string" },
    BAARequired: { type: "boolean" },
    potentialToBeHarmful: { type: "boolean" },
    section508Sufficient: { type: "boolean" },
    accessibilityReqs508: { type: "string" },
  },
};

const descriptionOfWork = {
  type: "object",
  properties: {
    awardHistory,
    contractInformation,
    toTitle: { type: "string" },
    scope: { type: "string" },
    scopeSurge: { type: "integer" },
    currentEnvironment,
    selectedServiceOfferings: { type: "array", items: selectedServiceOfferings },
    periodOfPerformance,
    gfeOverview,
    contractConsiderations,
    section508AccessibilityStandards,
  },
  additionalProperties: false,
};

const fundingDocument = {
  type: "object",
  oneOf: [
    {
      properties: {
        fundingType: { enum: [FundingType.FS_FORM] },
        gtcNumber: { type: "string" },
        orderNumber: { type: "string" },
      },
    },
    {
      properties: {
        fundingType: { enum: [FundingType.MIPR] },
        miprNumber: { type: "string" },
      },
    },
  ],
};

const periodLineItem = {
  type: "object",
  properties: {
    clin: { type: "string" },
    idiqClin: { type: "string" },
    dowTaskNumber: { type: "string" },
    serviceOffering: { type: "string" },
    itemDescriptionOrConfigSummary: { type: "string" },
    monthlyPrice: { type: "number" },
    monthsInPeriod: { type: "integer" },
  },
};

const periodsEstimate = {
  type: "array",
  items: {
    type: "object",
    properties: {
      period,
      periodLineItems: { type: "array", items: periodLineItem },
    },
  },
};

const independentGovernmentCostEstimate = {
  type: "object",
  properties: {
    fundingDocument,
    surgeCapabilities: { type: "integer" },
    periodsEstimate,
  },
  additionalProperties: false,
};

const incrementalFundingPlan = {
  type: "object",
  properties: {
    requirementsTitle: { type: "string" },
    missionOwner: { type: "string" },
    estimatedTaskOrderValue: { type: "number" },
    initialAmount: { type: "number" },
    remainingAmount: { type: "number" },
    fundingIncrements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          amount: { type: "number" },
          description: { type: "string" },
          order: { type: "integer" },
        },
      },
    },
    fundingDocument,
    scheduleText: { type: "string" },
    contractNumber: { type: "string" },
    taskOrderNumber: { type: "string" },
  },
  additionalProperties: false,
};

export const generateDocumentSchema = {
  type: "object",
  properties: {
    documentType: {
      enum: [
        DocumentType.DESCRIPTION_OF_WORK,
        DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE,
        DocumentType.INCREMENTAL_FUNDING_PLAN,
      ],
    },
    templatePayload: {
      oneOf: [descriptionOfWork, independentGovernmentCostEstimate, incrementalFundingPlan],
    },
  },
};
