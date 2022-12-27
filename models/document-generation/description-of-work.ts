export interface DescriptionOfWork {
    awardHistory?: IAward[];
    contractInformation?: IContractInformation;
    toTitle: string;
    scope: string;
    scopeSurge?: number;
    currentEnvironment?: ICurrentEnvironment;
    xaasOfferings?: IXaaSOfferings[];
    crossDomainSolutions?: ICrossDomainSolutions;
    cloudSupportPackages?: ICloudSupportPackage[];
    periodOfPerformance: PeriodOfPerformance;
    securityRequirements?: SecurityRequirement[];
    contractConsiderations?: IContractConsiderations;
    sensitiveInformation?: ISensitiveInformation
    architecturalDesignRequirements: ArchitecturalDesignRequirement
}
export interface IContractType {
    firmFixedPrice: boolean;
    timeAndMaterials: boolean;
    contractTypeJustification: string;
  }

export interface ISensitiveInformation {
    section508Sufficient?: boolean;
    accessibilityReqs508?: string;
}
export interface IXaaSOfferings {
    serviceOffering: ISelectedServiceOffering;
    instanceConfigurations: IEnvironmentInstance[] | IComputeEnvironmentInstance[] | IDatabaseEnvironmentInstance[];
}

export interface ICloudSupportPackage {
    supportingInfo?: ICloudSupportEnvironmentInstance[];
}
export enum ContractAwardType {
    INITIAL_AWARD = "INITIAL_AWARD",
    MODIFICATION = "MODIFICATION"
}
export interface IAward {
    contractAwardType: ContractAwardType;
    modificationOrder?: number;
    /** Format: date */
    effectiveDate: string;
}

/** @description Part of DOW, represents Current Contract Information table fields */
export interface IContractInformation {
    contractNumber: string;
    currentContractExists: boolean;
    contractExpirationDate?: string;
    incumbentContractorName?: string;
    previousTaskOrderNumber?: string;
}

/** @description Cross Domain Solutions (CDS) for the transfer of data between classification levels */
export interface ICrossDomainSolutions {
    crossDomainSolutionRequired: boolean;
    anticipatedNeedOrUsage?: string;
    needForEntireTaskOrderDuration?: boolean;
    selectedPeriods?: IPeriod[];
    trafficPerDomainPair?: string;
    projectedFileStreamType?: string;
}

export enum EnvironmentLocation {
    CLOUD,
    ON_PREM,
    HYBRID
}

export enum ReplicateOrOptimize {
    YES_REPLICATE,
    YES_OPTIMIZE,
    NO
}
/** @description Encapsulates data for the Background/Current Environment and part of Performance Requirements sections of the DOW */
export interface ICurrentEnvironment {
    currentEnvironmentExists: boolean;
    hasSystemDocumentation: boolean;
    hasMigrationDocumentation: boolean;
    envLocation: EnvironmentLocation;
    envClassificationsCloud?: IClassificationLevel[];
    envClassificationsOnprem?: IClassificationLevel[];
    envInstances?: ICurrentEnvironmentInstance[];
    additionalGrowth?: boolean;
    anticipatedYearlyAdditionalCapacity?: number;
    currentEnvironmentReplicatedOptimized?: ReplicateOrOptimize;
    statementReplicatedOptimized?: string;
    hasPhasedApproach: boolean;
    phasedApproachSchedule?: string;
    needsArchitecturalDesignServices: boolean;
    architecturalDesignRequirement?: ArchitecturalDesignRequirement;
    selectedClassificationLevels: ISelectedClassificationLevel[];
    systemDocumentation?: BinaryData;
    migrationDocumentation?: BinaryData;
}

export enum InstanceLocation {
    CLOUD,
    ON_PREMISE
}
export enum PerformanceTier {
    GENERAL = "General",
    COMPUTE = "Compute",
    MEMORY = "Memory",
    STORAGE = "Storage"
}
export enum PricingModel {
    PAY_AS_YOU_GO,
    PREPAID
}

