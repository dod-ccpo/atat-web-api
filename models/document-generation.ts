/* eslint-disable camelcase */
import { APIGatewayEventRequestContext } from "aws-lambda";

export enum AwardType {
  INITIAL_AWARD = "INITIAL_AWARD",
  MODIFICATION = "MODIFICATION",
}

export enum DocumentType {
  DESCRIPTION_OF_WORK = "DESCRIPTION_OF_WORK",
  INDEPENDENT_GOVERNMENT_COST_ESTIMATE = "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
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

export interface GeneratedDocument {
  buffer: Buffer;
  headers: {
    "Content-Type": string;
    "Content-Disposition": string;
  };
}
export interface TemplatePaths {
  [DocumentType.DESCRIPTION_OF_WORK]: { html: string; css: string };
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: { excel: string };
}
export interface IAward {
  contract_award_type: AwardType;
  effective_date: string;
  modification_order: number | undefined;
}

export interface IContractInformation {
  contract_information: string;
  current_contract_exists: boolean;
  contract_expiration_date: string;
  incumbent_contractor_name: string;
  previous_task_order_number: string;
}

export interface IPeriod {
  period_type: PeriodType;
  period_unit_count: number;
  period_unit: PeriodUnit | string;
  option_order: number;
}

export interface IClassificationLevel {
  classification_level: Classification;
  impact_level: ImpactLevel;
}

export interface IEnvironmentInstance {
  instance_name: string;
  classification_level: IClassificationLevel;
  instance_location: InstanceLocation;
  csp_region: TargetCspName;
  performance_tier: string;
  pricing_model: PricingModel;
  pricing_model_expiration: string;
  operating_system_licensing: string;
  number_of_vCPUs: number;
  storage_type: string;
  storage_amount: number;
  storage_unit: StorageUnit;
  memory_amount: number;
  memory_unit: StorageUnit;
  data_egress_monthly_amount: number;
  data_egress_monthly_unit: StorageUnit;
}

export interface ICurrentEnvironment {
  current_environment_exists: boolean;
  environment_instances: IEnvironmentInstance[];
  additional_info: string;
}

export interface IClassificationInstance {
  usage_description: string;
  selected_periods: IPeriod[];
  classification_level: IClassificationLevel;
  need_for_entire_task_order_duration: boolean;
}

export interface IServiceOffering {
  name: string;
  service_offering_group: ServiceOfferingGroup;
}

export interface ISelectedServiceOffering {
  service_offering: IServiceOffering;
  classification_instances: IClassificationInstance[];
  other_service_offering: string;
}

export interface IPeriodOfPerformance {
  base_period: IPeriod;
  option_periods: IPeriod[];
  pop_start_request: boolean;
  requested_pop_start_date: string;
  time_frame: TimeFrame;
  recurring_requirement: boolean;
}

export interface IGFEOverview {
  dpas_unit_id: string;
  property_custodian_name: string;
  dpas_custodian_number: string;
  property_accountable: boolean;
  gfe_or_gfp_furnished: boolean;
}

export interface IContractConsiderations {
  packaging_shipping_none_apply: boolean;
  packaging_shipping_other: boolean;
  packaging_shipping_other_explanation: string;
  potential_conflict_of_interest: boolean;
  conflict_of_interest_explanation: string;
  contractor_provided_transfer: boolean;
  contractor_required_training: boolean;
  required_training_services: string[];
}

export interface ISensitiveInformation {
  pii_present: boolean;
  work_to_be_performed: string;
  system_of_record_name: string;
  FOIA_city_apo_fpo: string;
  FOIA_country: string;
  FOIA_street_address_1: string;
  FOIA_street_address_2: string;
  FOIA_address_type: AddressType;
  FOIA_state_province_code: string;
  FOIA_full_name: string;
  FOIA_email: string;
  FOIA_zip_postal_code: string;
  BAA_required: boolean;
  potential_to_be_harmful: boolean;
  section_508_sufficient: boolean;
  accessibility_reqs_508: string;
}

export interface DescriptionOfWork {
  award_history: IAward[];
  contract_information: IContractInformation;
  to_title: string;
  scope: string;
  scope_surge: number;
  current_environment: ICurrentEnvironment;
  selected_service_offerings: ISelectedServiceOffering[];
  period_of_performance: IPeriodOfPerformance;
  gfe_overview: IGFEOverview;
  contract_considerations: IContractConsiderations;
  section_508_accessibility_standards: ISensitiveInformation;
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

export interface GenerateDocumentRequest {
  documentType: DocumentType;
  templatePayload: DescriptionOfWork | IndependentGovernmentCostEstimate;
}

export interface RequestEvent<T> {
  body: T;
  requestContext: APIGatewayEventRequestContext;
}

// Schema validation used by middy
const award_history = {
  type: "array",
  items: {
    type: "object",
    properties: {
      contract_award_type: { enum: [AwardType.INITIAL_AWARD, AwardType.MODIFICATION] },
      effective_date: { type: "string" },
      modification_order: { type: "string" },
    },
  },
};

const classification_level = {
  type: "object",
  properties: {
    classification: { enum: [Classification.U, Classification.S, Classification.TS] },
    impact_level: { enum: [ImpactLevel.IL2, ImpactLevel.IL4, ImpactLevel.IL5, ImpactLevel.IL6, null] },
  },
};

const contract_information = {
  type: "object",
  properties: {
    contract_number: { type: "string" },
    current_contract_exists: { type: "boolean" },
    contract_expiration_date: { type: "string" },
    incumbent_contractor_name: { type: "string" },
    previous_task_order_number: { type: "string" },
  },
};

const environment_instance = {
  type: "object",
  properties: {
    instance_name: { type: "string" },
    classification_level,
    instance_location: { enum: [InstanceLocation.CSP, InstanceLocation.HYBRID, InstanceLocation.ON_PREMISE] },
    csp_region: { enum: [TargetCspName.CSP_A, TargetCspName.CSP_B, TargetCspName.CSP_C, TargetCspName.CSP_D, null] },
    performance_tier: { type: "string" },
    pricing_model: { enum: [PricingModel.ON_DEMAND, PricingModel.PAY_AS_YOU_GO, PricingModel.RESERVED] },
    pricing_model_expiration: { type: "string" },
    operating_system_licensing: { type: "string" },
    number_of_vCPUs: { type: "integer" },
    storage_type: { type: "string", nullable: true },
    storage_amount: { type: "integer" },
    storage_unit: { enum: [StorageUnit.GB, StorageUnit.TB] },
    memory_amount: { type: "integer" },
    memory_unit: { enum: [StorageUnit.GB, StorageUnit.TB] },
    data_egress_monthly_amount: { type: "integer" },
    data_egress_monthly_unit: { enum: [StorageUnit.GB, StorageUnit.TB] },
  },
};

const current_environment = {
  type: "object",
  properties: {
    current_environment_exists: { type: "boolean" },
    environment_instances: { type: "array", items: environment_instance },
    additional_info: { type: "string" },
  },
};

const service_offering = {
  type: "object",
  properties: {
    name: { type: "string" },
    service_offering_group: {
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
    period_type: { enum: [PeriodType.BASE, PeriodType.OPTION] },
    period_unit_count: { type: "integer" },
    period_unit: { enum: [PeriodUnit.DAY, PeriodUnit.MONTH, PeriodUnit.WEEK, PeriodUnit.YEAR] },
    option_order: { type: "integer", nullable: true },
  },
};

const classification_instance = {
  type: "object",
  properties: {
    usage_description: { type: "string" },
    selected_periods: { type: "array", items: period },
    classification_level,
    need_for_entire_task_order_duration: { type: "boolean" },
  },
};

const selected_service_offering = {
  type: "object",
  properties: {
    service_offering,
    classification_instances: { type: "array", items: classification_instance },
    other_service_offering: { type: "string" },
  },
};

const period_of_performance = {
  type: "object",
  properties: {
    base_period: period,
    option_periods: { type: "array", items: period },
    pop_start_request: { type: "boolean" },
    requested_pop_start_date: { type: "string" },
    time_frame: { enum: [TimeFrame.NO_LATER_THAN, TimeFrame.NO_SOONER_THAN] },
    recurring_requirement: { type: "boolean" },
  },
};

const gfe_overview = {
  type: "object",
  properties: {
    dpas_unit_id: { type: "string" },
    property_custodian_name: { type: "string" },
    dpas_custodian_number: { type: "string" },
    property_accountable: { type: "boolean" },
    gfe_or_gfp_furnished: { type: "boolean" },
  },
};

const contract_considerations = {
  type: "object",
  properties: {
    packaging_shipping_none_apply: { type: "boolean" },
    packaging_shipping_other: { type: "boolean" },
    packaging_shipping_other_explanation: { type: "string" },
    potential_conflict_of_interest: { type: "boolean" },
    conflict_of_interest_explanation: { type: "string" },
    contractor_provided_transfer: { type: "boolean" },
    contractor_required_training: { type: "boolean" },
    required_training_services: { type: "array", items: { type: "string" } },
  },
};

const section_508_accessibility_standards = {
  type: "object",
  properties: {
    pii_present: { type: "boolean" },
    work_to_be_performed: { type: "string" },
    system_of_record_name: { type: "string" },
    FOIA_city_apo_fpo: { type: "string" },
    FOIA_country: { type: "string" },
    FOIA_street_address_1: { type: "string" },
    FOIA_street_address_2: { type: "string" },
    FOIA_address_type: { enum: [AddressType.FOREIGN, AddressType.MILITARY, AddressType.US, null] },
    FOIA_state_province_code: { type: "string" },
    FOIA_full_name: { type: "string" },
    FOIA_email: { type: "string" },
    FOIA_zip_postal_code: { type: "string" },
    BAA_required: { type: "boolean" },
    potential_to_be_harmful: { type: "boolean" },
    section_508_sufficient: { type: "boolean" },
    accessibility_reqs_508: { type: "string" },
  },
};

const descriptionOfWork = {
  type: "object",
  properties: {
    award_history,
    contract_information,
    to_title: { type: "string" },
    scope: { type: "string" },
    scope_surge: { type: "integer" },
    current_environment,
    selected_service_offerings: { type: "array", items: selected_service_offering },
    period_of_performance,
    gfe_overview,
    contract_considerations,
    section_508_accessibility_standards,
  },
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
  clin: { type: "string" },
  idiqClin: { type: "string" },
  dowTaskNumber: { type: "string" },
  serviceOffering: { type: "string" },
  itemDescriptionOrConfigSummary: { type: "string" },
  monthlyPrice: { type: "number" },
  monthsInPeriod: { type: "integer" },
};

const periodsEstimate = {
  type: "object",
  properties: {
    period,
    periodLineItems: { type: "array", items: periodLineItem },
  },
};

const independentGovernmentCostEstimate = {
  type: "object",
  properties: {
    fundingDocument,
    surgeCapabilities: { type: "integer" },
    periodsEstimate,
  },
};

export const generateDocumentSchema = {
  type: "object",
  properties: {
    documentType: {
      enum: [DocumentType.DESCRIPTION_OF_WORK, DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE],
    },
    templatePayload: {
      oneOf: [descriptionOfWork, independentGovernmentCostEstimate],
    },
  },
};
