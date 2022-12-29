import {
  PeriodUnit,
  IPeriod,
  DocumentType,
  TemplatePaths,
  IFundingDocument,
  FundingType,
  Classification,
  PeriodType,
  ServiceOfferingGroup,
} from "../../models/document-generation";
import * as fs from "fs";

export const capitalize = (string: string) => {
  if (typeof string !== "string") {
    return "";
  }
  return string.charAt(0).toUpperCase() + string.slice(1).toLocaleLowerCase();
};

export const convertPeriodToMonths = (period: IPeriod): number => {
  const { periodUnit, periodUnitCount } = period;
  switch (periodUnit) {
    case PeriodUnit.YEAR:
      return periodUnitCount * 12;
    case PeriodUnit.MONTH:
      return periodUnitCount;
    case PeriodUnit.WEEK:
      return Math.ceil(periodUnitCount / 4.345);
    case PeriodUnit.DAY:
      return Math.ceil(periodUnitCount / 30.4167);
    default:
      return 12;
  }
};

export const formatPeriodOfPerformance = (basePeriod: IPeriod, optionPeriods: IPeriod[]): string => {
  let formattedPop = "";
  formattedPop += capitalize(basePeriod.periodType);
  formattedPop += " period: ";
  formattedPop += basePeriod.periodUnitCount;
  formattedPop += " ";
  formattedPop += `${capitalize(basePeriod.periodUnit)}(s)`;

  const orderedPeriods = [...optionPeriods].sort((a, b) => a.optionOrder - b.optionOrder);
  for (const period of orderedPeriods) {
    // Format the option Period text as "Option period M: N <Days(s) | Month(s) | Year(s)>"
    formattedPop += ", ";
    formattedPop += capitalize(period.periodType);
    formattedPop += " period ";
    formattedPop += period.optionOrder;
    formattedPop += ": ";
    formattedPop += period.periodUnitCount;
    formattedPop += " ";
    formattedPop += `${capitalize(period.periodUnit)}(s)`;
  }
  return formattedPop;
};

export const getFundingDocInfo = (fundingDoc: IFundingDocument): string => {
  const documentTypes = [FundingType.MIPR, FundingType.FS_FORM];
  if (!fundingDoc || !documentTypes.includes(fundingDoc.fundingType)) {
    return "";
  }

  if (fundingDoc.fundingType === FundingType.MIPR) {
    return `MIPR #: ${fundingDoc.miprNumber}`;
  }
  return `GT&C #: ${fundingDoc.gtcNumber} and Order #: ${fundingDoc.orderNumber}`;
};

interface PDFTemplateFiles {
  html: string;
  css: string;
}

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

export interface ITaskGrouping {
  dowTaskNumbers: string[];
  taskPeriods: string[];
}

const hasSameSelectedPeriods = (unique: ITaskGrouping, check: string[]) => {
  if (unique.taskPeriods.length !== check.length) {
    return false;
  }
  const hasAllPeriods = check.every((period: any) => unique.taskPeriods.includes(period));
  return hasAllPeriods;
};