export enum StorageType {
    BLOCK = "Block Storage",
    OBJECT = "Object Storage",
    FILE = "File Storage",
    ARCHIVE = "Archival Storage"
}
/** @description Base instance used for various sections of information captured in a Package mainly used for document generation (e.g., DOW) */
export interface IEnvironmentInstance {
    anticipatedNeedOrUsage?: string;
    osLicensing: Licensing;
    instanceName: string;
    numberOfInstances?: number;
    needForEntireTaskOrderDuration?: boolean;
    selectedPeriods?: IPeriod[];
    classificationLevel: IClassificationLevel;
    instanceLocation: InstanceLocation;
    region: Region[];
    performanceTier: PerformanceTier;
    pricingModel: PricingModel;
    /**
     * Format: date 
     * @example 2022-07-01
     */
    pricingModelExpiration: string;
    licensing: string;
    operatingSystem: string;
    numberOfvCPUs: number;
    processorSpeed?: number;
    storageType: StorageType;
    storageAmount: number;
    storageUnit: StorageUnit;
    memoryAmount: number;
    memoryUnit: StorageUnit;
    dataEgressMonthlyAmount: number;
    dataEgressMonthlyUnit: StorageUnit;
}

export enum UsageDescription {
    EVEN_USAGE,
    IRREGULAR_USAGE
}

/** @description Extends Envrionment Instance with additional properties specific to current environment instances */
export interface ICurrentEnvironmentInstance extends IEnvironmentInstance {
    additionalInformation?: string;
    currentUsageDescription?: UsageDescription;
    isTrafficSpikeEventBased?: boolean;
    trafficSpikeEventDescription?: string;
    isTrafficSpikePeriodBased?: boolean;
    trafficSpikePeriodDescription?: string;
    deployedRegions?: Region[];
    usersPerRegion?: number;
    operatingEnvironment?: OperatingEnvironment;
    environmentType?: EnvironmentType;
} 
/** @description Extends Environment Instance with additional properties specific to compute instances */
export interface IComputeEnvironmentInstance extends IEnvironmentInstance {
    environmentType?: EnvironmentType;
    operatingEnvironment?: OperatingEnvironment;
} 

export enum DatabaseType {
    ANALYTICAL = "Analytical",
    TRANSACTIONAL = "Transactional",
    GRAPH = "Graph",
    RELATIONAL = "Relational",
    OTHER = "OTHER"
}

/** @description Extends Environment Instance with additional properties specific to database instances */
export interface IDatabaseEnvironmentInstance {
    databaseType?: DatabaseType;
    databaseTypeOther?: string;
    databaseLicensing?: Licensing;
}

export enum FacilityType {
    GOVERNMENT_FACILITY = "Government Facility",
    NON_GOVERNMENT_FACILITY = "Non-Government Facility"
}

export enum TrainingFormat {
    ONSITE_INSTRUCTOR_CONUS = "Onsite - Instructor Led - CONUS",
    ONSITE_INSTRUCTOR_OCONUS = "Onsite - Instructor Led - OCONUS",
    VIRTUAL_INSTRUCTOR = "Virtual - Instructor Led",
    VIRTUAL_SELF_LED = "Virtual - Self Paced",
    NO_PREFERENCE = "No Preference"
}
/** @description Details related Cloud Support Packages for the Selected Service Offering */
export interface ICloudSupportEnvironmentInstance extends IEnvironmentInstance {
    canTrainInUnclassEnv?: boolean;
    trainingLocation?: string;
    trainingRequirementTitle?: string;
    trainingTimeZone?: string;
    personnelOnsiteAccess?: boolean;
    trainingFacilityType?: FacilityType;
    trainingFormat?: TrainingFormat;
    personnelRequiringTraining?: number;
    serviceType?: ServiceOfferingGroup;
}
/** @description Extends Environment Instance with additional properties specific to estimated environment instances used for document generation */
export interface  EstimatedEnvironmentInstance extends IEnvironmentInstance {
    dowTaskNumber?: string;
    /** Format: float */
    monthlyPrice?: number;
} 

