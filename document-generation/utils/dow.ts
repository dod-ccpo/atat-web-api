import { IEnvironmentInstance } from "../../models/document-generation";
import {
  Classification,
  EnvironmentType,
  IComputeEnvironmentInstance,
  IContractType,
  ICurrentEnvironmentInstance,
  IDatabaseEnvironmentInstance,
  ImpactLevel,
  IPeriod,
  PeriodType,
  ReplicateOrOptimize,
  ServiceOfferingGroup,
  StorageUnit,
} from "../../models/document-generation/description-of-work";

import { logger } from "../../utils/logging";
import { formatEnum } from "./utils";

const xaasServiceGroupsOrder = [
  "COMPUTE",
  "DEVELOPER_TOOLS",
  "APPLICATIONS",
  "MACHINE_LEARNING",
  "NETWORKING",
  "SECURITY",
  "DATABASE",
  "STORAGE",
  "EDGE_COMPUTING",
  "IOT",
  "GENERAL_XAAS",
];

const cloudSupportGroupsOrder = [
  "ADVISORY_ASSISTANCE",
  "HELP_DESK_SERVICES",
  "TRAINING",
  "DOCUMENTATION_SUPPORT",
  "GENERAL_CLOUD_SUPPORT",
  // NOTE: Portabilty plan is provided at the impact level under section 4.3.x
  // and does not have a forth number in the task number. The numbering is
  // an exception to the rule for Cloud Support Packages.
  // "PORTABILITY_PLAN",
];
const classificationLevelsOrder = ["IL2", "IL4", "IL5", "IL6", "TS"];

export type InstancesWithStorageType =
  | IEnvironmentInstance
  | IComputeEnvironmentInstance
  | ICurrentEnvironmentInstance
  | IDatabaseEnvironmentInstance;
export const formatStorageType = (env: InstancesWithStorageType) => {
  if (!env || !env.performanceTier) {
    // An indicator on the document that a value was not provided
    return `N/A`;
  }
  return `${formatEnum(env.performanceTier)} Storage: ${env.storageAmount} ${env.storageUnit}`;
};

export const formatExpirationDate = (exp: string) => {
  const formattedDate = new Date(exp).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  if (!exp || formattedDate === "Invalid Date") {
    return `N/A`;
  }
  return formattedDate;
};

export const formatImpactLevel = (impactLevel: any) => {
  const impactLevels = classificationLevelsOrder;
  if (!impactLevel || !impactLevels.includes(impactLevel)) {
    logger.debug("No impact level provided.");
    return `N/A`;
  }
  const impactNumber = impactLevel.slice(-1);
  return `Impact Level IL${impactNumber} (${impactLevel})`;
};

/**
 * Sorts the Selected Classification Levels based on the user selected
 * as required for classification level of the instances.
 * @param instances
 * @returns an object of the sorted instances of XaaS Services
 */
export const sortSelectedClassificationLevels = (instances: any) => {
  const sortedInstances: any = {};

  instances.forEach((instance: any) => {
    if (instance.classificationLevel.classification === Classification.TS) {
      sortedInstances.ts = instance;
    } else {
      switch (instance.classificationLevel.impactLevel) {
        case "IL2":
          sortedInstances.il2 = instance;
          break;
        case "IL4":
          sortedInstances.il4 = instance;
          break;
        case "IL5":
          sortedInstances.il5 = instance;
          break;
        case "IL6":
          sortedInstances.il6 = instance;
          break;
        default:
          logger.debug("No impact level was provided for instance with a Selected Classification Levels.");
      }
    }
  });

  return sortedInstances;
};

/**
 *  Filter and group data classification levels based on impact level
 * @param dataLevels
 * @returns filtered classification levels as an object with each level
 */
export const filterDataLevels = (dataLevels: any) => {
  const allLevels = dataLevels.map((level: any) => level.classification);
  const levels: any = {};
  if (allLevels.includes(Classification.U)) {
    levels.unclassified = dataLevels.filter((level: any) => level.classification === Classification.U);
  }
  levels.secret = allLevels.includes(Classification.S);
  levels.ts = allLevels.includes(Classification.TS);

  return levels;
};

/**
 * Sorts compute, database, general and storage instances
 * based on the classification level in each instance.
 * @param instances
 * @returns an object of the sorted instances of Services
 */
export const sortInstanceClassificationLevels = (instances: any) => {
  const sortedInstances: any = { il2: [], il4: [], il5: [], il6: [], ts: [] };

  instances.forEach((instance: any) => {
    if (!instance.classificationLevel) {
      logger.error(`No Classification Level found for a compute/database/storage/general service.`);
      return;
    }
    if (instance.classificationLevel.classification === Classification.TS) {
      sortedInstances.ts.push(instance);
    } else {
      switch (instance.classificationLevel.impactLevel) {
        case ImpactLevel.IL2:
          sortedInstances.il2.push(instance);
          break;
        case ImpactLevel.IL4:
          sortedInstances.il4.push(instance);
          break;
        case ImpactLevel.IL5:
          sortedInstances.il5.push(instance);
          break;
        case ImpactLevel.IL6:
          sortedInstances.il6.push(instance);
          break;
        default:
          logger.debug("No impact Level was provided for a compute/database/storage/general instance.");
      }
    }
  });

  return sortedInstances;
};

/**
 * Sorts each offering group of Selected Service Offerings
 * @param selectedServices
 * @returns object containing each offering group and the impact levels.
 */
