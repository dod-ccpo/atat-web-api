import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { DescriptionOfWork } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { getCDRLs, getTaskPeriods, formatPeriodOfPerformance, getSecurityRequirements } from "./utils/utils";
import * as dow from "../models/document-generation/description-of-work";

export async function generateDowDocument(
  template: Buffer,
  payload: DescriptionOfWork
): Promise<ApiBase64SuccessResponse> {
  // pop tasks
  const popTasks = getTaskPeriods(payload);
  const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
  const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
  const allPopTasks = entirePeriodTasks.concat(selectedPeriodTask);
  const cdrls = getCDRLs(allPopTasks, payload.contractType);

  // pop periods
  const { basePeriod, optionPeriods } = payload.periodOfPerformance;
  const popPeriods = formatPeriodOfPerformance(basePeriod, optionPeriods);

  // security Requirements
  const securityRequirements = getSecurityRequirements(payload);

  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        pop: popTasks,
        cdrls,
        popPeriods,
        sr: securityRequirements,
        crossDomainSolutions: {
          ...payload.crossDomainSolutions,
          trafficPerDomainPair: JSON.parse(payload.crossDomainSolutions.trafficPerDomainPair),
        },
        // TODO: refactor and place in utils or a seperate folder for dow
        sumTotalInstances: () => {
          let number = 0;
          for (let i = 0; i < payload.currentEnvironment.envInstances.length; i++) {
            number += payload.currentEnvironment.envInstances[i].numberOfInstances;
          }
          return number;
        },
        checkXaas: (xaasOfferings: any) => {
          const il2: any = [];
          const il4: any = [];
          const il5: any = [];
          const il6: any = [];

          xaasOfferings.forEach((offering: any) => {
            if (Object.keys(offering.instanceConfigurations).length !== 0) {
              offering.instanceConfigurations.forEach((instance: any) => {
                switch (instance.classificationLevel.impactLevel) {
                  case dow.ImpactLevel.IL2:
                    il2.push(offering);
                    break;
                  case dow.ImpactLevel.IL4:
                    il4.push(offering);
                    break;
                  case dow.ImpactLevel.IL5:
                    il5.push(offering);
                    break;
                  case dow.ImpactLevel.IL6:
                    il6.push(offering);
                    break;
                  default:
                }
              });
            }
            if (Object.keys(offering.serviceOffering).length !== 0) {
              offering.serviceOffering.classificationInstances.forEach((instance: any) => {
                switch (instance.classificationLevel.impactLevel) {
                  case dow.ImpactLevel.IL2:
                    il2.push(offering);
                    break;
                  case dow.ImpactLevel.IL4:
                    il4.push(offering);
                    break;
                  case dow.ImpactLevel.IL5:
                    il5.push(offering);
                    break;
                  case dow.ImpactLevel.IL6:
                    il6.push(offering);
                    break;
                  default:
                }
              });
            }
          });
          const data = {
            il2,
            il4,
            il5,
            il6,
          };
          return data;
        },
        filterCloudSupport: (cloudSupportPackages: any) => {
          const impactLevel2: any = [];
          const impactLevel4: any = [];
          const impactLevel5: any = [];
          const impactLevel6: any = [];
          cloudSupportPackages.forEach((plan: any) => {
            switch (plan.classificationLevel.impactLevel) {
              case dow.ImpactLevel.IL2:
                impactLevel2.push(plan);
                break;
              case dow.ImpactLevel.IL4:
                impactLevel4.push(plan);
                break;
              case dow.ImpactLevel.IL5:
                impactLevel5.push(plan);
                break;
              default:
                impactLevel6.push(plan);
            }
          });
          const data = {
            il2: impactLevel2,
            il4: impactLevel4,
            il5: impactLevel5,
            il6: impactLevel6,
          };
          return data;
        },
        dataRequirementsList: (
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
            if (plan.serviceType === dow.ServiceOfferingGroup.PORTABILITY_PLAN) {
              switch (plan.classificationLevel.impactLevel.impactLevel) {
                case dow.ImpactLevel.IL2:
                  portabilityPlanTaskNumbers.push("4.3.1");
                  break;
                case dow.ImpactLevel.IL4:
                  portabilityPlanTaskNumbers.push("4.3.2");
                  break;
                case dow.ImpactLevel.IL5:
                  portabilityPlanTaskNumbers.push("4.3.3");
                  break;
                case dow.ImpactLevel.IL6:
                  portabilityPlanTaskNumbers.push("4.3.4");
                  break;
                default:
                // do nothing
              }
            }
            if (plan.serviceType === dow.ServiceOfferingGroup.TRAINING) {
              switch (plan.classificationLevel.impactLevel) {
                case dow.ImpactLevel.IL2:
                  trainingDowTaskNumbers.push("4.3.1.3");
                  break;
                case dow.ImpactLevel.IL4:
                  trainingDowTaskNumbers.push("4.3.2.3");
                  break;
                case dow.ImpactLevel.IL5:
                  trainingDowTaskNumbers.push("4.3.3.3");
                  break;
                case dow.ImpactLevel.IL6:
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
        },
        // //fully implemented
        checkForCloudSupport: () => {
          if (payload.cloudSupportPackages.length > 0) {
            return "Yes";
          } else {
            return "No";
          }
        },
        getNumberComputeInstances: (impactLevel: any) => {
          const numInstances = {
            dev: 0,
            preProd: 0,
            prod: 0,
            coop: 0,
          };
          payload.xaasOfferings.forEach((offering: any) => {
            if (offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.COMPUTE) {
              offering.instanceConfigurations.forEach((instance: any) => {
                if (instance.classificationLevel.impactLevel === impactLevel) {
                  switch (instance.environmentType) {
                    case dow.EnvironmentType.DEV_TEST:
                      numInstances.dev += instance.numberOfInstances;
                      break;
                    case dow.EnvironmentType.PRE_PROD:
                      numInstances.preProd += instance.numberOfInstances;
                      break;
                    case dow.EnvironmentType.COOP_DIASTER_RECOVERY:
                      numInstances.coop += instance.numberOfInstances;
                      break;
                    default:
                      numInstances.prod += instance.numberOfInstances;
                  }
                }
              });
            }
          });
          console.log(numInstances);
          return numInstances;
        },
        getComputeInstances: (impactLevel: any) => {
          const computeInstances: any = [];
          payload.xaasOfferings.forEach((offering: any) => {
            if (offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.COMPUTE) {
              offering.instanceConfigurations.forEach((instance: any) => {
                if (instance.classificationLevel.impactLevel === impactLevel) {
                  computeInstances.push(instance);
                }
              });
            }
          });
          return computeInstances;
        },
        getNumberDatabaseInstances: (impactLevel: any) => {
          let numInstances = 0;
          payload.xaasOfferings.forEach((offering: any) => {
            if (offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.DATABASE) {
              offering.instanceConfigurations.forEach((instance: any) => {
                if (instance.classificationLevel.impactLevel === impactLevel) {
                  numInstances += instance.numberOfInstances;
                }
              });
            }
          });
          return numInstances;
        },
        getDatabaseInstances: (impactLevel: any) => {
          const databaseInstances: any = [];
          payload.xaasOfferings.forEach((offering: any) => {
            if (offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.DATABASE) {
              offering.instanceConfigurations.forEach((instance: any) => {
                if (instance.classificationLevel.impactLevel === impactLevel) {
                  databaseInstances.push(instance);
                }
              });
            }
          });
          return databaseInstances;
        },
        getStorageInstances: (impactLevel: any) => {
          const storageInstances: any = [];
          payload.xaasOfferings.forEach((offering: any) => {
            if (offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.STORAGE) {
              offering.instanceConfigurations.forEach((instance: any) => {
                if (instance.classificationLevel.impactLevel === impactLevel) {
                  storageInstances.push(instance);
                }
              });
            }
          });
          return storageInstances;
        },
        getStandardInstances: (impactLevel: any, service: any) => {
          const tools: any = [];
          payload.xaasOfferings.forEach((offering: any) => {
            offering.serviceOffering.classificationInstances.forEach((classification: any) => {
              if (
                classification.classificationLevel.impactLevel === impactLevel &&
                offering.serviceOffering.serviceOffering.serviceOfferingGroup === service
              ) {
                tools.push(offering.serviceOffering);
              }
            });
          });
          return tools;
        },
        getRegions: (impactLevel: string) => {
          const data: any = [];
          payload.selectedClassificationLevels.forEach((classLevel: any) => {
            if (classLevel.classificationLevel.impactLevel === impactLevel) {
              // let regions:any[] = classLevel.usersPerRegion.split(',');
              const regions: any[] = JSON.parse(classLevel.usersPerRegion);
              regions.forEach((region: any) => {
                // let r = JSON.parse(region);
                // let zone = Object.keys(r);
                console.log(impactLevel, region);
                const zone = Object.keys(region);
                const obj = {
                  region: zone[0],
                  users: region[zone[0]],
                };
                data.push(obj);
              });
            }
          });
          return data;
        },
        getAnticipatedNeeds: (impactLevel: any) => {
          const data: any = [];
          let userGrowthEstimateType: any;
          const userGrowthEstimatePercentage: any = [];
          let dataGrowthEstimateType: any;
          const dataGrowthEstimatePercentage: any = [];
          payload.selectedClassificationLevels.forEach((classLevel: any) => {
            if (classLevel.classificationLevel.impactLevel === impactLevel) {
              const usersIncrease = classLevel.usersIncrease;
              const dataIncrease = classLevel.dataIncrease;

              if (usersIncrease === true) {
                userGrowthEstimateType = classLevel.userGrowthEstimateType;
                if (classLevel.userGrowthEstimateType === "SINGLE") {
                  console.log("Single", classLevel.userGrowthEstimatePercentage);
                  userGrowthEstimatePercentage[0] = classLevel.userGrowthEstimatePercentage;
                } else {
                  for (let i = 0; i < classLevel.userGrowthEstimatePercentage.length; i++) {
                    let period;
                    if (i === 0) {
                      period = "Base ";
                    } else {
                      period = "Option " + i;
                    }
                    const obj = {
                      period,
                      value: classLevel.userGrowthEstimatePercentage[i],
                    };

                    userGrowthEstimatePercentage.push(obj);
                  }
                }
                const tmp = {
                  usersIncrease,
                  userGrowthEstimateType,
                  userGrowthEstimatePercentage,
                };
                data.push(tmp);
              }
              if (dataIncrease === true) {
                if (classLevel.dataGrowthEstimateType === "SINGLE") {
                  dataGrowthEstimatePercentage.push(classLevel.dataGrowthEstimatePercentage);
                } else {
                  for (let i = 0; i < classLevel.dataGrowthEstimatePercentage.length; i++) {
                    let period;
                    if (i === 0) {
                      period = "Base";
                    } else {
                      period = "Option " + i;
                    }
                    const obj = {
                      period,
                      value: classLevel.dataGrowthEstimatePercentage[i],
                    };
                    dataGrowthEstimatePercentage.push(obj);
                  }
                }

                const tmp = {
                  dataIncrease,
                  dataGrowthEstimateType,
                  dataGrowthEstimatePercentage,
                };
                data.push(tmp);
              }
            }
          });
          return data;
        },
        calcAvgDataEgress: () => {
          let gbEgress = 0;
          let pbEgress = 0;
          let tbEgress = 0;
          const response = {
            dataEgressAverage: 0,
            dataEgressMonthlyUnit: dow.StorageUnit.TB,
          };
          payload.selectedClassificationLevels.forEach((classLevel: any) => {
            switch (classLevel.dataEgressMonthlyUnit) {
              case dow.StorageUnit.GB:
                gbEgress += classLevel.dataEgressMonthlyAmount;
                break;
              case dow.StorageUnit.TB:
                tbEgress += classLevel.dataEgressMonthlyAmount;
                break;
              case dow.StorageUnit.PB:
                pbEgress += classLevel.dataEgressMonthlyAmount;
                break;
              default:
                console.error();
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
            response.dataEgressMonthlyUnit = dow.StorageUnit.PB;
          } else if (gbDataEgress / 1000 > 1) {
            response.dataEgressAverage = gbDataEgress / 1000;
            response.dataEgressMonthlyUnit = dow.StorageUnit.TB;
          } else {
            response.dataEgressAverage = gbDataEgress;
            response.dataEgressMonthlyUnit = dow.StorageUnit.GB;
          }
          return response;
        },
      },
      cmdDelimiter: ["{", "}"],
    })
  );
  logger.info("DOW Word document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
