/* eslint-disable camelcase */
import { APIGatewayEventRequestContext } from "aws-lambda";
import { IDescriptionOfWork } from "./document-generation/description-of-work";
import { requirementsCheckList, RequirementsChecklist } from "./document-generation/requirements-checklist";
import { IJustificationAndApproval, IPointOfContact } from "./document-generation/justification-and-approval";

export enum AwardType {
  INITIAL_AWARD = "INITIAL_AWARD",
  MODIFICATION = "MODIFICATION",
}

export enum DocumentType {
  DESCRIPTION_OF_WORK_PDF = "DESCRIPTION_OF_WORK_PDF",
  DESCRIPTION_OF_WORK_DOCX = "DESCRIPTION_OF_WORK_DOCX",
  INDEPENDENT_GOVERNMENT_COST_ESTIMATE = "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
  INCREMENTAL_FUNDING_PLAN = "INCREMENTAL_FUNDING_PLAN",
  EVALUATION_PLAN = "EVALUATION_PLAN",
  REQUIREMENTS_CHECKLIST = "REQUIREMENTS_CHECKLIST",
  JUSTIFICATION_AND_APPROVAL = "JUSTIFICATION_AND_APPROVAL",
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
  ON_PREM = "ON_PREM",
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

export enum SourceSelection {
  NO_TECH_PROPOSAL = "NO_TECH_PROPOSAL",
  TECH_PROPOSAL = "TECH_PROPOSAL",
  SET_LUMP_SUM = "SET_LUMP_SUM",
  EQUAL_SET_LUMP_SUM = "EQUAL_SET_LUMP_SUM",
}

export enum EvalPlanMethod {
  LPTA = "LPTA",
  BVTO = "BVTO",
  BEST_USE = "BEST_USE",
  LOWEST_RISK = "LOWEST_RISK",
}
export interface TemplatePaths {
  [DocumentType.DESCRIPTION_OF_WORK_PDF]: { html: string; css: string };
  [DocumentType.DESCRIPTION_OF_WORK_DOCX]: { docx: string };
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: { excel: string };
  [DocumentType.INCREMENTAL_FUNDING_PLAN]: { docx: string };
  [DocumentType.EVALUATION_PLAN]: { docx: string };
  [DocumentType.REQUIREMENTS_CHECKLIST]: { docx: string };
  [DocumentType.JUSTIFICATION_AND_APPROVAL]: { docx: string };
}
export interface IAward {
  contractAwardType: AwardType;
  effectiveDate: string;
  modificationOrder: number | undefined;
}

export interface IContractInformation {
  contractInformation: string;
  currentContractExists: boolean;
  contractOrderExpirationDate: string;
  incumbentContractorName: string;
  taskDeliveryOrderNumber: string;
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
  numberOfInstances: number;
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
  envInstances: IEnvironmentInstance[];
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
  contractInformation: IContractInformation[];
  toTitle: string;
  scope: string;
  // scopeSurge: number;
  surgeRequirementCapacity: number;
  surgeRequirementCapabilities: boolean;
  currentEnvironment: ICurrentEnvironment;
  selectedClassificationLevels: Record<string, any>[];
  architecturalDesignRequirement: Record<string, any>;
  xaasOfferings: Record<string, any>[];
  crossDomainSolutions: Record<string, any>;
  cloudSupportPackages: Record<string, any>[];
  contractType: Record<string, any>;
  periodOfPerformance: IPeriodOfPerformance;
  securityRequirements: Record<string, any>[];
  contractConsiderations: IContractConsiderations;
  sensitiveInformation: ISensitiveInformation;
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
export interface IContractingShop {
  name: string;
  fee: number;
}

export interface IFundingDocument {
  fundingType: FundingType;
  gtcNumber?: string;
  orderNumber?: string;
  miprNumber?: string;
}
export interface IGCEInstructions {
  estimateDescription: string;
  assumptionsMade: string;
  toolsUsed: string;
  informationSource: string;
  previousEstimateComparison: string;
}

export interface IPeriodLineItem {
  idiqClin: string;
  contractType: string;
  dowTaskNumber: string;
  serviceTitle: string;
  itemDescription: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}
export interface IPeriodEstimate {
  period: IPeriod;
  periodLineItems: IPeriodLineItem[];
}
export interface IndependentGovernmentCostEstimate {
  fundingDocument: IFundingDocument;
  surgeCapabilities: number;
  periodsEstimate: IPeriodEstimate[];
  instructions: IGCEInstructions;
  contractingShop: IContractingShop;
}

export interface IFundingIncrement {
  amount: number;
  description: string;
  order: number;
}
export interface IncrementalFundingPlan {
  requirementsTitle: string;
  missionOwner: string;
  financialPoc: string;
  estimatedTaskOrderValue: number;
  initialAmount: number;
  remainingAmount: number;
  fundingIncrements: IFundingIncrement[];
  fundingDocument: IFundingDocument;
  scheduleText?: string;
  contractNumber?: string;
  taskOrderNumber?: string;
}

export interface EvaluationPlan {
  taskOrderTitle: string;
  sourceSelection: SourceSelection;
  method: EvalPlanMethod;
  standardSpecifications: string[];
  customSpecifications: string[];
  standardDifferentiators: string[];
  customDifferentiators: string[];
}

export interface GenerateDocumentRequest {
  documentType: DocumentType;
  templatePayload:
    | IDescriptionOfWork
    | IndependentGovernmentCostEstimate
    | IncrementalFundingPlan
    | EvaluationPlan
    | RequirementsChecklist
    | IJustificationAndApproval;
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
    display: { type: "string" },
  },
};

const contractInformation = {
  type: "object",
  properties: {
    contractNumber: { type: "string" },
    currentContractExists: { type: "boolean" },
    contractOrderStartDate: { type: "string" },
    contractOrderExpirationDate: { type: "string" },
    incumbentContractorName: { type: "string" },
    taskDeliveryOrderNumber: { type: "string" },
    businessSize: { type: "string" },
    competitiveStatus: { type: "string" },
  },
};

const environmentInstance = {
  type: "object",
  properties: {
    instanceName: { type: "string" },
    classificationLevel,
    instanceLocation: { enum: [InstanceLocation.CSP, InstanceLocation.HYBRID, InstanceLocation.ON_PREM] },
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
    hasSystemDocumentation: { type: "boolean" },
    hasMigrationDocumentation: { type: "boolean" },
    envLocation: { type: "string" },
    envClassificationCloud: { type: "array", items: classificationLevel },
    envClassificationOnprem: { type: "array", items: classificationLevel },
    envInstances: { type: "array", items: { type: "object" } },
    additionalGrowth: { type: "boolean" },
    anticipatedYearlyAdditionalCapacity: { type: "integer" },
    currentEnvironmentReplicatedOptimized: { type: "string" },
    statementReplicated: { type: "string" },
    hasPhasedApproach: { type: "boolean" },
    phasedApproachSchedule: { type: "string" },
    needsArchitecturalDesignServices: { type: "boolean" },
    architecturalDesignRequirement: { type: "object", nullable: true },
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

export const periodOfPerformance = {
  type: "object",
  properties: {
    basePeriod: period,
    optionPeriods: { type: "array", items: period },
    popStartRequest: { type: "boolean" },
    requestedPopStartDate: { type: "string" },
    timeFrame: { enum: [TimeFrame.NO_LATER_THAN, TimeFrame.NO_SOONER_THAN, null] },
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

const travel = {
  type: "array",
  items: { type: "object" },
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
    piiPresent: { type: "boolean" },
    systemOfRecordName: { type: "string" },
    travel,
  },
};

const section508AccessibilityStandards = {
  type: "object",
  properties: {
    section508Sufficient: { type: "boolean" },
    accessibilityReqs508: { type: "string" },
  },
};

const descriptionOfWork = {
  type: "object",
  properties: {
    awardHistory,
    contractInformation: { type: "array", items: { type: "object" } },
    toTitle: { type: "string" },
    scope: { type: "string" },
    surgeRequirementCapacity: { type: "integer" },
    surgeRequirementCapabilities: { type: "boolean" },
    currentEnvironment,
    selectedClassificationLevels: { type: "array", items: { type: "object" } },
    architecturalDesignRequirement: { type: "object", nullable: true },
    xaasOfferings: { type: "object" },
    crossDomainSolutions: { type: "object" },
    cloudSupportPackages: { type: "array", items: { type: "object" } },
    contractType: { type: "object" },
    periodOfPerformance,
    securityRequirements: { type: "array", items: { type: "object" } },
    contractConsiderations,
    sensitiveInformation: section508AccessibilityStandards,
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
    idiqClin: { type: "string" },
    contractType: { type: "string" },
    dowTaskNumber: { type: "string" },
    serviceTitle: { type: "string" },
    itemDescription: { type: "string" },
    unitPrice: { type: "number" },
    quantity: { type: "integer" },
    unit: { type: "string" },
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
const instructions = {
  type: "object",
  properties: {
    estimateDescription: { type: "string" },
    assumptionsMade: { type: "string" },
    toolsUsed: { type: "string" },
    informationSource: { type: "string" },
    previousEstimateComparison: { type: "string" },
  },
};

const independentGovernmentCostEstimate = {
  type: "object",
  properties: {
    fundingDocument,
    surgeCapabilities: { type: "integer" },
    periodsEstimate,
    instructions,
    contractingShop: { type: "object", properties: { name: { type: "string" }, fee: { type: "number" } } },
  },
  additionalProperties: false,
};

const incrementalFundingPlan = {
  type: "object",
  properties: {
    requirementsTitle: { type: "string" },
    missionOwner: { type: "string" },
    financialPoc: { type: "string" },
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
export const evalPlan = {
  type: "object",
  properties: {
    taskOrderTitle: { type: "string" },
    sourceSelection: {
      type: "string",
      enum: [
        SourceSelection.NO_TECH_PROPOSAL,
        SourceSelection.TECH_PROPOSAL,
        SourceSelection.SET_LUMP_SUM,
        SourceSelection.EQUAL_SET_LUMP_SUM,
      ],
    },
    method: {
      enum: [EvalPlanMethod.BEST_USE, EvalPlanMethod.LOWEST_RISK, EvalPlanMethod.BVTO, EvalPlanMethod.LPTA, null],
    },
    standardSpecifications: {
      type: "array",
      items: {
        type: "string",
      },
    },
    customSpecifications: {
      type: "array",
      items: {
        type: "string",
      },
    },
    standardDifferentiators: {
      type: "array",
      items: {
        type: "string",
      },
    },
    customDifferentiators: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  additionalProperties: false,
};

// J&A

export const fairOpportunity = {
  type: "object",
  properties: {
    procurementDiscussion: { type: "string" },
    procurementPreviousImpact: { type: "string" },
    marketResearchDetails: { type: "string" },
    causeOfSoleSourceSituation: { type: "string" },
    procurementHasExistingEnv: { type: "boolean" },
    minimumGovernmentRequirements: { type: "string" },
    plansToRemoveBarriers: { type: "string" },
    requirementImpact: { type: "string" },
    exceptionToFairOpportunity: { type: "string" },
    otherFactsToSupportLogicalFollowOn: { type: "string" },
    whyCspIsOnlyCapableSource: { type: "string" },
    proposedVendor: { type: "string" },
    justification: { type: "string" },
  },
  additionalProperties: false,
};
export const pointOfContact = {
  type: "object",
  properties: {
    formalName: { type: "string" },
    phoneAndExtension: { type: "string" },
    title: { type: "string" },
  },
  additionalProperties: false,
};

export const justificationAndApproval = {
  type: "object",
  properties: {
    cor: pointOfContact,
    technicalPoc: pointOfContact,
    requirementsPoc: pointOfContact,
    periodOfPerformance,
    fairOpportunity,
    procurementHistory: { type: "array", items: contractInformation },
    fundingRequestFiscalYear: { type: "string" },
    otherContractingShopFullAddress: { type: "string" },
    title: { type: "string" },
    jwccContractNumber: { type: "string" },
    estimatedValue: { type: "string" },
    organizationFullAddress: { type: "string" },
    scope: { type: "string" },
    contractingShop: { type: "string" },
    purchaseRequestNumber: { type: "string" },
    agencyLabel: { type: "string" },
    taskOrderType: { type: "string" },
  },
  additionalProperties: false,
};

export const generateDocumentSchema = {
  type: "object",
  properties: {
    documentType: {
      enum: [
        DocumentType.DESCRIPTION_OF_WORK_PDF,
        DocumentType.DESCRIPTION_OF_WORK_DOCX,
        DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE,
        DocumentType.INCREMENTAL_FUNDING_PLAN,
        DocumentType.EVALUATION_PLAN,
        DocumentType.REQUIREMENTS_CHECKLIST,
        DocumentType.JUSTIFICATION_AND_APPROVAL,
      ],
    },
    templatePayload: {
      oneOf: [
        descriptionOfWork,
        independentGovernmentCostEstimate,
        incrementalFundingPlan,
        evalPlan,
        requirementsCheckList,
        justificationAndApproval,
      ],
    },
  },
};
