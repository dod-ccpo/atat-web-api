import {
  IPeriod,
  PeriodType,
  ServiceOfferingGroup,
  StorageUnit,
  EnvironmentType,
  Classification,
  ImpactLevel,
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
  "PORTABILITY_PLAN",
];
const classificationLevelsOrder = ["IL2", "IL4", "IL5", "IL6", "TS"];

export const formatStorageType = (env: any) => {
  return `${formatEnum(env.performanceTier)} Storage: ${env.storageAmount} ${env.storageUnit}`;
};

export const formatExpirationDate = (exp: any) => {
  return new Date(exp).toLocaleDateString(`en-US`, { year: `numeric`, month: `numeric`, day: `numeric` });
};

export const formatImpactLevel = (impactLevel: any) => {
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
    const { classification, impactLevel } = instance.classificationLevel;
    if (classification === "TS") {
      sortedInstances.ts = instance;
    } else {
      switch (impactLevel) {
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
          logger.debug("No classification level was provided for instance.");
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
    const { classification, impactLevel } = instance.classificationLevel;
    if (classification === "TS") {
      sortedInstances.ts.push(instance);
    } else {
      switch (impactLevel) {
        case "IL2":
          sortedInstances.il2.push(instance);
          break;
        case "IL4":
          sortedInstances.il4.push(instance);
          break;
        case "IL5":
          sortedInstances.il5.push(instance);
          break;
        case "IL6":
          sortedInstances.il6.push(instance);
          break;
        default:
          logger.debug("No classification level was provided for instance XX");
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
      const { classification, impactLevel } = instance.classificationLevel;
      if (classification === "TS") {
        services[cloudPackage].ts.push(instance);
      } else {
        switch (impactLevel) {
          case "IL2":
            services[cloudPackage].il2.push(instance);
            break;
          case "IL4":
            services[cloudPackage].il4.push(instance);
            break;
          case "IL5":
            services[cloudPackage].il5.push(instance);
            break;
          case "IL6":
            services[cloudPackage].il6.push(instance);
            break;
          default:
            logger.debug("No classification level was provided for instance XX");
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
      .forEach((period: IPeriod, index: number) => popPeriods.push(`OP${index + 1}`));
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
        .map((period: IPeriod, index: number) => `OP${index + 1}`);
      cdsTaskPeriods.push(...optionPeriods);
    }

    crossDomainSolutionTaskNumber.push({
      dowTaskNumber: "4.2.6",
      entireDuration: false,
      taskPeriods: cdsTaskPeriods,
    });
  }

  const selectedCloudSupportPackages = cloudSupportPackages.map((instance: any) => instance.serviceType);
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
    ...computeTaskNumbers,
    ...databaseTaskNumbers,
    ...storageTaskNumbers,
    ...generalTaskNumbers,
    ...selectedServiceTaskNumbers,
    ...crossDomainSolutionTaskNumber,
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
  const { classification, impactLevel } = classificationLevel;
  let levelNumber: number;
  let dowTaskNumber: string;
  let groupOrder: string[];
  if (xaasServiceGroupsOrder.includes(instanceType)) {
    groupOrder = xaasServiceGroupsOrder;
  } else {
    groupOrder = cloudSupportGroupsOrder;
  }
  const serviceNumber = groupOrder.indexOf(instanceType) + 1;

  if (classification === "TS") {
    levelNumber = classificationLevelsOrder.indexOf(classification) + 1;
    dowTaskNumber = `4.2.${levelNumber}.${serviceNumber}.${instanceIndex + 1}`;
  } else {
    levelNumber = classificationLevelsOrder.indexOf(impactLevel) + 1;
    dowTaskNumber = `4.2.${levelNumber}.${serviceNumber}.${instanceIndex + 1}`;
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
      .map((period: IPeriod, index: number) => (period.periodType === PeriodType.BASE ? "B" : `OP${index + 1}`));
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

    const matchingPeriodPairIndex = uniquePeriodPairs.findIndex((pair, index) => {
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
        classInst.classificationLevel.impactLevel === levelIdentifier &&
        instance.serviceOffering.serviceOfferingGroup === service
      ) {
        tools.push({ ...instance.serviceOffering, ...classInst });
      }
      if (
        classInst.classificationLevel.classification === levelIdentifier &&
        instance.serviceOffering.serviceOfferingGroup === service
      ) {
        tools.push({ ...instance.serviceOffering, ...classInst });
      }
    });
  });
  return tools;
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
  const currentEnvSecret: string[] = [];
  const currentEnvTopSecret: string[] = [];
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

  // current environment security requirements
  currentEnvironment.envInstances.forEach((instance: any) => {
    const classificationLevel = instance.classificationLevel;
    if (classificationLevel && classificationLevel.classification === Classification.S) {
      isSecurityNeeded = true;
      instance.classifiedInformationTypes.forEach((type: any) => currentEnvSecret.push(type.name));
    }
    if (classificationLevel && classificationLevel.classification === Classification.TS) {
      isSecurityNeeded = true;
      instance.classifiedInformationTypes.forEach((type: any) => currentEnvTopSecret.push(type.name));
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
    currentEnvSecret,
    currentEnvTopSecret,
    xaasSecret,
    xaasTopSecret,
    cloudSupportSecret,
    cloudSupportTopSecret,
  };
};

export const dataRequirementsList = (
  cloudSupportPackages: any,
  check4IL2: any,
  check4IL4: any,
  check4IL5: any,
  check4IL6: any,
  il2EdgeCount: any,
  il4EdgeCount: any,
  il5EdgeCount: any,
  il6EdgeCount: any,
  contractType: any
) => {
  let ffp;
  let timeMaterial;
  const data = [];
  if (contractType.firmFixedPrice) {
    ffp = true;
  }
  if (contractType.timeAndMaterials) {
    timeMaterial = true;
  }

  const trainingDowTaskNumbers: any = [];
  const trainingClinNumbers: any = [];
  const portabilityPlanTaskNumbers: any = [];
  const portabilityClinNumbers: any = [];
  let monthlyClinNumbers: any = "";
  const teDeviceTaskNumbers: any = [];
  const teDeviceClinNumbers: any = [];

  cloudSupportPackages.forEach((plan: any) => {
    if (plan.serviceType === ServiceOfferingGroup.PORTABILITY_PLAN) {
      switch (plan.classificationLevel.impactLevel.impactLevel) {
        case ImpactLevel.IL2:
          portabilityPlanTaskNumbers.push("4.3.1");
          break;
        case ImpactLevel.IL4:
          portabilityPlanTaskNumbers.push("4.3.2");
          break;
        case ImpactLevel.IL5:
          portabilityPlanTaskNumbers.push("4.3.3");
          break;
        case ImpactLevel.IL6:
          portabilityPlanTaskNumbers.push("4.3.4");
          break;
        default:
        // do nothing
      }
    }
    if (plan.serviceType === ServiceOfferingGroup.TRAINING) {
      switch (plan.classificationLevel.impactLevel) {
        case ImpactLevel.IL2:
          trainingDowTaskNumbers.push("4.3.1.3");
          break;
        case ImpactLevel.IL4:
          trainingDowTaskNumbers.push("4.3.2.3");
          break;
        case ImpactLevel.IL5:
          trainingDowTaskNumbers.push("4.3.3.3");
          break;
        case ImpactLevel.IL6:
          trainingDowTaskNumbers.push("4.3.4.3");
          break;
        default:
        // do nothing
      }
    }
  });
  /**
   * Training
   */

  if (
    ffp === true &&
    (trainingDowTaskNumbers.includes("4.3.1.3") ||
      trainingDowTaskNumbers.includes("4.3.2.1") ||
      trainingDowTaskNumbers.includes("4.3.3.3"))
  ) {
    trainingClinNumbers.push("x002");
  } else if (
    timeMaterial === true &&
    (trainingDowTaskNumbers.includes("4.3.1.3") ||
      trainingDowTaskNumbers.includes("4.3.2.1") ||
      trainingDowTaskNumbers.includes("4.3.3.3"))
  ) {
    trainingClinNumbers.push("x018");
  }
  if (trainingDowTaskNumbers.includes("4.3.4.3")) {
    if (ffp) {
      trainingClinNumbers.push("x004");
    }
    if (timeMaterial) {
      trainingClinNumbers.push("x020");
    }
  }

  /**
   * Portability
   */
  if (
    ffp === true &&
    (portabilityPlanTaskNumbers.includes("4.3.1.3") ||
      portabilityPlanTaskNumbers.includes("4.3.2.1") ||
      portabilityPlanTaskNumbers.includes("4.3.3.3"))
  ) {
    portabilityClinNumbers.push("x002");
  } else if (
    timeMaterial === true &&
    (portabilityPlanTaskNumbers.includes("4.3.1.3") ||
      portabilityPlanTaskNumbers.includes("4.3.2.1") ||
      portabilityPlanTaskNumbers.includes("4.3.3.3"))
  ) {
    portabilityClinNumbers.push("x018");
  }
  if (portabilityPlanTaskNumbers.includes("4.3.4.3")) {
    if (ffp) {
      portabilityClinNumbers.push("x004");
    }
    if (timeMaterial) {
      portabilityClinNumbers.push("x020");
    }
  }
  /**
   * Monthly Progress Report
   */
  if (ffp === true && (check4IL2 > 0 || check4IL4 > 0 || check4IL5 > 0)) {
    monthlyClinNumbers += "x001";
  }
  if (ffp === true && check4IL6 > 0) {
    monthlyClinNumbers += "x003";
  }
  if (timeMaterial === true && (check4IL2 > 0 || check4IL4 > 0 || check4IL5 > 0)) {
    monthlyClinNumbers += "x017";
  }
  if (timeMaterial === true && check4IL6 > 0) {
    monthlyClinNumbers += "x019";
  }
  /**
   * Tactical Edge Device Specifications
   */

  if (il2EdgeCount >= 1) {
    teDeviceTaskNumbers.push("4.2.1.9");
  }
  if (il4EdgeCount >= 1) {
    teDeviceTaskNumbers.push("4.2.2.9");
  }
  if (il5EdgeCount >= 1) {
    teDeviceTaskNumbers.push("4.2.3.9");
  }
  if (il6EdgeCount >= 1) {
    teDeviceTaskNumbers.push("4.2.4.9");
  }

  if (
    ffp === true &&
    (teDeviceTaskNumbers.includes("4.2.1.9") ||
      teDeviceTaskNumbers.includes("4.2.2.9") ||
      teDeviceTaskNumbers.includes("4.2.3.9"))
  ) {
    teDeviceClinNumbers.push("x001");
  }
  if (
    timeMaterial === true &&
    (teDeviceTaskNumbers.includes("4.2.1.9") ||
      teDeviceTaskNumbers.includes("4.2.2.9") ||
      teDeviceTaskNumbers.includes("4.2.3.9"))
  ) {
    teDeviceClinNumbers.push("x017");
  }
  if (ffp === true && teDeviceTaskNumbers.includes("4.2.4.9")) {
    teDeviceClinNumbers.push("x003");
  }
  if (timeMaterial === true && teDeviceTaskNumbers.includes("4.2.4.9")) {
    teDeviceClinNumbers.push("x019");
  }

  if (trainingDowTaskNumbers.length !== 0) {
    const obj = {
      dowTaskNumbers: trainingDowTaskNumbers.toString(),
      clinNumbers: trainingClinNumbers.toString(),
      cdrl: {
        code: "*A004",
        name: "System Administrator Training Materials",
      },
    };
    data.push(obj);
    const obj2 = {
      dowTaskNumbers: trainingDowTaskNumbers.toString(),
      clinNumbers: trainingClinNumbers.toString(),
      cdrl: {
        code: "*A005",
        name: "Role-Based User Training Materials",
      },
    };
    data.push(obj2);
  }
  if (portabilityPlanTaskNumbers.length !== 0) {
    const obj = {
      dowTaskNumbers: portabilityPlanTaskNumbers.toString(),
      clinNumbers: portabilityClinNumbers.toString(),
      cdrl: {
        code: "**A006",
        name: "Portability Plan",
      },
    };
    data.push(obj);
  }
  if (monthlyClinNumbers.length > 0) {
    const obj = {
      dowTaskNumbers: "ANY",
      clinNumbers: monthlyClinNumbers,
      cdrl: {
        code: "A012",
        name: "TO Monthly Progress Report",
      },
    };
    data.push(obj);
  }
  if (teDeviceClinNumbers.length > 0) {
    const obj = {
      dowTaskNumbers: teDeviceTaskNumbers.toString(),
      clinNumbers: teDeviceClinNumbers.toString(),
      cdrl: {
        code: "***A017",
        name: "TE Device Specifications",
      },
    };
    data.push(obj);
  }
  return data;
};