export const getTaskPeriods = (payload: any) => {
  const { xaasOfferings, crossDomainSolutions, cloudSupportPackages, periodOfPerformance } = payload;
  const { basePeriod, optionPeriods } = periodOfPerformance;
  const uniqueSelectedPeriodPairs: ITaskGrouping[] = [];
  const entireDurationTasks: string[] = [];

  // group the periods based on array like ["B", "OP1", "OP2"]
  const popPeriods: string[] = [];
  if (basePeriod) {
    popPeriods.push("B");
  }
  if (optionPeriods) {
    optionPeriods
      .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
      .forEach((period: IPeriod) => popPeriods.push(`OP${period.optionOrder}`));
  }

  // 4.2.x.x
  xaasOfferings.forEach((offering: any) => {
    const groupName: any = offering.serviceOffering.serviceOffering.serviceOfferingGroup;
    const instances = offering.serviceOffering.classificationInstances;

    instances.forEach((classInst: any) => {
      const { classificationLevel, needForEntireTaskOrderDuration, selectedPeriods } = classInst;
      let dowTaskNumber: string;
      let levelNumber: number;
      let groupNumber: number;
      let taskPeriods: string[] = [];
      let uniqueGroupingIndex = -1;

      // NOTE: TS level does not have an impact level to use
      if (classificationLevel.classification === Classification.TS) {
        // account for zero index
        levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
        groupNumber = xaasServiceGroupsOrder.indexOf(groupName) + 1;
        dowTaskNumber = `4.2.${levelNumber}.${groupNumber}`;
      } else {
        levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
        groupNumber = xaasServiceGroupsOrder.indexOf(groupName) + 1;
        dowTaskNumber = `4.2.${levelNumber}.${groupNumber}`;
      }

      if (needForEntireTaskOrderDuration) {
        entireDurationTasks.push(dowTaskNumber);
      }

      // for all selected Pop periods (not entire pop duration)
      if (selectedPeriods && selectedPeriods.length >= 1) {
        taskPeriods = selectedPeriods
          .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
          .map((period: IPeriod) => (period.periodType === PeriodType.BASE ? "B" : `OP${period.optionOrder}`));

        // see if any previous period pairings that the task number can be added to
        const matchingPeriodPair = uniqueSelectedPeriodPairs.filter((pair, index) => {
          const hasAllPeriods = hasSameSelectedPeriods(pair, taskPeriods);
          uniqueGroupingIndex = hasAllPeriods ? index : -1;
          return hasAllPeriods;
        });

        // add to a period paring if one found
        if (matchingPeriodPair.length >= 1 && uniqueGroupingIndex > -1) {
          uniqueSelectedPeriodPairs[uniqueGroupingIndex].dowTaskNumbers.push(dowTaskNumber);
        }

        // create a new period pairing for the task number (and future numbers)
        if (matchingPeriodPair.length < 1) {
          uniqueSelectedPeriodPairs.push({
            dowTaskNumbers: [dowTaskNumber],
            taskPeriods,
          });
        }
      }
    });
  });

  // 4.2.6
  if (crossDomainSolutions.crossDomainSolutionRequired) {
    if (crossDomainSolutions.needForEntireTaskOrderDuration) {
      entireDurationTasks.push(`4.2.6`);
    }
    // which periods is it needed for
    if (crossDomainSolutions.selectedPeriods) {
      // TODO: populate selected periods
    }
  }

  // cloud support 4.3.x.x
  cloudSupportPackages.forEach((offering: any) => {
    const groupName: any = offering.serviceType;
    const { classificationLevel, needForEntireTaskOrderDuration, selectedPeriods } = offering;

    // each offering will be a different subtask 4.3.x.1
    // x is the classification level
    // groups is the last number
    let dowTaskNumber: string;
    let levelNumber: number;
    let groupNumber: number;
    let taskPeriods: string[] = [];
    let uniqueGroupingIndex = -1;

    if (classificationLevel.classification === Classification.TS) {
      levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
      groupNumber = cloudSupportGroupsOrder.indexOf(groupName) + 1;
      dowTaskNumber =
        groupName === cloudSupportGroupsOrder[5] ? `4.3.${levelNumber}` : `4.3.${levelNumber}.${groupNumber}`;
    } else {
      levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
      groupNumber = cloudSupportGroupsOrder.indexOf(groupName) + 1;
      dowTaskNumber =
        groupName === cloudSupportGroupsOrder[5] ? `4.3.${levelNumber}` : `4.3.${levelNumber}.${groupNumber}`;
    }

    if (needForEntireTaskOrderDuration) {
      entireDurationTasks.push(dowTaskNumber);
    }

    if (selectedPeriods && selectedPeriods.length >= 1) {
      taskPeriods = selectedPeriods
        .sort((a: IPeriod, b: IPeriod) => a.optionOrder - b.optionOrder)
        .map((period: IPeriod) => (period.periodType === PeriodType.BASE ? "B" : `OP${period.optionOrder}`));

      // see if there any previous period pairings that the task number can be added to
      const matchingPeriodPair = uniqueSelectedPeriodPairs.filter((pair, index) => {
        const hasAllPeriods = hasSameSelectedPeriods(pair, taskPeriods);
        uniqueGroupingIndex = hasAllPeriods ? index : -1;
        return hasAllPeriods;
      });

      if (matchingPeriodPair.length >= 1 && uniqueGroupingIndex > -1) {
        uniqueSelectedPeriodPairs[uniqueGroupingIndex].dowTaskNumbers.push(dowTaskNumber);
      }

      // create a new period pairing for the task number
      if (matchingPeriodPair.length < 1) {
        uniqueSelectedPeriodPairs.push({
          dowTaskNumbers: [dowTaskNumber],
          taskPeriods,
        });
      }
    }
  });

  // sort so the pairs with the most periods are first
  const sortedUniqueSelectedPeriodPairs = uniqueSelectedPeriodPairs.sort(
    (a: ITaskGrouping, b: ITaskGrouping) => a.taskPeriods.length - b.taskPeriods.length
  );

  // template helping object to create table
  const mappedTaskNumbers: any = {
    popPeriods,
    entireDurationTasks,
    taskNumberGroups: sortedUniqueSelectedPeriodPairs,
  };

  return mappedTaskNumbers;
};