export const sortSelectedInstancesByLevels = (selectedServices: any) => {
  const selectedList = Object.keys(selectedServices);
  const services = {} as any;

  selectedList.forEach((offeringGroup: string) => {
    if (!services[offeringGroup]) {
      services[offeringGroup] = { il2: [], il4: [], il5: [], il6: [], ts: [] };
    }
    services[offeringGroup].il2 = getSelectedInstances(ImpactLevel.IL2, offeringGroup, selectedServices);
    services[offeringGroup].il4 = getSelectedInstances(ImpactLevel.IL4, offeringGroup, selectedServices);
    services[offeringGroup].il5 = getSelectedInstances(ImpactLevel.IL5, offeringGroup, selectedServices);
    services[offeringGroup].il6 = getSelectedInstances(ImpactLevel.IL6, offeringGroup, selectedServices);
    services[offeringGroup].ts = getSelectedInstances(Classification.TS, offeringGroup, selectedServices);
  });
  return services;
};

/**
 * Sort and group the Selected Service Offerings with the group as the
 * key.
 * @param selectedServices
 * @returns an object containing the selected service offering by group
 */
export const sortSelectedServicesByGroups = (selectedServices: any) => {
  const services = {} as any;

  selectedServices.forEach((service: any) => {
    const { serviceOffering } = service;
    if (!services[serviceOffering.serviceOfferingGroup]) {
      services[serviceOffering.serviceOfferingGroup] = [service];
    } else {
      services[serviceOffering.serviceOfferingGroup].push(service);
    }
  });

  return services;
};

/**
 * Sort and group the Cloud Support Packages with the service as the
 * key.
 * @param cloudSupportPackages
 * @returns an object containing the cloud support packages by service.
 */
export const sortSupportPackagesByGroups = (cloudSupportPackages: any) => {
  const supportPackages = {} as any;

  cloudSupportPackages.forEach((cloudPackage: any) => {
    const { serviceType } = cloudPackage;
    if (!supportPackages[serviceType]) {
      supportPackages[serviceType] = [cloudPackage];
    } else {
      supportPackages[serviceType].push(cloudPackage);
    }
  });

  return supportPackages;
};

/**
 * Sorts each offering group of Selected Service Offerings
 * @param supportPackages
 * @returns object containing each offering group and the impact levels.
 */
export const sortSupportPackagesByLevels = (supportPackages: any) => {
  const selectedList = Object.keys(supportPackages);
  const services = {} as any;

  selectedList.forEach((cloudPackage: string) => {
    if (!services[cloudPackage]) {
      services[cloudPackage] = { il2: [], il4: [], il5: [], il6: [], ts: [] };
    }
    supportPackages[cloudPackage].forEach((instance: any) => {
      if (!instance.classificationLevel) {
        logger.error(`No Classification Level found for service ${cloudPackage}.`);
        return;
      }
      if (instance.classificationLevel.classification === Classification.TS) {
        services[cloudPackage].ts.push(instance);
      } else {
        switch (instance.classificationLevel.impactLevel) {
          case ImpactLevel.IL2:
            services[cloudPackage].il2.push(instance);
            break;
          case ImpactLevel.IL4:
            services[cloudPackage].il4.push(instance);
            break;
          case ImpactLevel.IL5:
            services[cloudPackage].il5.push(instance);
            break;
          case ImpactLevel.IL6:
            services[cloudPackage].il6.push(instance);
            break;
          default:
            logger.debug("No impact level was provided for a Cloud Support Pkg instance.");
        }
      }
    });
  });
  return services;
};

/**
 * Organize all XaaS services related to section 4.2 of the DOW based on the instance
 * type and service. Selected Service Offerings contain more than one service and are
 * grouped by the service.
 * @param offerings
 * @returns An object with the XaaS service as the key.
 */
export const organizeXaasServices = (offerings: any) => {
  return {
    computeInstances: sortInstanceClassificationLevels(offerings.computeInstances),
    databaseInstances: sortInstanceClassificationLevels(offerings.databaseInstances),
    storageInstances: sortInstanceClassificationLevels(offerings.storageInstances),
    generalInstances: sortInstanceClassificationLevels(offerings.generalInstances),
    selectedInstances: sortSelectedInstancesByLevels(sortSelectedServicesByGroups(offerings.selectedServiceInstances)),
  };
};

export interface ITaskPeriods {
  taskPeriods: string[]; // ["B", "OP1", "OP2"]
}
export interface ITaskPop extends ITaskPeriods {
  dowTaskNumber: string;
  entireDuration: boolean;
}
export interface ITaskGrouping extends ITaskPeriods {
  dowTaskNumbers: string[]; // ["4.2.1.1.1", "4.2.4.3.3"]
}

const hasSameSelectedPeriods = (unique: ITaskGrouping, check: string[]) => {
  if (unique.taskPeriods.length !== check.length) {
    return false;
  }
  const hasAllPeriods = check.every((period: any) => unique.taskPeriods.includes(period));
  return hasAllPeriods;
};

/**
 * Gather all PoP related information for each Task and Subtasks for a given DOW.
 * Grouping the PoP based entire duration or various subsets of the given PoP.
 *
 * @param payload
 * @returns An object containing all task/subtask PoP information
 */