export interface IPortabilityPlan {
    classificationLevel: IClassificationLevel,
    planRequired: boolean;
}

export interface ISupportPackage {
    statementOfObjectives: "string",
    requireForDuration: boolean,
    cspOnSite: boolean,
    classificationLevel: IClassificationLevel
}

export enum EnvironmentType { 
    DEV_TEST = "DEV_TEST",
    PRE_PROD = "PRE_PROD",
    PROD_STAGING = "PROD_STAGING",
    COOP_DIASTER_RECOVERY = "COOP_DIASTER_RECOVERY"
}

export enum OperatingEnvironment { 
    VIRTUAL = "Virtual",
    CONTAINERS = "Containers",
    SERVERLESS = "Serverless",
    END_USER_COMPUTING_VIRTUAL_DESKTOP = "End user computing virtual desktop"
}

export enum Licensing {
        NEW = "New",
        TRANSFER_EXISTING = "Transfer Existing"
}
/** @description A Security Requirement for a specific Service Offering Group in a package */
export interface SecurityRequirement {
    advisoryServicesSecret?: IClassifiedInformationType[];
    advisoryServicesTopSecret?: IClassifiedInformationType[];
    serviceOfferingGroup?: ServiceOfferingGroup;
    /** @enum {string} */
    tsContractorClearanceType?: "TS" | "TS_SCI";
}
/** @description Details for an architectural design of application(s) */
export interface ArchitecturalDesignRequirement {
    applicationsNeedingDesign?: string;
    statement?: string;
    externalFactors?: string;
    dataClassificationLevels?: IClassificationLevel[];
}

export enum Classification {
    U = "Unclassified",
    S = "Secret",
    TS = "Top Secret"
}
export enum ImpactLevel {
    IL2 = "IL2",
    IL4 = "IL4",
    IL5 = "IL5",
    IL6 = "IL6"
}
/** @description Represents a Classification Level for instances of a package */
export interface IClassificationLevel {
    classificationLevel: Classification;
    impactLevel: ImpactLevel,
    additionalInformation: "string"
}

/** @description Describes the classified information in a Classification Instance */
export interface IClassifiedInformationType extends IGeneralInformation{

} 

/** @description Selected Classification Levels for XaaS services */
export interface ISelectedClassificationLevel {
    classificationLevel?: IClassificationLevel;
    classifiedInformationTypes?: IClassifiedInformationType[];
    usersPerRegion?: number;
    dataEgressMonthlyAmount?: number;
    dataEgressMonthlyUnit?: StorageUnit;
    usersIncrease?: boolean;
    userGrowthEstimatedPercentage?: string;
    userGrowthEstimateType?: GrowthEstimateType;
    dataIncrease?: boolean;
    dataGrowthEstimatedPercentage?: string;
    dataGrowthEstimateType?: GrowthEstimateType;
}

/**
 * @description Growth estimate based on a growth in periods or over entire duration 
 * @enum {string}
 */
export enum GrowthEstimateType {
    SINGLE = "SINGLE",
    MULTIPLE = "MULTIPLE"
} 
/**
 * @description Commonly used units for instances used for document generation 
 * @enum {string}
 */
export enum StorageUnit {
    GB = "GB",
    TB = "TB",
    PB = "PB"
}
/** @description A region defining where instances are deployed */
export enum Region {
    CONUS = "CONUS",
    OCONUS = "OCONUS",
} 
/** @description A service selected by the user for a specific usage/need */
export interface ISelectedServiceOffering {
    serviceOffering?: ServiceOffering;
    classificationInstances?: ClassificationInstance[];
    otherServiceOffering?: string;
}

/** @description A general unit to define classification needs */
export interface ClassificationInstance {
    usageDescription?: string;
    classificationLevel?: IClassificationLevel;
    classifiedInformationTypes?: IClassifiedInformationType[];
    dowTaskNumber?: string;
    needForEntireTaskOrderDuration?: boolean;
    selectedPeriods?: IPeriod[];
}