export interface IXaasAccess {
  serviceNumber: string;
  access: string[];
}
export const getSecurityRequirements = (payload: any): any => {
  const { currentEnvironment, xaasOfferings, cloudSupportPackages } = payload;
  const currentEnvSecret: string[] = [];
  const currentEnvTopSecret: string[] = [];
  const xaasSecret: IXaasAccess[] = [];
  const xaasTopSecret: IXaasAccess[] = [];
  const cloudSupportSecret: string[] = [];
  const cloudSupportTopSecret: string[] = [];
  let isSecurityNeeded = false;

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

  xaasOfferings.forEach((service: any) => {
    const { classificationInstances } = service.serviceOffering;
    if (classificationInstances.length >= 1) {
      service.serviceOffering.classificationInstances.forEach((instance: any) => {
        const classificationLevel = instance.classificationLevel;
        if (classificationLevel && classificationLevel.classification === Classification.S) {
          isSecurityNeeded = true;
          const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.impactLevel) + 1;
          const xaasAccess: IXaasAccess = {
            serviceNumber: `4.2.${levelNumber}`,
            access: [],
          };
          instance.classifiedInformationTypes.forEach((type: any) => {
            xaasAccess.access.push(type.name);
          });
          xaasSecret.push(xaasAccess);
        }
        if (classificationLevel && classificationLevel.classification === Classification.TS) {
          isSecurityNeeded = true;
          const levelNumber = classificationLevelsOrder.indexOf(classificationLevel.classification) + 1;
          const xaasAccess: IXaasAccess = {
            serviceNumber: `4.2.${levelNumber}`,
            access: [],
          };
          instance.classifiedInformationTypes.forEach((type: any) => {
            xaasAccess.access.push(type.name);
          });
          xaasTopSecret.push(xaasAccess);
        }
      });
    }
  });

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
export const getCDRLs = (popTasks: any, contractType: any) => {
  const { firmFixedPrice, timeAndMaterials } = contractType;
  const cdrl = [];
  const allTasks = popTasks;

  const progressReport = {
    taskNumbers: ["ANY"],
    ffp: firmFixedPrice ? "x001, x003, x005" : "",
    tm: timeAndMaterials ? "x017, x019, x021" : "",
    cdrl: "A012",
    name: "TO Monthly Progress Report",
  };

  cdrl.push(progressReport);

  const trainingClins: string[] = [];
  const taskNumbers: string[] = [];
  const portabilityPlanClins: string[] = [];
  let portabilityTaskNumbers: string[] = [];
  const edgeClins: string[] = [];
  const subtaskNumbers = ["1", "2", "3", "4", "5"];
  subtaskNumbers.forEach((number: any) => {
    // tasks 4.3.x (portability plan)
    const taskNumber = `4.3.${number}`;
    const containsPortabilityTasks = allTasks.includes(taskNumber);

    if (containsPortabilityTasks) {
      portabilityTaskNumbers.push(taskNumber);
      switch (number) {
        case "1":
        case "2":
        case "3":
          firmFixedPrice ? portabilityPlanClins.push("x001") : null;
          timeAndMaterials ? portabilityPlanClins.push("x017") : null;
          break;
        case "4":
          firmFixedPrice ? portabilityPlanClins.push("x003") : null;
          timeAndMaterials ? portabilityPlanClins.push("x019") : null;
          break;
        case "5":
          firmFixedPrice ? portabilityPlanClins.push("x005") : null;
          timeAndMaterials ? portabilityPlanClins.push("x021") : null;
          break;
        default:
          break;
      }
    }

    // subtasks 4.3.x.1
    const trainingSubtask = `4.3.${number}.3`;
    const containsTrainingSubtask = allTasks.includes(trainingSubtask);

    if (containsTrainingSubtask) {
      taskNumbers.push(trainingSubtask);
      switch (number) {
        case "1":
        case "2":
        case "3":
          firmFixedPrice ? trainingClins.push("x002") : null;
          timeAndMaterials ? trainingClins.push("x018") : null;
          break;
        case "4":
          firmFixedPrice ? trainingClins.push("x004") : null;
          timeAndMaterials ? trainingClins.push("x020") : null;
          break;
        case "5":
          firmFixedPrice ? trainingClins.push("x006") : null;
          timeAndMaterials ? trainingClins.push("x022") : null;
          break;
        default:
          break;
      }
    }
    // subtasks 4.2.x.9
    const edgeSubtask = `4.2.${number}.9`;
    const containsEdgeSubtask = allTasks.includes(edgeSubtask);

    if (containsEdgeSubtask) {
      taskNumbers.push(edgeSubtask);
      switch (number) {
        case "1":
        case "2":
        case "3":
          firmFixedPrice ? edgeClins.push("x001") : null;
          timeAndMaterials ? edgeClins.push("x017") : null;
          break;
        case "4":
          firmFixedPrice ? edgeClins.push("x003") : null;
          timeAndMaterials ? edgeClins.push("x019") : null;
          break;
        case "5":
          firmFixedPrice ? edgeClins.push("x005") : null;
          timeAndMaterials ? edgeClins.push("x021") : null;
          break;
        default:
          break;
      }
    }
  });

  const training = {
    taskNumbers,
    clins: trainingClins,
  };
  if (training.taskNumbers.length >= 1) {
    cdrl.push({ ...training, cdrl: "*A004", name: "System Administrator Training Materials" });
    cdrl.push({ ...training, cdrl: "*A005", name: "Role-Based User Training Material" });
  }
  portabilityTaskNumbers = subtaskNumbers
    .map((number: string) => `4.3.${number}.9`)
    .filter((taskNumber) => taskNumbers.includes(taskNumber));
  const portabilityPlan = {
    taskNumbers: portabilityTaskNumbers,
    clins: portabilityPlanClins,
    cdrl: `**A006`,
    name: "Portability Plan",
  };
  if (portabilityPlan.taskNumbers.length >= 1) {
    cdrl.push({ ...portabilityPlan });
  }

  const edgeTaskNumbers = subtaskNumbers
    .map((number: string) => `4.2.${number}.9`)
    .filter((taskNumber) => taskNumbers.includes(taskNumber));
  const edge = {
    taskNumbers: edgeTaskNumbers,
    clins: edgeClins,
    cdrl: `**A006`,
    name: "Portability Plan",
  };
  if (edge.taskNumbers.length >= 1) {
    cdrl.push({ ...edge });
  }

  return cdrl;
};