export const getTaskPeriods = (payload: any) => {
  const { crossDomainSolutions, cloudSupportPackages, periodOfPerformance } = payload;
  const xaasOfferings = organizeXaasServices(payload.xaasOfferings);
  const { basePeriod, optionPeriods } = periodOfPerformance;

  // group the periods based on array like ["B", "OP1", "OP2"]
  const popPeriods: string[] = [];
  if (basePeriod) {
    popPeriods.push("B");
  }
  if (optionPeriods) {
    optionPeriods
      .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
      // The base period is 1 so the optionOrder property is not used
      // the base period should have been 0 or -1 to be an exception to the rule
      .forEach((period: IPeriod) => popPeriods.push(`OP${period.optionOrder - 1}`));
  }

  const { computeInstances, databaseInstances, storageInstances, generalInstances, selectedInstances } = xaasOfferings;

  const levelIdentifiers = ["il2", "il4", "il5", "il6", "ts"];
  const computeTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return computeInstances[id].map((instance: any, index: number) => {
      const instanceType = ServiceOfferingGroup.COMPUTE;
      return getInstancePop(instance, instanceType, index);
    });
  });

  const databaseTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return databaseInstances[id].map((instance: any, index: number) => {
      const instanceType = ServiceOfferingGroup.DATABASE;
      return getInstancePop(instance, instanceType, index);
    });
  });

  const storageTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return storageInstances[id].map((instance: any, index: number) => {
      const instanceType = ServiceOfferingGroup.STORAGE;
      return getInstancePop(instance, instanceType, index);
    });
  });

  const generalTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return generalInstances[id].map((instance: any, index: number) => {
      const instanceType = ServiceOfferingGroup.GENERAL_XAAS;
      return getInstancePop(instance, instanceType, index);
    });
  });

  const serviceTypes = Object.keys(xaasOfferings.selectedInstances);
  const selectedServiceTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return serviceTypes.flatMap((serviceGroup: string) => {
      return selectedInstances[serviceGroup][id].map((instance: any, index: number) => {
        const instanceType = instance.serviceOfferingGroup;
        return getInstancePop(instance, instanceType, index);
      });
    });
  });

  // gets CDS PoP information for section 7
  const { crossDomainSolutionRequired, needForEntireTaskOrderDuration, selectedPeriods } = crossDomainSolutions;
  const crossDomainSolutionTaskNumber = [];
  if (crossDomainSolutionRequired && needForEntireTaskOrderDuration) {
    crossDomainSolutionTaskNumber.push({ dowTaskNumber: "4.2.6", entireDuration: true, taskPeriods: [] });
  }
  if (crossDomainSolutionRequired && !needForEntireTaskOrderDuration) {
    const cdsTaskPeriods: string[] = [];
    if (selectedPeriods && selectedPeriods.length >= 1) {
      const basePeriod = selectedPeriods.filter((period: IPeriod) => period.periodType === PeriodType.BASE);
      if (basePeriod.length === 1) {
        cdsTaskPeriods.push("B");
      }

      const optionPeriods = selectedPeriods
        .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
        .filter((period: IPeriod) => period.periodType === PeriodType.OPTION)
        .map((period: IPeriod) => `OP${period.optionOrder - 1}`);
      cdsTaskPeriods.push(...optionPeriods);
    }

    crossDomainSolutionTaskNumber.push({
      dowTaskNumber: "4.2.6",
      entireDuration: false,
      taskPeriods: cdsTaskPeriods,
    });
  }

  const uniqueSelectedSupportPackages = new Set();
  cloudSupportPackages.forEach((instance: any) => {
    const { serviceType } = instance;
    const serviceTypeFound = uniqueSelectedSupportPackages.has(serviceType);
    if (!serviceTypeFound) {
      uniqueSelectedSupportPackages.add(serviceType);
    }
  });
  const selectedCloudSupportPackages = Array.from(uniqueSelectedSupportPackages) as string[];
  const sortedCloudPkgs = sortSupportPackagesByLevels(sortSupportPackagesByGroups(cloudSupportPackages));

  const cloudPackagesTaskNumbers = levelIdentifiers.flatMap((id: string) => {
    return selectedCloudSupportPackages.flatMap((supportPackage: string) => {
      return sortedCloudPkgs[supportPackage][id].map((instance: any, index: number) => {
        const instanceType = instance.serviceType;
        return getInstancePop(instance, instanceType, index);
      });
    });
  });

  const allPackageTasks = [
    // XaaS 4.2.x.x
    ...computeTaskNumbers,
    ...databaseTaskNumbers,
    ...storageTaskNumbers,
    ...generalTaskNumbers,
    ...selectedServiceTaskNumbers,
    // CDS 4.2.6
    ...crossDomainSolutionTaskNumber,
    // Cloud Support 4.3.x.x
    ...cloudPackagesTaskNumbers,
  ];

  const groupedTaskPops = groupSelectedTaskPeriods(allPackageTasks);

  return {
    popPeriods,
    entireDurationTasks: groupedTaskPops.entireDurationTask,
    taskNumberGroups: groupedTaskPops.taskNumberGroups,
  };
};