export enum PeriodType {
    BASE,
    OPTION
}

export enum PeriodUnit {
    DAY,
    WEEK,
    MONTH,
    YEAR
}

/** @description A period used for a package Period Of Performance */
export interface IPeriod {
    periodType: PeriodType;
    periodUnitCount: number;
    periodUnit: PeriodUnit | string;
    optionOrder: number;
}
/** @description A single Service Offering Group (Service Offering table) */
export interface ServiceOffering extends IGeneralInformation {
    serviceOfferingGroup: ServiceOfferingGroup;
} 
/** @enum {string} */
export enum ServiceOfferingGroup {
        ADVISORY_ASSISTANCE = "ADVISORY",
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
        PORTABILITY_PLAN = "PORTABILITY_PLAN",
        HELP_DESK_SERVICES = "HELP_DESK_SERVICES",
        DOCUMENTATION_SUPPORT = "DOCUMENTATION_SUPPORT",
        GENERAL_CLOUD_SUPPORT = "GENERAL_CLOUD_SUPPORT",
        STORAGE = "STORAGE"
}  

export interface GeneralSubtask {
    name: string,
    description: string,
    sequence?: number
}

export interface Storage extends GeneralSubtask {
    numberOfInstances: number,
    storageType: {enum: [StorageType.ARCHIVE, StorageType.BLOCK, StorageType.FILE, StorageType.OBJECT]},
    storageAmount: {type: "integer"},
    storageUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
}

export enum TimeFrame {
    NO_LATER_THAN,
    NO_SOONER_THAN
}

/** @description Represents a Period of Performance (PoP) for a package */
export interface PeriodOfPerformance {
    basePeriod?: IPeriod;
    optionPeriods?: IPeriod[];
    popStartRequest?: boolean;
    /**
     * Format: date 
     * @example 2021-07-01
     */
    requestedPopStartDate?: string;
    timeFrame?: TimeFrame
    recurringRequirement?: boolean;
}

/** @description Information for the DOW from the Sensitive Information and Contract Considerations tables */
export interface IContractConsiderations {
    potentialConflictOfInterest?: boolean;
    conflictOfInterestExplanation?: string;
    packagingShippingNoneApply?: boolean;
    packagingShippingOther?: boolean;
    packagingShippingOtherExplanation?: string;
    contractorProvidedTransfer?: boolean;
    piiPresent?: boolean;
    systemOfRecordName?: string;
    travel?: ITravel[];
}

export interface ITravel {
    tripLocation?: string;
    numberOfTravelers?: number;
    numberOfTrips?: number;
    durationInDays?: number;
    selectedPeriods?: IPeriod[];
}

    export interface IGeneralInformation {
    name?: string;
    description?: string;
    sequence?: number;
}

const awardHistory = {
    type: "array",
    items: {
        type: "object",
        properties: {
            contractAwardType: {
                enum: [
                    ContractAwardType.INITIAL_AWARD,
                    ContractAwardType.MODIFICATION
                ]
            },
            modificationOrder: { type: "number" },
            effectiveDate: {type: "string" }
        }
    }
    
}

const contractInformation = {
    type: "object",
    properties: {
        contractNumber: {type: "string"},
        currentContractExists: {type: "boolean"},
        contractExpirationDate: {type: "string"},
        incumbentContractorName: {type: "string"},
        previousTaskOrderNumber: {type: "string"}
    }
}

const classificationLevel = {
    type: "object",
    properties: {
        classification: {
            enum: [
                Classification.U,
                Classification.S,
                Classification.TS
            ]
        },
        impactLevel: {
            enum: [
                ImpactLevel.IL2,
                ImpactLevel.IL4,
                ImpactLevel.IL5,
                ImpactLevel.IL6,
                null
            ]
        },
        additionalInformation: {type: "string"}
    }
}

