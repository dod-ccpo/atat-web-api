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
}
export interface contractType {
    firmFixedPrice: boolean;
    timeAndMaterials: boolean;
    justification: string;
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
    serviceOffering?: ISelectedServiceOffering;
    supportingInfo?: ICloudSupportEnvironmentInstance;
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
    OTHER = "Other"
}

/** @description Extends Environment Instance with additional properties specific to database instances */
export interface IDatabaseEnvironmentInstance {
    databaseType?: DatabaseType;
    databaseTypeOther?: string;
    databaseLicensing?: Licensing;
}

export enum FacilityType {
    GOVERNMENT_FACILITY,
    NON_GOVERNMENT_FACILITY
}

export enum TrainingFormat {
    ONSITE_INSTRUCTOR_CONUS,
    ONSITE_INSTRUCTOR_OCONUS,
    VIRTUAL_INSTRUCTOR,
    VIRTUAL_SELF_LED,
    NO_PREFERENCE
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
    DEV_TEST = "Dev/Test",
    PRE_PROD = "Pre-Prod",
    PROD_STAGING = "Prod/Staging",
    COOP_DIASTER_RECOVERY = "Coop Disaster Recovery"
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
    CONUS_EAST = "CONUS East",
    CONUS_CENTRAL = "CONUS Central",
    CONUS_WEST = "CONUS West",
    AFRICOM = "AFRICOM",
    CENTCOM = "CENTCOM",
    EUCOM = "EUCOM",
    INDOPACOM = "INDOPACOM",
    SOUTHCOM = "SOUTHCOM"
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
    MONTH
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
    serviceOfferingGroup?: ServiceOfferingGroup;
} 
/** @enum {string} */
export enum ServiceOfferingGroup {
    ADVISORY_ASSISTANCE,
    TRAINING,
    PORTABILITY_PLAN,
    HELP_DESK_SERVICES,
    DOCUMENTATION_SUPPORT,
    GENERAL_CLOUD_SUPPORT
}  

export enum XaasServiceOfferingGroup {
    APPLICATIONS, //YES
    COMPUTE, //created
    DATABASE, //object (databaseInstance)
    STORAGE, //YES
    DEVELOPER_TOOLS, //YES
    EDGE_COMPUTING, //YES
    GENERAL_XAAS, //YES
    IOT, //YES 
    MACHINE_LEARNING, //Yes
    NETWORKING, //Yes
    SECURITY //Yes
}