export const getInstancePop = (instance: any, instanceType: ServiceOfferingGroup, instanceIndex: number) => {
  const { classificationLevel, needForEntireTaskOrderDuration, selectedPeriods } = instance;
  let serviceSectionNumber: number;
  let levelNumber: number;
  let dowTaskNumber: string;
  let groupOrder: string[];
  if (xaasServiceGroupsOrder.includes(instanceType)) {
    serviceSectionNumber = 2; // XaaS Service
    groupOrder = xaasServiceGroupsOrder;
  } else {
    serviceSectionNumber = 3; // Cloud Support
    groupOrder = cloudSupportGroupsOrder;
  }
  const serviceNumber = groupOrder.indexOf(instanceType) + 1;

  // TS is a special case and only one that does not have an impact level
  const isPortabilityPlan = instanceType === ServiceOfferingGroup.PORTABILITY_PLAN;
  if (classificationLevel.classification === Classification.TS) {
    levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
    dowTaskNumber = isPortabilityPlan
      ? `4.${serviceSectionNumber}.${levelNumber}`
      : `4.${serviceSectionNumber}.${levelNumber}.${serviceNumber}.${instanceIndex + 1}`;
  } else {
    levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
    dowTaskNumber = isPortabilityPlan
      ? `4.${serviceSectionNumber}.${levelNumber}`
      : `4.${serviceSectionNumber}.${levelNumber}.${serviceNumber}.${instanceIndex + 1}`;
  }

  let taskPeriods: string[] = [];
  let entireDuration = false;

  if (needForEntireTaskOrderDuration) {
    entireDuration = true;
  }

  // for all selected Pop periods (not entire pop duration)
  if (selectedPeriods && selectedPeriods.length >= 1) {
    taskPeriods = selectedPeriods
      .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
      .map((period: IPeriod) => (period.periodType === PeriodType.BASE ? "B" : `OP${period.optionOrder - 1}`));
  }

  return {
    dowTaskNumber,
    entireDuration,
    taskPeriods,
  };
};

/**
 * Group Task/Subtask with the same PoP
 * @param taskPops
 * @returns An object containing tasks with entire duration and selected periods
 */
export const groupSelectedTaskPeriods = (taskPops: ITaskPop[]) => {
  const entireDurationTask: string[] = [];
  const uniquePeriodPairs: ITaskGrouping[] = [];

  taskPops.forEach((taskPop: ITaskPop) => {
    const { dowTaskNumber, entireDuration, taskPeriods } = taskPop;
    if (entireDuration) {
      entireDurationTask.push(dowTaskNumber);
      return;
    }

    const matchingPeriodPairIndex = uniquePeriodPairs.findIndex((pair) => {
      return hasSameSelectedPeriods(pair, taskPeriods);
    });

    // add to a period paring if one found
    if (matchingPeriodPairIndex >= 0) {
      uniquePeriodPairs[matchingPeriodPairIndex].dowTaskNumbers.push(dowTaskNumber);
    }

    // create a new period pairing for the task number (and future numbers)
    if (matchingPeriodPairIndex < 0) {
      uniquePeriodPairs.push({
        dowTaskNumbers: [dowTaskNumber],
        taskPeriods,
      });
    }
  });

  return {
    entireDurationTask,
    taskNumberGroups: uniquePeriodPairs,
  };
};

export const formatRegionUsers = (usersPerRegion: any) => {
  if (!usersPerRegion || !Array.isArray(usersPerRegion)) {
    logger.debug("usersPerRegion is undefined or not an array.");
    return [];
  }
  return usersPerRegion.map((region: any) => {
    const regionName = Object.keys(region);
    const users = Object.values(region);
    return `${regionName[0]}: ${users}`;
  });
};

export const formatGrowthEstimates = (percentages: number[]) => {
  return percentages.map((estimate: number, index: number) => {
    if (index === 0) {
      return `Base: ${estimate}%`;
    }
    return `Option ${index}: ${estimate}%`;
  });
};

export const calcAvgDataEgress = (selectedClassificationLevels: any) => {
  let gbEgress = 0;
  let pbEgress = 0;
  let tbEgress = 0;
  const response = {
    dataEgressAverage: 0,
    dataEgressMonthlyUnit: StorageUnit.TB,
  };

  selectedClassificationLevels.forEach((classLevel: any) => {
    switch (classLevel.dataEgressMonthlyUnit) {
      case StorageUnit.GB:
        gbEgress += classLevel.dataEgressMonthlyAmount;
        break;
      case StorageUnit.TB:
        tbEgress += classLevel.dataEgressMonthlyAmount;
        break;
      case StorageUnit.PB:
        pbEgress += classLevel.dataEgressMonthlyAmount;
        break;
      default:
        // do nothing basically
        pbEgress += 0;
    }
  });

  let pbToGB = 0;
  let tbToGB = 0;
  let gbDataEgress = 0;
  if (isNaN(gbEgress)) {
    gbEgress = 0;
  }
  if (isNaN(pbEgress)) {
    pbEgress = 0;
  }
  if (isNaN(tbEgress)) {
    tbEgress = 0;
  }
  pbToGB = pbEgress * 1000000;
  tbToGB = tbEgress * 1000;
  gbDataEgress = gbEgress + pbToGB + tbToGB;
  if (gbDataEgress / 1000000 > 1) {
    response.dataEgressAverage = gbDataEgress / 1000000;
    response.dataEgressMonthlyUnit = StorageUnit.PB;
  } else if (gbDataEgress / 1000 > 1) {
    response.dataEgressAverage = gbDataEgress / 1000;
    response.dataEgressMonthlyUnit = StorageUnit.TB;
  } else {
    response.dataEgressAverage = gbDataEgress;
    response.dataEgressMonthlyUnit = StorageUnit.GB;
  }
  return response;
};