const architecturalDesignRequirement = {
    type: "object",
    properties: {
        applicationsNeedingDesign: {type: "string"},
        statement: {type: "string"},
        externalFactors: {type: "string"},
        dataClassificationLevels: {type: "array", items: classificationLevel}
    }

    }
    const generalInformation = {
        type: "object",
        properties: {
            name: {type: "string"},
            description: {type: "string"},
            sequence: {type: "string"}
        }
    }

const serviceOffering = {
    type: "object",
    properties: {
        serviceOfferingGroup: {
            enum: [
                ServiceOfferingGroup.ADVISORY_ASSISTANCE,
                ServiceOfferingGroup.DOCUMENTATION_SUPPORT,
                ServiceOfferingGroup.GENERAL_CLOUD_SUPPORT,
                ServiceOfferingGroup.HELP_DESK_SERVICES,
                ServiceOfferingGroup.PORTABILITY_PLAN,
                ServiceOfferingGroup.TRAINING,
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
                ServiceOfferingGroup.STORAGE,
                null
            ]
        },
        ...generalInformation.properties
    }
}


const period = {
    type: "object",
    properties: {
      periodType: { enum: [PeriodType.BASE, PeriodType.OPTION] },
      periodUnitCount: { type: "integer" },
      periodUnit: { enum: [PeriodUnit.DAY, PeriodUnit.MONTH, PeriodUnit.WEEK] },
      optionOrder: { type: "integer", nullable: true },
    },
  };

const classifiedInformationTypes = {
    type: "object",
    properties: {
        name: {type: "string"},
        description: {type: "string"},
        sequence: {type: "integer"}
    }
}

const classificationInstance = {
    type: "object",
    properties: {
        usageDescription: {type: "string"},
        classificationLevel,
        classifiedInformationTypes,
        dowTaskNumber: {type: "string"},
        needForEntireTaskOrderDuration: {type: "boolean"},
        selectedPeriods: {type: "array", items: period}
    }
}

const selectedServiceOffering = {
    type: "object",
    properties: {
        serviceOffering,
        classificationInstances: { type: "array", items: classificationInstance },
        otherServiceOffering: { type: "string" },
        generalInformation
    }
}

const selectedClassificationLevels = {
    type: "object",
    properties: {
        classificationLevel: {type: "array", items: classificationLevel},
        usersPerRegion: {type: "integer"},
        dataEgressMonthlyAmount: {type: "integer"},
        dataEgressMonthlyUnit: {
            enum: [StorageUnit.GB,StorageUnit.TB,StorageUnit.PB]
        },
        usersIncrease: {type: "boolean"},
        userGrowthEstimatedPercentage: {type: "string"},
        userGrowthEstimateType: {
            enum: [GrowthEstimateType.SINGLE,GrowthEstimateType.MULTIPLE]
        },
        dataIncrease: {type: "boolean"},
        dataGrowthEstimatedPercentage: {type: "string"},
        dataGrowthEstimateType: {
            enum: [GrowthEstimateType.SINGLE,GrowthEstimateType.MULTIPLE]
        }
    }
}

const deployedRegions = {
    type: "object",
    properties: {
        usersPerRegion: {type:"array"},
        regions: {
            type: "array", 
            items: {
                enum: [ 
                    Region.CONUS, 
                    Region.OCONUS,

                ]}}
    }
    
}