// documents and the related templates
const documentTemplatePaths: TemplatePaths = {
  [DocumentType.DESCRIPTION_OF_WORK_PDF]: {
    html: "/opt/dow-template.html",
    css: "/opt/dow-style.css",
  },
  [DocumentType.DESCRIPTION_OF_WORK_DOCX]: {
    docx: "/opt/dow-template.docx",
  },
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: {
    excel: "/opt/igce-template.xlsx",
  },
  [DocumentType.INCREMENTAL_FUNDING_PLAN]: {
    docx: "/opt/ifp-template.docx",
  },
  [DocumentType.EVALUATION_PLAN]: {
    docx: "/opt/eval-plan-template.docx",
  },
  [DocumentType.REQUIREMENTS_CHECKLIST]: {
    docx: "/opt/requirements-checklist-template.docx",
  },
};

export const getPDFDocumentTemplates = (documentType: DocumentType): PDFTemplateFiles => {
  let html = "";
  let css = "";
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_PDF:
      html = fs.readFileSync(documentTemplatePaths[documentType].html, "utf-8");
      css = fs.readFileSync(documentTemplatePaths[documentType].css, "utf-8");
      break;
    default:
      throw new Error(`Unsupported PDF generation type: "${documentType}"`);
  }

  return { html, css };
};

export const getExcelTemplatePath = (documentType: DocumentType): string => {
  let excelPath = "";
  switch (documentType) {
    case DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE:
      excelPath = documentTemplatePaths[documentType].excel;
      break;
    default:
      throw new Error(`Unsupported Excel generation type: "${documentType}"`);
  }

  return excelPath;
};

export const getDocxTemplate = (documentType: DocumentType): Buffer => {
  let docx;
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_DOCX:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    case DocumentType.EVALUATION_PLAN:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    case DocumentType.REQUIREMENTS_CHECKLIST:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    default:
      throw new Error(`Unsupported Word generation type: "${documentType}"`);
  }

  return docx;
};