export const getInstancesCount = (instances: any) => {
  const numInstances = {
    dev: 0,
    preProd: 0,
    prod: 0,
    coop: 0,
  };
  const totalInstances = instances.reduce((totalCount: number, currentInstance: any) => {
    switch (currentInstance.environmentType) {
      case EnvironmentType.DEV_TEST:
        numInstances.dev += currentInstance.numberOfInstances;
        break;
      case EnvironmentType.PRE_PROD:
        numInstances.preProd += currentInstance.numberOfInstances;
        break;
      case EnvironmentType.COOP_DIASTER_RECOVERY:
        numInstances.coop += currentInstance.numberOfInstances;
        break;
      case EnvironmentType.PROD_STAGING:
        numInstances.coop += currentInstance.numberOfInstances;
        break;
      default:
        numInstances.dev += 0;
    }

    return totalCount + currentInstance.numberOfInstances;
  }, 0);

  return {
    ...numInstances,
    totalInstances,
  };
};

export const getSelectedInstances = (levelIdentifier: any, service: any, selectedInstances: any) => {
  const tools: any = [];
  selectedInstances[service].forEach((instance: any) => {
    instance.classificationInstances.forEach((classInst: any) => {
      if (
        classInst.classificationLevel &&
        classInst.classificationLevel.impactLevel === levelIdentifier &&
        instance.serviceOffering.serviceOfferingGroup === service
      ) {
        tools.push({ ...instance.serviceOffering, ...classInst });
      }
      if (
        classInst.classificationLevel &&
        classInst.classificationLevel.classification === levelIdentifier &&
        instance.serviceOffering.serviceOfferingGroup === service
      ) {
        tools.push({ ...instance.serviceOffering, ...classInst });
      }
    });
  });
  return tools;
};

/**
 * Determine if a package has XaaS Services to be filled into the DOW template.
 * The goal is to find the existence of at least one XaaS Service and return true,
 * otherwise false is returned.
 *
 * @param {object} sortedXaasServices - all XaaS services provided by user
 * @return boolean - true if one found false if none found
 */
export const xaasServiceExists = (sortedXaasServices: any, cdsRequired: boolean) => {
  if (cdsRequired) {
    return true;
  }

  for (const instanceType in sortedXaasServices) {
    for (const key in sortedXaasServices[instanceType]) {
      if (instanceType !== "selectedInstances" && sortedXaasServices[instanceType][key].length > 0) {
        return true;
      }
      if (instanceType === "selectedInstances") {
        // look over the individual Selected Service Offering instances
        for (const level in sortedXaasServices[instanceType][key]) {
          if (sortedXaasServices[instanceType][key][level].length > 0) {
            return true;
          }
        }
      }
    }
  }

  return false;
};
export const selectedServiceExists = (
  selectedServices: any,
  selectedInstances: any,
  serviceGroup: string,
  impactLevel: string
) => {
  if (!selectedServices.includes(serviceGroup)) {
    return false;
  }

  return (
    selectedServices.includes(serviceGroup) &&
    selectedInstances[serviceGroup] &&
    selectedInstances[serviceGroup][impactLevel].length > 0
  );
};

export const instancesExists = (instances: any) => {
  if (instances.length < 1) {
    return false;
  }
  return true;
};

// only for compute / database / general / storage
export const getInstances = (xaasService: any, levelIdentifier: string) => {
  return xaasService[levelIdentifier];
};