const environmentInstance = {
    type: "object",
    properties: {
        anticipatedNeedOrUsage: {type: "string"},
        osLicensing: { enum: [Licensing.NEW, Licensing.TRANSFER_EXISTING]},
        instanceName: {type: "string"},
        numberOfInstances: {type: "integer"},
        needForEntireTaskOrderDuration: {type: "boolean"},
        selectedPeriods: {type: "array", items: period },
        classificationLevel,
        instanceLocation: { enum: [InstanceLocation.CLOUD, InstanceLocation.ON_PREMISE]},
        deployedRegions,
        performanceTier: { enum: [PerformanceTier.COMPUTE, PerformanceTier.GENERAL, PerformanceTier.MEMORY, PerformanceTier.STORAGE] },
        pricingModel: { enum: [PricingModel.PAY_AS_YOU_GO, PricingModel.PREPAID]},
        pricingModelExpiration: {type: "string"},
        licensing: {type: "string"},
        operatingSystem: {type: "string"},
        numberOfvCPUs: {type: "integer"},
        processorSpeed: {type: "float"},
        storageType: {enum: [StorageType.ARCHIVE, StorageType.BLOCK, StorageType.FILE, StorageType.OBJECT]},
        storageAmount: {type: "integer"},
        storageUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        memoryAmount: {type: "integer"},
        memoryUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        dataEgressMonthlyAmount: {type: "integer"},
        dataEgressMonthlyUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        selectedClassificationLevels
    }
    
}

const currentEnvironmentInstance = {
    type: "object",
    properties: {
        additionalInformation: {type: "string"},
        numberOfInstances: {type: "integer"},
        classificationLevel,
        currentUsageDescription: {
            enum: [UsageDescription.EVEN_USAGE,UsageDescription.IRREGULAR_USAGE]
        },
        isTrafficSpikeEventBased: {type: "boolean"},
        trafficSpikeEventDescription: {type: "string"},
        isTrafficSpikePeriodBased: {type: "boolean"},
        trafficSpikePeriodDescription: {type: "string"},
        deployedRegions,
        numberOfvCPUs: {type: "integer"},
        processorSpeed: {type: "float"},
        operatingSystem: {type: "string"},
        licensing: {type: "string"},
        storageType: {enum: [StorageType.ARCHIVE, StorageType.BLOCK, StorageType.FILE, StorageType.OBJECT]},
        storageAmount: {type: "integer"},
        storageUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        memoryAmount: {type: "integer"},
        memoryUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        performanceTier: { enum: [PerformanceTier.COMPUTE, PerformanceTier.GENERAL, PerformanceTier.MEMORY, PerformanceTier.STORAGE] },
        dataEgressMonthlyAmount: {type: "integer"},
        dataEgressMonthlyUnit: { enum: [StorageUnit.GB, StorageUnit.TB, StorageUnit.PB] },
        operatingEnvironment: {
            enum: [OperatingEnvironment.CONTAINERS,OperatingEnvironment.END_USER_COMPUTING_VIRTUAL_DESKTOP,OperatingEnvironment.SERVERLESS,OperatingEnvironment.VIRTUAL]
        }, 
        environmentType: {
            enum: [EnvironmentType.COOP_DIASTER_RECOVERY, EnvironmentType.DEV_TEST, EnvironmentType.PRE_PROD, EnvironmentType.PROD_STAGING]
        }
    }
}

const currentEnvironment = {

    type: "object",
    properties: {
        currentEnvironmentExists: {type: "boolean"},
        hasSystemDocumentation: {type: "boolean"},
        hasMigrationDocumentation: {type: "boolean"},
        envLocation: {
            enum:[EnvironmentLocation.CLOUD,EnvironmentLocation.HYBRID,EnvironmentLocation.ON_PREM]
        },
        envClassificationsCloud: {type: "array", items: classificationLevel},
        envClassificationsOnprem: {type: "array", items: classificationLevel},
        envInstances: {type: "array", items: currentEnvironmentInstance},
        additionalGrowth: {type: "boolean"},
        anticipatedYearlyAdditionalCapacity: {type: "integer"},
        currentEnvironmentReplicatedOptimized: {enum: [ReplicateOrOptimize.NO,ReplicateOrOptimize.YES_OPTIMIZE, ReplicateOrOptimize.YES_REPLICATE]},
        statementReplicatedOptimized: {type: "string"},
        hasPhasedApproach: {type: "boolean"},
        phasedApproachSchedule: {type: "string"},
        needsArchitecturalDesignServices: {type: "boolean"},
        architecturalDesignRequirement: {type: "array", items: architecturalDesignRequirement},
        
    }
}