export interface GeneralSubtask {
    name: string,
    description: string
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

const cloudServiceOffering = {
    type: "object",
    properties: {
        name: {type: "string"},
        ServiceOfferingGroup: {
            enum: [
                ServiceOfferingGroup.ADVISORY_ASSISTANCE,
                ServiceOfferingGroup.DOCUMENTATION_SUPPORT,
                ServiceOfferingGroup.GENERAL_CLOUD_SUPPORT,
                ServiceOfferingGroup.HELP_DESK_SERVICES,
                ServiceOfferingGroup.PORTABILITY_PLAN,
                ServiceOfferingGroup.TRAINING,
                null
            ]
        }
    }
}
//TODO REFACTOR TO REMOVE IN FAVOR OF OTHER xaasServiceOffering w/ descriptions et. al.
const xaasServiceOffering = {
    type: "object",
    properties: {
        name: {type: "string"},
        xaasServiceOfferingGroup: {
            enum: [
                XaasServiceOfferingGroup.APPLICATIONS,
                XaasServiceOfferingGroup.COMPUTE,
                XaasServiceOfferingGroup.DATABASE,
                XaasServiceOfferingGroup.DEVELOPER_TOOLS,
                XaasServiceOfferingGroup.EDGE_COMPUTING,
                XaasServiceOfferingGroup.GENERAL_XAAS,
                XaasServiceOfferingGroup.IOT,
                XaasServiceOfferingGroup.MACHINE_LEARNING,
                XaasServiceOfferingGroup.NETWORKING,
                XaasServiceOfferingGroup.SECURITY,
                XaasServiceOfferingGroup.STORAGE,
                null
            ]
        }
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

const classificationInstance = {
    type: "object",
    properties: {
        usageDescription: {type: "string"},
        classificationLevel,
        //TODO Identify the classifiedInformationTypes and declare it
        //classifiedInformationTypes:
        dowTaskNumber: {type: "string"},
        needForEntireTaskOrderDuration: {type: "boolean"},
        selectedPeriods: {type: "array", items: period}
    }
}
//1 level
const selectedServiceOffering = {
    type: "object",
    properties: {
        cloudServiceOffering,
        classificationInstances: { type: "array", items: classificationInstance },
        otherServiceOffering: { type: "string" },
        portabilityPlan: {type: "boolean"},
        statementOfObjectives: {type: "string"},
        durationOfTaskOrder: {type: "boolean"},
        cspOnSiteAccess: {type: "boolean"},
        classificationLevel
    }
}



//Lua : 4.2.1 | 4.2.2 | 4.2.3 | 4.2.4 | 4.2.5
//Anticipated future needs:
const selectedClassificationLevels = {
    type: "object",
    properties: {
        classificationLevel: {type: "array", items: classificationLevel},
        //classifiedInformationTypes: IClassifiedInformationType[];
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
                    Region.AFRICOM, 
                    Region.CENTCOM, 
                    Region.CONUS_CENTRAL, 
                    Region.CONUS_EAST,
                    Region.CONUS_WEST,
                    Region.EUCOM,
                    Region.INDOPACOM,
                    Region.SOUTHCOM
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
        // systemDocumentation: {type: "ArrayBuffer", nullable: true},
        // migrationDocumentation: {type: "ArrayBuffer", nullable: true},
        //currentEnvironmentInstance
        
    }
}

const computeInstance = {
    type: "object",
    properties: {
        ...environmentInstance,
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
        ...environmentInstance,
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
    type: "object",
    properties: {
        environmentInstances: {
            type: "array",
            items: environmentInstance
        },
        computeInstances: {
            type: "array",
            items: computeInstance
        },
        databaseInstances: {
            type: "array",
            items: databaseInstance
        },

    }
}

export interface IXaaSOfferingGroup {
    application: GeneralSubtask[],
    developerTools: GeneralSubtask[],
    edgeComputing: GeneralSubtask[],
    generalXaas: GeneralSubtask[],
    iot: GeneralSubtask[],
    machineLearning: GeneralSubtask[],
    networking: GeneralSubtask[],
    security: GeneralSubtask[],

}
const generalSubtask = {
    type: "object",
    properties: {
        name: {type: "string"},
        description: {type: "string"},
        classificationLevel,
        period
    }
}
const xaasOfferingGroup = {
    type: "object",
    properties: {
        application: {type: "array", items: generalSubtask },
        developerTools: {type: "array", items: generalSubtask },
        edgeComputing: {type: "array", items: generalSubtask },
        generalXaaS: {type: "array", items: generalSubtask },
        iot: {type: "array", items: generalSubtask },
        machineLearning: {type: "array", items: generalSubtask },
        networking: {type: "array", items: generalSubtask },
        security: {type: "array", items: generalSubtask },
        }
}

const xaasOfferings = {
    type: "object",
    properties:{
        
        xaasServiceOffering: xaasOfferingGroup,
        instanceConfigurations: instanceConfigurations
    }
}

const portabilityPlan = {
    type: "object",
    properties:{
        classificationLevel: classificationLevel,
        planRequired: {type: "boolean"}
    }
}

const crossDomainSolutions = {
    type: "object",
    properties: {
        crossDomainSolutionRequired: {type: "boolean"},
        anticipatedNeedOrUsage: {type: "string"},
        needForEntireTaskOrderDuration: {type: "boolean"},
        selectedPeriods: {type: "array", items: period},
        trafficPerDomainPair: {type: "string"},
        projectedFileStreamType: {type: "string"}

    }
}

const cloudSupportPackage = {
    type: "object",
    properties: {
        instanceConfigurations: {
            type: "array",
            items: {
                environmentInstance,
                computeInstance,
                databaseInstance,
                portabilityPlan,
                advisoryAndAssistance: selectedServiceOffering,
                helpDesk: selectedServiceOffering,
                training: selectedServiceOffering,
                docSupport: selectedServiceOffering,
                generalXaaS: selectedServiceOffering
            }
        }
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
        crossDomainSolutions,
        cloudSupportPackage,
        periodOfPerformance
    }
}