export interface IXaasAccess {
  taskNumber: string;
  access: string[];
}
export const getSecurityRequirements = (payload: any): any => {
  const { currentEnvironment, xaasOfferings, cloudSupportPackages } = payload;
  const currEnvSecretClassInfoTypes: string[] = [];
  const currEnvTopSecretClassInfoTypes: string[] = [];
  const xaasSecret: any = {
    compute: [],
    database: [],
    storage: [],
    general: [],
    selectedService: [],
  };
  const xaasTopSecret: any = {
    compute: [],
    database: [],
    storage: [],
    general: [],
    selectedService: [],
  };
  const cloudSupportSecret: string[] = [];
  const cloudSupportTopSecret: string[] = [];
  let isSecurityNeeded = false;
  let currentEnvIncludesSecret = false;
  let currentEnvIncludesTopSecret = false;

  const getLevelOfAccess = (classification: Classification) => {
    return payload.selectedClassificationLevels
      .filter((selectedLevel: any) => {
        return selectedLevel.classificationLevel.classification === classification;
      })
      .map((selectedLevel: any) => {
        return selectedLevel.classifiedInformationTypes.map((classifiedInfoTypes: any) => {
          return classifiedInfoTypes.name;
        });
      });
  };
  const secretLevelOfAccess = getLevelOfAccess(Classification.S);
  const topSecretLevelOfAccess = getLevelOfAccess(Classification.TS);

  const containsClassifiedOffering = (classification: Classification): boolean => {
    return (
      Object.keys(xaasOfferings).find((key) => {
        if (key === "selectedServiceInstances") {
          return (
            xaasOfferings[key].find((selectedServiceInstance: any) => {
              return (
                selectedServiceInstance.classificationInstances.find((classificationInstance: any) => {
                  return classification === classificationInstance.classificationLevel.classification;
                }) !== null
              );
            }) !== null
          );
        } else {
          return (
            xaasOfferings[key].find((instance: any) => {
              return classification === instance.classificationLevel.classification;
            }) !== null
          );
        }
      }) !== null
    );
  };

  const getCloudSupportClassificationTypes = (classification: Classification): boolean => {
    const classifiedPackage = payload.cloudSupportPackages.find((supportPackage: any) => {
      return supportPackage.classificationLevel.classification === classification;
    });
    return classifiedPackage
      ? classifiedPackage.classifiedInformationTypes.map((classifiedInfoType: any) => {
          return classifiedInfoType.name;
        })
      : [];
  };

  const getServiceOfferingClassificationTypes = (serviceOffering: string, classification: Classification): boolean => {
    const names = payload.xaasOfferings.selectedServiceInstances
      .filter((selectedServiceInstance: any) => {
        return selectedServiceInstance.serviceOffering.serviceOfferingGroup === serviceOffering;
      })
      .flatMap((selectedServiceInstance: any) => {
        return selectedServiceInstance.classificationInstances;
      })
      .filter((classificationInstance: any) => {
        return classificationInstance.classificationLevel.classification === classification;
      })
      .map((classificationInstance: any) => {
        return classificationInstance.classifiedInformationTypes;
      })
      .map((classificationInformationType: any) => {
        return classificationInformationType.map((classifiedInfoType: any) => {
          return classifiedInfoType.name;
        });
      });
    return names || [];
    //
    // return foundSelectedInstance
    //   ? foundSelectedInstance.classifiedInformationTypes.map((classifiedInfoType: any) => {
    //       return classifiedInfoType.name;
    //     })
    //   : [];
  };

  // current environment security requirements
  currentEnvironment.envInstances.forEach((instance: any) => {
    const classificationLevel = instance.classificationLevel;
    if (classificationLevel && classificationLevel.classification === Classification.S) {
      isSecurityNeeded = true;
      currentEnvIncludesSecret = true;
      instance.classifiedInformationTypes.forEach((type: any) => currEnvSecretClassInfoTypes.push(type.name));
    }
    if (classificationLevel && classificationLevel.classification === Classification.TS) {
      isSecurityNeeded = true;
      currentEnvIncludesTopSecret = true;
      instance.classifiedInformationTypes.forEach((type: any) => currEnvTopSecretClassInfoTypes.push(type.name));
    }
  });

  const { computeInstances, databaseInstances, storageInstances, generalInstances, selectedServiceInstances } =
    xaasOfferings;

  // compute security requirements
  computeInstances.forEach((instance: any) => {
    const { classificationLevel, classifiedInformationTypes } = instance;
    // secret
    if (classificationLevel.classification === Classification.S && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasSecret.compute.push({ taskNumber: `4.2.${levelNumber}.1`, access: infoTypeAccess });
    }
    // top secret
    if (classificationLevel.classification === Classification.TS && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasTopSecret.compute.push({ taskNumber: `4.2.${levelNumber}.1`, access: infoTypeAccess });
    }
  });
  // database security requirements
  databaseInstances.forEach((instance: any) => {
    const { classificationLevel, classifiedInformationTypes } = instance;
    if (classificationLevel.classification === Classification.S && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasSecret.database.push({ taskNumber: `4.2.${levelNumber}.7`, access: infoTypeAccess });
    }
    if (classificationLevel.classification === Classification.TS && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasTopSecret.database.push({ taskNumber: `4.2.${levelNumber}.7`, access: infoTypeAccess });
    }
  });
  // storage security requirements
  storageInstances.forEach((instance: any) => {
    const { classificationLevel, classifiedInformationTypes } = instance;
    if (classificationLevel.classification === Classification.S && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasSecret.storage.push({ taskNumber: `4.2.${levelNumber}.8`, access: infoTypeAccess });
    }
    if (classificationLevel.classification === Classification.TS && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasTopSecret.storage.push({ taskNumber: `4.2.${levelNumber}.8`, access: infoTypeAccess });
    }
  });
  // general XaaS security requirements
  generalInstances.forEach((instance: any) => {
    const { classificationLevel, classifiedInformationTypes } = instance;
    if (classificationLevel.classification === Classification.S && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasSecret.general.push({ taskNumber: `4.2.${levelNumber}.11`, access: infoTypeAccess });
    }
    if (classificationLevel.classification === Classification.TS && classifiedInformationTypes.length > 0) {
      const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      const infoTypeAccess = classifiedInformationTypes.map((infoType: any) => infoType.name);
      xaasTopSecret.general.push({ taskNumber: `4.2.${levelNumber}.11`, access: infoTypeAccess });
    }
  });

  // XaaS services using Selected Service Offerings security requirements
  selectedServiceInstances.forEach((service: any) => {
    const { classificationInstances } = service;
    // look at Selected Service Offering classification instances
    if (classificationInstances.length >= 1) {
      service.classificationInstances.forEach((instance: any) => {
        const classificationLevel = instance.classificationLevel;

        // check for secret classification level
        if (classificationLevel && classificationLevel.classification === Classification.S) {
          isSecurityNeeded = true;
          const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
          let groupNumber;
          if (xaasServiceGroupsOrder.includes(service.serviceOffering.serviceOfferingGroup)) {
            groupNumber = xaasServiceGroupsOrder.indexOf(service.serviceOffering.serviceOfferingGroup) + 1;
          }
          // add service task number
          const xaasAccess: IXaasAccess = {
            taskNumber: `4.2.${levelNumber}.${groupNumber}`,
            access: [],
          };

          // get classified info type for service
          instance.classifiedInformationTypes.forEach((type: any) => {
            xaasAccess.access.push(type.name);
          });
          xaasSecret.selectedService.push(xaasAccess);
        }

        // check for top secret classification level
        if (classificationLevel && classificationLevel.classification === Classification.TS) {
          isSecurityNeeded = true;
          const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
          let groupNumber;
          if (xaasServiceGroupsOrder.includes(service.serviceOffering.serviceOfferingGroup)) {
            groupNumber = xaasServiceGroupsOrder.indexOf(service.serviceOffering.serviceOfferingGroup) + 1;
          }
          const xaasAccess: IXaasAccess = {
            taskNumber: `4.2.${levelNumber}.${groupNumber}`,
            access: [],
          };
          instance.classifiedInformationTypes.forEach((type: any) => {
            xaasAccess.access.push(type.name);
          });
          xaasTopSecret.selectedService.push(xaasAccess);
        }
      });
    }
  });

  // filter out any duplication for taskNumbers and infoTypes (secret)
  const serviceSecretTaskNumbers = new Set();
  xaasSecret.selectedService.forEach((serviceAccess: IXaasAccess) => {
    if (!serviceSecretTaskNumbers.has(serviceAccess.taskNumber)) {
      serviceSecretTaskNumbers.add(serviceAccess.taskNumber);
    }
  });
  const serviceSecretNumberSet = [...serviceSecretTaskNumbers] as string[];
  const secretServicesAccessNoDuplicates: IXaasAccess[] = [];
  serviceSecretNumberSet.forEach((serviceNumber: string) => {
    const allServiceAccess: IXaasAccess = {
      taskNumber: serviceNumber,
      access: [],
    };

    xaasSecret.selectedService
      .filter((serviceAccess: IXaasAccess) => {
        return serviceAccess.taskNumber === serviceNumber;
      })
      .forEach((serviceAccess: IXaasAccess) => {
        const infoTypes = serviceAccess.access.map((infoType: string) => infoType);
        if (infoTypes.length > 0) {
          const infoSet = new Set([...allServiceAccess.access, ...infoTypes]);
          allServiceAccess.access = [...infoSet];
        }
      });
    secretServicesAccessNoDuplicates.push(allServiceAccess);
  });
  xaasSecret.selectedService = secretServicesAccessNoDuplicates;

  // filter out any duplication for taskNumbers and infoTypes (top secret)
  const serviceTopSecretTaskNumbers = new Set();
  xaasTopSecret.selectedService.forEach((serviceAccess: IXaasAccess) => {
    if (!serviceTopSecretTaskNumbers.has(serviceAccess.taskNumber)) {
      serviceTopSecretTaskNumbers.add(serviceAccess.taskNumber);
    }
  });
  const serviceNumberSet = [...serviceTopSecretTaskNumbers] as string[];
  const topSecretServicesAccessNoDuplicates: IXaasAccess[] = [];
  serviceNumberSet.forEach((serviceNumber: string) => {
    const allServiceAccess: IXaasAccess = {
      taskNumber: serviceNumber,
      access: [],
    };

    xaasTopSecret.selectedService
      .filter((serviceAccess: IXaasAccess) => {
        return serviceAccess.taskNumber === serviceNumber;
      })
      .forEach((serviceAccess: IXaasAccess) => {
        const infoTypes = serviceAccess.access.map((infoType: string) => infoType);
        if (infoTypes.length > 0) {
          const infoSet = new Set([...allServiceAccess.access, ...infoTypes]);
          allServiceAccess.access = [...infoSet];
        }
      });
    topSecretServicesAccessNoDuplicates.push(allServiceAccess);
  });
  xaasTopSecret.selectedService = topSecretServicesAccessNoDuplicates;

  // cloud support packages security requirements
  cloudSupportPackages.forEach((instance: any) => {
    if (
      instance.serviceType === ServiceOfferingGroup.TRAINING &&
      instance.classificationLevel.classification === Classification.S
    ) {
      isSecurityNeeded = true;
      instance.classifiedInformationTypes.forEach((type: any) => cloudSupportSecret.push(type.name));
    }
    if (
      instance.serviceType === ServiceOfferingGroup.TRAINING &&
      instance.classificationLevel.classification === Classification.TS
    ) {
      isSecurityNeeded = true;
      instance.classifiedInformationTypes.forEach((type: any) => cloudSupportTopSecret.push(type.name));
    }
  });

  return {
    isSecurityNeeded,
    containsSecretOffering: containsClassifiedOffering(Classification.S),
    containsTopSecretOffering: containsClassifiedOffering(Classification.TS),
    secretCloudSupportClassificationTypes: getCloudSupportClassificationTypes(Classification.S),
    topSecretCloudSupportClassificationTypes: getCloudSupportClassificationTypes(Classification.TS),
    secretEdgeComputingClassificationTypes: getServiceOfferingClassificationTypes("EDGE_COMPUTING", Classification.S),
    topSecretEdgeComputingClassificationTypes: getServiceOfferingClassificationTypes(
      "EDGE_COMPUTING",
      Classification.TS
    ),
    currentEnvIncludesSecret,
    currentEnvIncludesTopSecret,
    secretLevelOfAccess,
    topSecretLevelOfAccess,
    currEnvSecretClassInfoTypes,
    currEnvTopSecretClassInfoTypes,
    xaasSecret,
    xaasTopSecret,
    cloudSupportSecret,
    cloudSupportTopSecret,
  };
};

