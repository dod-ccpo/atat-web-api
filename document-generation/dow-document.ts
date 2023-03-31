import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { capitalize, formatEnum, formatPeriodOfPerformance } from "./utils/utils";

import {
  calcAvgDataEgress,
  filterDataLevels,
  formatExpirationDate,
  formatGrowthEstimates,
  formatImpactLevel,
  formatRegionUsers,
  formatStorageType,
  getCDRLs,
  getIncludeClassifiedArchDesign,
  getInstancesCount,
  getSecurityRequirements,
  getTaskPeriods,
  instancesExists,
  ITaskGrouping,
  organizeXaasServices,
  selectedServiceExists,
  sortSelectedClassificationLevels,
  sortSupportPackagesByGroups,
  sortSupportPackagesByLevels,
  xaasServiceExists,
} from "./utils/dow";
import { IDescriptionOfWork, ReplicateOrOptimize } from "../models/document-generation/description-of-work";
import { Classification } from "../models/document-generation";

export async function doGenerate(template: Buffer, payload: IDescriptionOfWork): Promise<Buffer> {
  // Collection of instances at beginning of impact level for XaaS (e.g., 4.2.1)
  const sortedSelectedClassificationLevels = sortSelectedClassificationLevels(payload.selectedClassificationLevels);

  // All XaaS services
  const xaasServices = organizeXaasServices(payload.xaasOfferings);
  const cdsRequired = payload.crossDomainSolutions.crossDomainSolutionRequired;
  const hasXaasServices = xaasServiceExists(xaasServices, cdsRequired);
  const sortedCloudSupportPackages = sortSupportPackagesByLevels(
    sortSupportPackagesByGroups(payload.cloudSupportPackages)
  );

  // Getting package task numbers
  const popTasks = getTaskPeriods(payload);
  const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
  const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
  const allPopTasks = entirePeriodTasks.concat(selectedPeriodTask);

  // CDRL
  const cdrls = getCDRLs(allPopTasks, payload.contractType);

  // Helps with Section 7 to generate PoP table
  const { basePeriod, optionPeriods } = payload.periodOfPerformance;
  const popPeriods = formatPeriodOfPerformance(basePeriod, optionPeriods);
  const simplifiedPop = popTasks.popPeriods;
  const selectedPeriodRows = popTasks.taskNumberGroups.map((group: ITaskGrouping) => {
    return [
      group.dowTaskNumbers.join(","),
      ...simplifiedPop.map((period: string) => (group.taskPeriods.includes(period) ? "X" : "")),
    ];
  });
  const popTableHeaders = ["Task/Subtask", ...simplifiedPop];
  const popTableBody = [
    // tasks with entire duration  in table
    [
      entirePeriodTasks.join(","),
      ...simplifiedPop.map((period: string) => (simplifiedPop.includes(period) ? "X" : "")),
    ],
    // tasks with selected periods in table
    ...selectedPeriodRows,
  ];

  // security Requirements
  const securityRequirements = getSecurityRequirements(payload);

  const includeSecretArchDesign = getIncludeClassifiedArchDesign(securityRequirements, payload, Classification.S);
  const includeTopSecretArchDesign = getIncludeClassifiedArchDesign(securityRequirements, payload, Classification.TS);

  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        hasXaasServices,
        xaasServices,
        sortedSelectedClassificationLevels,
        sortedCloudSupportPackages,
        cdrls,
        pop: popTasks,
        popTableHeaders,
        popTableBody,
        popPeriods,
        sr: securityRequirements,
        includeSecretArchDesign,
        includeTopSecretArchDesign,
        sumTotalInstances: (instances: any) => {
          let number = 0;
          instances.forEach((instance: any) => (number += instance.numberOfInstances));
          return number;
        },
        capitalize,
        formatEnum,
        formatRegionUsers,
        formatStorageType,
        formatExpirationDate,
        formatImpactLevel,
        filterDataLevels,
        formatGrowthEstimates,
        calcAvgDataEgress,
        getInstancesCount,
        selectedServiceExists,
        instancesExists,
      },
      cmdDelimiter: ["{", "}"],
    })
  );
  logger.info("DOW Word document generated.");
  return report;
}

export async function generateDowDocument(
  template: Buffer,
  payload: IDescriptionOfWork
): Promise<ApiBase64SuccessResponse> {
  const report = await doGenerate(template, payload);
  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