const computeInstance = {
    type: "object",
    properties: {
        ...environmentInstance.properties,
        environmentType: {
            enum: [EnvironmentType.COOP_DIASTER_RECOVERY, EnvironmentType.DEV_TEST, EnvironmentType.PRE_PROD, EnvironmentType.PROD_STAGING]
        },
        operatingEnvironment: {
            enum: [OperatingEnvironment.CONTAINERS,OperatingEnvironment.END_USER_COMPUTING_VIRTUAL_DESKTOP,OperatingEnvironment.SERVERLESS,OperatingEnvironment.VIRTUAL]
        },
    }
}

const databaseInstance = {
    type: "object",
    properties: {
        ...environmentInstance.properties,
        databaseType: { 
            enum: [DatabaseType.ANALYTICAL, DatabaseType.GRAPH, DatabaseType.OTHER, DatabaseType.RELATIONAL, DatabaseType.TRANSACTIONAL]
        },
        databaseTypeOther: {type: "string"},
        databaseLicensing: {
            enum: [Licensing.NEW, Licensing.TRANSFER_EXISTING]
        }
    }
}


const instanceConfigurations = {
    type: "array",
    items: {
            items: {
                environmentInstance,
                computeInstance,
                databaseInstance
        },

    }
}


const service = {
    type: "object",
    properties: {
        selectedServiceOffering,
        instanceConfigurations: instanceConfigurations,

    }
}

const xaasOfferings = {
    type: "array",
    items: service,

}

const portabilityPlan = {
    type: "object",
    properties:{
        classificationLevel: classificationLevel,
        planRequired: {type: "boolean"}
    }
}
export interface ITrafficPerDomainPair {
    name: string,
    dataTransfer: number
}

const trafficPerDomainPair = {
    type: "object",
    properties: {
        name: {type: "string"},
        dataQuantity: {type: "integer"}
    }
}

const crossDomainSolution = {
    type: "object",
    properties: {
        crossDomainSolutionRequired: {type: "boolean"},
        anticipatedNeedOrUsage: {type: "string"},
        needForEntireTaskOrderDuration: {type: "boolean"},
        selectedPeriods: {type: "array", items: period},
        trafficPerDomainPair: {type: "array", items: trafficPerDomainPair},
        projectedFileStreamType: {type: "string"}

    }
}

const cloudSupportEnvironmentInstance = {
    type: "object",
    properties: {
        ...environmentInstance.properties,
        canTrainInUnclassEnv: {type: "boolean"},
        trainingLocation: {type: "string"},
        trainingRequirementTitle: {type: "string"},
        trainingTimeZone: {type: "string"},
        personnelOnsiteAccess: {type: "boolean"},
        trainingFacilityType: FacilityType,
        trainingFormat: TrainingFormat,
        personnelRequiringTraining: {type: "number"},
        serviceType: ServiceOfferingGroup
    }
}

const periodOfPerformance = {
    type: "object",
    properties: {
        basePeriod: {type: "object", period},
        optionPeriods: {type: "array", items: period},
        popStartRequest: {type: "boolean"},
        requestedPopStartDate: {type: "string", nullable: true},
        recurringRequirement: {type: "boolean"}
    }
}

const contractType = {
    type: "object",
    properties: {
        firmFixedPrice: {type: "boolean"},
        timeAndMaterials: {type: "boolean"},
        contractTypeJustification: {type: "string"},
    }
  }

const DescriptionOfWork = {
    type: "object",
    properties: {
        awardHistory,
        contractInformation,
        toTitle: {type: "string"},
        scope: {type: "string"},
        scopeSurge: {type: "integer"},
        currentEnvironment,
        xaasOfferings,
        crossDomainSolution,
        cloudSupportPackages: {type: "array", items: cloudSupportEnvironmentInstance},
        periodOfPerformance,
        contractType,
        architecturalDesignRequirement
    }
}