export const getCDRLs = (popTasks: string[], contractType: IContractType) => {
  const { firmFixedPrice, timeAndMaterials } = contractType;
  const cdrl = [];
  const ffp = new Set();
  const tm = new Set();
  const portabilityPlanClins = new Set();
  const trainingClins = new Set();
  const edgeClins = new Set();
  const portabilityTaskNumbers = new Set();
  const trainingTaskNumbers = new Set();
  const edgeTaskNumbers = new Set();

  // remove instance number from end
  const allTasks = popTasks.map((taskNumber: string) => taskNumber.substring(0, 7));

  allTasks.forEach((taskNumber: string) => {
    const impactIdentifier = taskNumber.substring(0, 5);

    if (firmFixedPrice) {
      // FFP - Monthly Report (XaaS Services)
      switch (impactIdentifier) {
        case "4.2.1":
        case "4.2.2":
        case "4.2.3":
          ffp.add("x001");
          break;
        case "4.2.4":
          ffp.add("x003");
          break;
        case "4.2.5":
          ffp.add("x005");
          break;
        default:
          break;
      }

      // FFP - Portability plan, TE, Training
      switch (taskNumber) {
        // Portability Plan
        case "4.3.1":
        case "4.3.2":
        case "4.3.3":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x001");
          break;
        case "4.3.4":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x003");
          break;
        case "4.3.5":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x005");
          break;
        // Training
        case "4.3.1.3":
        case "4.3.2.3":
        case "4.3.3.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x002");
          break;
        case "4.3.4.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x004");
          break;
        case "4.3.5.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x006");
          break;
        // TE
        case "4.2.1.9":
        case "4.2.2.9":
        case "4.2.3.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x001");
          break;
        case "4.2.4.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x003");
          break;
        case "4.2.5.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x005");
          break;
        default:
          break;
      }
    }

    if (timeAndMaterials) {
      // T&M - Monthly Report (XaaS Services)
      switch (impactIdentifier) {
        case "4.2.1":
        case "4.2.2":
        case "4.2.3":
          tm.add("x017");
          break;
        case "4.2.4":
          tm.add("x019");
          break;
        case "4.2.5":
          tm.add("x021");
          break;
        default:
          break;
      }

      // T&M - Portability plan, TE, Training
      switch (taskNumber) {
        // Portability Plan
        case "4.3.1":
        case "4.3.2":
        case "4.3.3":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x017");
          break;
        case "4.3.4":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x019");
          break;
        case "4.3.5":
          portabilityTaskNumbers.add(taskNumber);
          portabilityPlanClins.add("x021");
          break;
        // Training
        case "4.3.1.3":
        case "4.3.2.3":
        case "4.3.3.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x018");
          break;
        case "4.3.4.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x020");
          break;
        case "4.3.5.3":
          trainingTaskNumbers.add(taskNumber);
          trainingClins.add("x022");
          break;
        // TE
        case "4.2.1.9":
        case "4.2.2.9":
        case "4.2.3.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x017");
          break;
        case "4.2.4.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x019");
          break;
        case "4.2.5.9":
          edgeTaskNumbers.add(taskNumber);
          edgeClins.add("x021");
          break;
        default:
          break;
      }
    }
  });

  // Training
  const training = {
    taskNumbers: Array.from(trainingTaskNumbers),
    clins: Array.from(trainingClins),
  };

  if (training.taskNumbers.length >= 1) {
    cdrl.push({ ...training, code: "*A004", name: "System Administrator Training Materials" });
    cdrl.push({ ...training, code: "*A005", name: "Role-Based User Training Material" });
  }

  // Monthly Report
  const ffpClins = Array.from(ffp);
  const tmClins = Array.from(tm);
  const progressReport = {
    taskNumbers: ["ANY"],
    clins: [...ffpClins, ...tmClins],
    code: "A012",
    name: "TO Monthly Progress Report",
  };
  if (progressReport.clins.length >= 1) {
    cdrl.push(progressReport);
  }

  // Portability Plan
  const portabilityPlan = {
    taskNumbers: Array.from(portabilityTaskNumbers),
    clins: Array.from(portabilityPlanClins),
    code: `**A006`,
    name: "Portability Plan",
  };
  if (portabilityPlan.taskNumbers.length >= 1) {
    cdrl.push({ ...portabilityPlan });
  }

  // Technical Edge
  const edge = {
    taskNumbers: Array.from(edgeTaskNumbers),
    clins: Array.from(edgeClins),
    code: `***A017`,
    name: "TE Device Specifications",
  };
  if (edge.taskNumbers.length >= 1) {
    cdrl.push({ ...edge });
  }

  return cdrl;
};

export const getIncludeClassifiedArchDesign = (
  securityRequirements: any,
  payload: any,
  classificationLevel: Classification
): boolean | undefined => {
  if (![Classification.S, Classification.TS].includes(classificationLevel)) {
    return undefined;
  }
  const currentEnvProperty =
    classificationLevel === Classification.S ? "currentEnvIncludesSecret" : "currentEnvIncludesTopSecret";
  return (
    (securityRequirements[currentEnvProperty] &&
      [ReplicateOrOptimize.YES_OPTIMIZE, ReplicateOrOptimize.YES_REPLICATE].includes(
        payload.currentEnvironment.currentEnvironmentReplicatedOptimized
      )) ||
    payload.architecturalDesignRequirement?.dataClassificationLevels
      ?.map((level: any) => {
        return level.classification;
      })
      .includes(classificationLevel)
  );
};
