import createReport from "docx-templates";
import fs from "fs";
import * as path from "path";
import * as dow from "../models/document-generation/description-of-work";
import { Classification } from "../models/document-generation";
import { getCDRLs, getTaskPeriods, formatPeriodOfPerformance, getSecurityRequirements } from "./utils/utils";

export async function handler(body: any) {
  const { documentType, templatePayload } = body;

  // const docxPath = path.join(__dirname, "./templates/dow-template.docx");
  const docxTemplatesPath = path.join(__dirname, "./templates/dow-template.docx");
  // const docxTemplatesPathActual = path.join(__dirname, "./templates/Clean_JWCC Description of Work.docx");
  // const docxTemplatesPathActual = path.join(__dirname, "./templates/dow-template-testing.docx");

  try {
    const popTasks = getTaskPeriods(templatePayload);
    const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
    const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
    const allPopTasks = entirePeriodTasks.concat(selectedPeriodTask);
    const cdrls = getCDRLs(allPopTasks, templatePayload.contractType);
    const { basePeriod, optionPeriods } = templatePayload.periodOfPerformance;
    const popPeriods = formatPeriodOfPerformance(basePeriod, optionPeriods);

    // security Requirements
    const securityRequirements = getSecurityRequirements(templatePayload);
    console.log("Security REQUs.", securityRequirements);
    // NOTE: docx-templates
    const report = await createReport({
      template: fs.readFileSync(docxTemplatesPath),
      data: {
        ...templatePayload,
        pop: popTasks,
        cdrls,
        popPeriods,
        sr: securityRequirements,
        sumTotalInstances: () => {
          let number = 0;
          for (let i = 0; i < templatePayload.currentEnvironment.envInstances.length; i++) {
            number += templatePayload.currentEnvironment.envInstances[i].numberOfInstances;
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
          if (templatePayload.cloudSupportPackages.length > 0) {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.xaasOfferings.forEach((offering: any) => {
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
          templatePayload.selectedClassificationLevels.forEach((classLevel: any) => {
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
          templatePayload.selectedClassificationLevels.forEach((classLevel: any) => {
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
          templatePayload.selectedClassificationLevels.forEach((classLevel: any) => {
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
          const pbToGB;
          const tbToGB;
          const gbDataEgress;
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
    });
    fs.writeFileSync(path.resolve(__dirname, "test-dow-output.docx"), report);
  } catch (errors) {
    if (Array.isArray(errors)) {
      console.log("MOST LIKELY BAD COMMAND", errors);
    } else {
      console.log("SOME OTHER UNKNOWN ERROR", errors);
    }
  }
}

const body = {
  documentType: "DESCRIPTION_OF_WORK",
  templatePayload: {
    toTitle: "Tom's DoW Sample",
    scope: "Just building out the DOW",
    scopeSurge: "5",
    contractInformation: {
      contractNumber: "ABC123",
      currentContractExists: false,
      previousTaskOrderNumber: "",
    },
    contractType: {
      contractTypeJustification: "Some justification",
      firmFixedPrice: true,
      timeAndMaterials: true,
    },
    awardHistory: [
      { contractAwardType: "INITIAL_AWARD", modificationOrder: null, effectiveDate: "2022-05-20" },
      { contractAwardType: "MODIFICATION", modificationOrder: 3, effectiveDate: "2022-09-01" },
      { contractAwardType: "MODIFICATION", modificationOrder: 1, effectiveDate: "2023-02-01" },
    ],
    crossDomainSolutions: {
      crossDomainSolutionRequired: true,
      // need to parse the string JSON.parse(string)
      trafficPerDomainPair: [
        {
          name: "U_TO_S",
          dataQuantity: 500,
        },
        {
          name: "S_TO_U",
          dataQuantity: 50,
        },
      ],
      projectedFileStreamType: "xml",
      anticipatedNeedOrUsage: "Unknown",
      selectedPeriods: [
        {
          periodType: dow.PeriodType.BASE,
          periodUnitCount: 12,
          periodUnit: dow.PeriodUnit.MONTH,
          optionOrder: null,
        },
      ],
    },

    cloudSupportPackages: [
      // used for training ONLY
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL2,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL2,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: "TRAINING",
        classificationLevel: {
          classification: "S",
          impactLevel: "IL6",
        },
        classifiedInformationTypes: [
          { name: "Controlled Unclassified Information (CUI)", description: null, sequence: 11 },
        ],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
        selectedPeriods: {
          periodType: dow.PeriodType.BASE,
          periodUnitCount: 1,
          periodUnit: dow.PeriodUnit.YEAR,
          optionOrder: null,
        },
        canTrainInUnclassEnv: true,
        trainingLocation: "Training Location",
        trainingRequirementTitle: "Training Requirement Title",
        trainingTimeZone: "Time Zone Training",
        trainingFacilityType: dow.FacilityType.GOVERNMENT_FACILITY,
        trainingFormat: dow.TrainingFormat.NO_PREFERENCE,
        personnelRequiringTraining: 25,
      },
      {
        serviceType: dow.ServiceOfferingGroup.DOCUMENTATION_SUPPORT,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL2,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.GENERAL_CLOUD_SUPPORT,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL2,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL4,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          classification: "U",
          impactLevel: dow.ImpactLevel.IL4,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          classification: "S",
          impactLevel: dow.ImpactLevel.IL6,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
        classifiedInformationTypes: [],
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          classification: "S",
          impactLevel: dow.ImpactLevel.IL6,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          classification: "TS",
          impactLevel: null,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          classification: "TS",
          impactLevel: null,
        },
        classifiedInformationTypes: [],
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, // true
      },
    ],
    periodOfPerformance: {
      basePeriod: {
        periodType: "BASE",
        periodUnitCount: 12,
        periodUnit: "MONTH",
        optionOrder: null,
      },
      optionPeriods: [
        {
          periodType: "OPTION",
          periodUnitCount: 12,
          periodUnit: "MONTH",
          optionOrder: 1,
        },
        {
          periodType: "OPTION",
          periodUnitCount: 12,
          periodUnit: "MONTH",
          optionOrder: 2,
        },
      ],
      popStartRequest: false,
      requestedPopStartDate: null,
      recurringRequirement: false,
    },
    currentEnvironment: {
      currentEnvironmentExists: true,
      hasSystemDocumentation: true,
      hasMigrationDocumentation: false,
      envLocation: dow.EnvironmentLocation.HYBRID,
      // TODO: an array of Classification Levels
      envClassificationsCloud: ["IL2", "IL6"],
      envInstances: [
        {
          // CLOUD
          // TODO: this is nested a layer deeper than needed
          // currentEnvironmentInstance: {
          numberOfInstances: 32,
          classificationLevel: {
            classification: "S",
            impactLevel: {
              impactLevel: "IL6",
            },
          },
          additionalInformation: "Cloud",
          classifiedInformationTypes: [
            { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
            { name: "North Atlantic Treaty Organization (NATO) Information", description: null, sequence: 8 },
          ],
          currentUsageDescription: dow.UsageDescription.IRREGULAR_USAGE,
          isTrafficSpikeEventBased: true,
          trafficSpikeEventDescription: "Santa",
          isTrafficSpikePeriodBased: true,
          trafficSpikePeriodDescription: "Holidays",
          deployedRegions: [
            {
              usersPerRegion: 500,
              regions: dow.Region.CONUS,
            },
            {
              usersPerRegion: 10000,
              regions: dow.Region.CONUS,
            },
          ],
          numberOfvCPUs: 7,
          processorSpeed: 5.2,
          operatingSystem: "Kali Linux",
          licensing: "OSS",
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.GB,
          memoryAmount: 250,
          memoryUnit: dow.StorageUnit.GB,
          performanceTier: dow.PerformanceTier.COMPUTE,
          dataEgressMonthlyAmount: 1,
          dataEgressMonthlyUnit: dow.StorageUnit.PB,
          instanceLocation: "Cloud",
          // },
        },
        {
          // currentEnvironmentInstance: {
          numberOfInstances: 8,
          classificationLevel: {
            classification: "U",
            impactLevel: "IL2",
            display: "Unclassified - IL2",
          },
          additionalInformation: "On-Prem",
          // },
          classifiedInformationTypes: [],
          currentUsageDescription: dow.UsageDescription.EVEN_USAGE,
          deployedRegions: [
            {
              usersPerRegion: 250,
              regions: dow.Region.OCONUS,
            },
            {
              usersPerRegion: 300,
              regions: dow.Region.CONUS,
            },
          ],
          numberOfvCPUs: 7,
          processorSpeed: 5.2,
          operatingSystem: "Kali Linux",
          licensing: "OSS",
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.GB,
          memoryAmount: 250,
          memoryUnit: dow.StorageUnit.GB,
          performanceTier: dow.PerformanceTier.COMPUTE,
          dataEgressMonthlyAmount: 1,
          dataEgressMonthlyUnit: dow.StorageUnit.PB,
          instanceLocation: "On-Prem",
        },
      ],
      currentEnvironmentReplicatedOptimized: "No",
      anticipatedYearlyAdditionalCapacity: 15,
      hasPhasedApproach: true,
      phasedApproachSchedule: "Sample Phased Approach Schedule",
      needsarchitecturalDesignRequirements: "Yes",
      architecturalDesignRequirement: [
        {
          applicationNeedingDesign: "Test 1",
          statement: "Statement 1",
          externalFactors: "Ex Factors 1",
          dataClassificationLevels: {
            classification: [dow.Classification.S],
            impactLevel: {
              impactLevel: [dow.ImpactLevel.IL5],
            },
          },
        },
        {
          applicationNeedingDesign: "Test 2",
          statement: "Statement 2",
          externalFactors: "Ex Factors 2",
          dataClassificationLevels: {
            classification: [dow.Classification.U],
            impactLevel: {
              impactLevel: [dow.ImpactLevel.IL4],
            },
          },
        },
      ],
    },
    xaasOfferings: [
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL4",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.EDGE_COMPUTING,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL4",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.DEVELOPER_TOOLS,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.APPLICATIONS,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL4",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.MACHINE_LEARNING,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.NETWORKING,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.SECURITY,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        // edge computing, dev tools & services, apps, machine learning
        // networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2",
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: {
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.IOT,
          },
        },
        // compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: { classification: "S", display: "Unclassified - IL6", impactLevel: "IL6" },
              classifiedInformationTypes: [
                { name: "Controlled Unclassified Information (CUI)", description: null, sequence: 11 },
                { name: "Restricted Data", description: null, sequence: 2 },
                { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
              ],
              selectedPeriods: null,
              needForEntireTaskOrderDuration: true,
              usageDescription: "Infrastrcture upkeep",
              dowTaskNumber: "4.2.1.2.",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: { name: "Compute", description: null, serviceOfferingGroup: "COMPUTE", sequence: 1 },
        },
        instanceConfigurations: [
          {
            instanceName: "Testing Compute instance",
            instanceLocation: "CLOUD",
            numberOfInstances: 2,
            osLicensing: dow.Licensing.NEW,
            usageDescription: null,
            anticipatedNeedOrUsage: "Processing OLTP\r\n",
            operatingSystem: "Linux",
            licensing: null,
            region: {
              name: "CONUS Central",
              description: "Central Continental United States",
              sequence: 2,
              group: "CONUS",
            },
            needForEntireTaskOrderDuration: true,
            selectedPeriods: null,
            classificationLevel: { classification: "S", display: "Unclassified - IL6", impactLevel: "IL6" },
            classifiedInformationTypes: [
              { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
            ],
            dataEgressMonthlyAmount: null,
            dataEgressMonthlyUnit: null,
            memoryAmount: 100,
            memoryUnit: "GB",
            storageAmount: 124,
            storageUnit: "GB",
            storageType: "BLOCK",
            numberOfVcpus: 6,
            performanceTier: "GENERAL",
            processorSpeed: 9999,
            pricingModel: null,
            pricingModelExpiration: null,
            environmentType: "DEV_TEST",
            operatingEnvironment: "VIRTUAL",
          },
          {
            instanceName: "Testing Compute instance",
            instanceLocation: "CLOUD",
            numberOfInstances: 9,
            usageDescription: null,
            anticipatedNeedOrUsage: "Processing OLTP\r\n",
            osLicensing: dow.Licensing.NEW,
            operatingSystem: "Linux",
            licensing: null,
            region: {
              name: "CONUS Central",
              description: "Central Continental United States",
              sequence: 2,
              group: "CONUS",
            },
            needForEntireTaskOrderDuration: true,
            selectedPeriods: null,
            classificationLevel: { classification: "S", display: "Unclassified - IL6", impactLevel: "IL6" },
            classifiedInformationTypes: [
              { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
            ],
            dataEgressMonthlyAmount: null,
            dataEgressMonthlyUnit: null,
            memoryAmount: 100,
            memoryUnit: "GB",
            storageAmount: 124,
            storageUnit: "GB",
            storageType: "BLOCK",
            numberOfVcpus: 6,
            performanceTier: "GENERAL",
            processorSpeed: 9999,
            pricingModel: null,
            pricingModelExpiration: null,
            environmentType: "PRE_PROD",
            operatingEnvironment: "VIRTUAL",
          },
        ],
      },
      {
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: { classification: "U", display: "Unclassified - IL2", impactLevel: "IL2" },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              needForEntireTaskOrderDuration: true,
              usageDescription: "Infrastrcture upkeep",
              dowTaskNumber: "4.2.1.2.",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: { name: "Database", description: null, serviceOfferingGroup: "DATABASE", sequence: 1 },
        },
        instanceConfigurations: [
          {
            instanceName: "Testing Compute instance",
            instanceLocation: "CLOUD",
            numberOfInstances: 2,
            usageDescription: null,
            anticipatedNeedOrUsage: "Sample DB Need\r\n",
            operatingSystem: "Linux",
            osLicensing: dow.Licensing.NEW,
            licensing: null,
            region: {
              name: "CONUS Central",
              description: "Central Continental United States",
              sequence: 2,
              group: "CONUS",
            },
            needForEntireTaskOrderDuration: true,
            selectedPeriods: null,
            classificationLevel: { classification: "U", display: "Unclassified - IL2", impactLevel: "IL2" },
            classifiedInformationTypes: [
              { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
            ],
            dataEgressMonthlyAmount: null,
            dataEgressMonthlyUnit: null,
            memoryAmount: 100,
            memoryUnit: "GB",
            storageAmount: 124,
            storageUnit: "GB",
            storageType: "BLOCK",
            numberOfVcpus: 6,
            performanceTier: "GENERAL",
            processorSpeed: 9999,
            pricingModel: null,
            pricingModelExpiration: null,
            databaseType: dow.DatabaseType.OTHER, // only if type === "OTHER"
            databaseTypeOther: "other type...test",
            databaseLicensing: dow.Licensing.NEW,
          },
        ],
      },
    ],
    contractConsiderations: {
      // 10a
      potentialConflictOfInterest: true,
      conflictOfInterestExplanation: "Company investment in same solutions.",
      // 10b
      packagingShippingNoneApply: false,
      // packagingShippingOther: false,
      // packagingShippingOtherExplanation: "",
      packagingShippingOther: true,
      packagingShippingOtherExplanation: "We have a private carrier being used.",
      contractorProvidedTransfer: false,
      // piiPresent: false,
      // systemOfRecordName: "",
      piiPresent: true,
      systemOfRecordName: "System Cool Name",
      // testing empty travel
      // travel: [],
      travel: [
        {
          durationInDays: 14,
          numberOfTravelers: 2,
          numberOfTrips: 6,
          selectedPeriods: [{ periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 }],
          tripLocation: "Canada",
        },
        {
          durationInDays: 4,
          numberOfTravelers: 1,
          numberOfTrips: 8,
          selectedPeriods: [{ periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 }],
          tripLocation: "Washington DC",
        },
        {
          durationInDays: 160,
          numberOfTravelers: 5,
          numberOfTrips: 2,
          selectedPeriods: [{ periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 }],
          tripLocation: "Europe",
        },
      ],
    },
    selectedClassificationLevels: [
      {
        classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL2" },
        classifiedInformationTypes: [
          { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
          { name: "North Atlantic Treaty Organization (NATO) Information", description: null, sequence: 8 },
        ],
        dataEgressMonthlyAmount: 345,
        dataEgressMonthlyUnit: "GB",
        usersPerRegion: '{"EAST":"1234"},{"WEST":"75"}',
        dataIncrease: false,
        userGrowthEstimatePercentage: ["346", "-10"],
        userGrowthEstimateType: "MULTIPLE",
        dataGrowthEstimatePercentage: ["2"],
        dataGrowthEstimateType: null,
        usersIncrease: true,
      },
      {
        classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
        classifiedInformationTypes: [{ name: "Formerly Restricted Data", description: null, sequence: 4 }],
        dataEgressMonthlyAmount: 12231,
        dataEgressMonthlyUnit: "GB",
        usersPerRegion: '{"sfsafsdf":"500"}',
        dataIncrease: false,
        userGrowthEstimatePercentage: null,
        userGrowthEstimateType: "SINGLE",
        dataGrowthEstimatePercentage: null,
        dataGrowthEstimateType: "SINGLE",
        usersIncrease: false,
      },
    ],
    sensitiveInformation: { section508Sufficient: true, accessibilityReqs508: "Some requirments for section 508." },
  },
};

const alternativePayload = {
  documentType: "DESCRIPTION_OF_WORK_DOCX",
  templatePayload: {
    awardHistory: [
      { contractAwardType: "INITIAL_AWARD", modificationOrder: null, effectiveDate: "2022-05-20" },
      { contractAwardType: "MODIFICATION", modificationOrder: 3, effectiveDate: "2022-09-01" },
      { contractAwardType: "MODIFICATION", modificationOrder: 1, effectiveDate: "2023-02-01" },
    ],
    contractInformation: {
      currentContractExists: true,
      contractNumber: "928384",
      contractExpirationDate: "2022-12-09",
      incumbentContractorName: "Someone Making Decisions",
      previousTaskOrderNumber: "29284484",
    },
    toTitle: "Versatile Demo Package",
    scope: "Trying to build up another package that can be used for testing different parts of the system.",
    scopeSurge: "10",
    currentEnvironment: {
      currentEnvironmentExists: true,
      hasSystemDocumentation: false,
      hasMigrationDocumentation: false,
      envLocation: "CLOUD",
      envClassificationsCloud: [{ classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" }],
      envClassificationsOnprem: [],
      envInstances: [
        {
          instanceName: "Test DB",
          instanceLocation: "CLOUD",
          numberOfInstances: 2,
          usageDescription: null,
          anticipatedNeedOrUsage: null,
          operatingSystem: null,
          licensing: null,
          region: {
            name: "CONUS Central",
            description: "Central Continental United States",
            sequence: 2,
            group: "CONUS",
          },
          needForEntireTaskOrderDuration: false,
          selectedPeriods: [
            { periodType: "BASE", periodUnitCount: 1, periodUnit: "YEAR", optionOrder: null },
            { periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 },
          ],
          classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
          classifiedInformationTypes: [],
          dataEgressMonthlyAmount: null,
          dataEgressMonthlyUnit: null,
          memoryAmount: null,
          memoryUnit: null,
          storageAmount: null,
          storageUnit: null,
          storageType: null,
          numberOfVcpus: null,
          performanceTier: null,
          processorSpeed: null,
          pricingModel: "PAY_AS_YOU_GO",
          pricingModelExpiration: null,
          environmentType: null,
          operatingEnvironment: "SERVERLESS",
          deployedRegions: [],
          usersPerRegion: null,
          isTrafficSpikeEventBased: false,
          trafficSpikeEventDescription: null,
          isTrafficSpikePeriodBased: false,
          trafficSpikePeriodDescription: null,
          additionalInformation: null,
          currentUsageDescription: null,
          anticipatedNeedUsage: null,
        },
        {
          instanceName: "Test Current Env",
          instanceLocation: "CLOUD",
          numberOfInstances: 3,
          usageDescription: null,
          anticipatedNeedOrUsage: null,
          operatingSystem: "Linux",
          licensing: "MIT",
          region: {
            name: "CONUS Central",
            description: "Central Continental United States",
            sequence: 2,
            group: "CONUS",
          },
          needForEntireTaskOrderDuration: true,
          selectedPeriods: null,
          classificationLevel: { classification: "U", display: "Unclassified - IL2", impactLevel: "IL2" },
          classifiedInformationTypes: [],
          dataEgressMonthlyAmount: null,
          dataEgressMonthlyUnit: null,
          memoryAmount: null,
          memoryUnit: null,
          storageAmount: null,
          storageUnit: null,
          storageType: null,
          numberOfVcpus: null,
          performanceTier: "COMPUTE",
          processorSpeed: null,
          pricingModel: "PAY_AS_YOU_GO",
          pricingModelExpiration: null,
          environmentType: null,
          operatingEnvironment: "SERVERLESS",
          deployedRegions: [
            { name: "CONUS Central", description: "Central Continental United States", sequence: 2, group: "CONUS" },
            { name: "EUCOM", description: "United States European Command", sequence: 6, group: "OCONUS" },
            { name: "INDOPACOM", description: "United States Indo-Pacific Command", sequence: 7, group: "OCONUS" },
          ],
          usersPerRegion: null,
          isTrafficSpikeEventBased: false,
          trafficSpikeEventDescription: null,
          isTrafficSpikePeriodBased: false,
          trafficSpikePeriodDescription: null,
          additionalInformation: null,
          currentUsageDescription: "EVEN_USAGE",
          anticipatedNeedUsage: null,
        },
      ],
      additionalGrowth: true,
      anticipatedYearlyAdditionalCapacity: 0,
      currentEnvironmentReplicatedOptimized: "YES_OPTIMIZE",
      statementReplicatedOptimized: "",
      hasPhasedApproach: false,
      phasedApproachSchedule: "",
      needsArchitecturalDesignServices: false,
      architecturalDesignRequirement: {
        statement: "Helper for the app",
        applicationsNeedingDesign: "middleware app",
        externalFactors: null,
        source: "CURRENT_ENVIRONMENT",
        dataClassificationLevels: [{ classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" }],
      },
    },
    selectedClassificationLevels: [
      {
        classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
        classifiedInformationTypes: [
          { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
          { name: "North Atlantic Treaty Organization (NATO) Information", description: null, sequence: 8 },
        ],
        dataEgressMonthlyAmount: 345,
        dataEgressMonthlyUnit: "GB",
        usersPerRegion: JSON.stringify([{ EAST: "1234" }, { WEST: "75" }]),
        dataIncrease: false,
        userGrowthEstimatePercentage: "346",
        userGrowthEstimateType: "SINGLE",
        dataGrowthEstimatePercentage: null,
        dataGrowthEstimateType: null,
        usersIncrease: false,
      },
      {
        classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
        classifiedInformationTypes: [{ name: "Formerly Restricted Data", description: null, sequence: 4 }],
        dataEgressMonthlyAmount: 12231,
        dataEgressMonthlyUnit: "GB",
        usersPerRegion: JSON.stringify([{ EAST: "23948" }, { WEST: "5275" }]),
        // usersPerRegion: "sfsafsdf",
        dataIncrease: false,
        userGrowthEstimatePercentage: null,
        userGrowthEstimateType: "SINGLE",
        dataGrowthEstimatePercentage: null,
        dataGrowthEstimateType: "SINGLE",
        usersIncrease: false,
      },
    ],
    architecturalDesignRequirement: {
      statement: "Best cost effective architect",
      applicationsNeedingDesign: "cloud app",
      externalFactors: "economy",
      source: "DOW",
      dataClassificationLevels: [
        { classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" },
        { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
      ],
    },
    xaasOfferings: [
      {
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              needForEntireTaskOrderDuration: true,
              usageDescription: "Infrastrcture upkeep",
              dowTaskNumber: "4.2.1.2.",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: { name: "Compute", description: null, serviceOfferingGroup: "COMPUTE", sequence: 1 },
        },
        instanceConfigurations: [
          {
            instanceName: "Testing Compute instance",
            instanceLocation: "CLOUD",
            numberOfInstances: 2,
            usageDescription: null,
            anticipatedNeedOrUsage: "Processing OLTP\r\n",
            operatingSystem: "Linux",
            licensing: null,
            region: {
              name: "CONUS Central",
              description: "Central Continental United States",
              sequence: 2,
              group: "CONUS",
            },
            needForEntireTaskOrderDuration: true,
            selectedPeriods: null,
            classificationLevel: { classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" },
            classifiedInformationTypes: [
              { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
            ],
            dataEgressMonthlyAmount: null,
            dataEgressMonthlyUnit: null,
            memoryAmount: 100,
            memoryUnit: "GB",
            storageAmount: 124,
            storageUnit: "GB",
            storageType: "BLOCK",
            numberOfVcpus: 6,
            performanceTier: "GENERAL",
            processorSpeed: 9999,
            pricingModel: null,
            pricingModelExpiration: null,
            environmentType: "DEV_TEST",
            operatingEnvironment: "VIRTUAL",
          },
        ],
      },
      {
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: { classification: "U", display: "Unclassified - IL2", impactLevel: "IL2" },
              classifiedInformationTypes: [],
              selectedPeriods: [{ periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 }],
              needForEntireTaskOrderDuration: false,
              usageDescription: "Testing",
              dowTaskNumber: "0.0.0.0",
            },
          ],
          otherServiceOffering: "Special Invesitation",
          serviceOffering: {
            name: "Migration Tools",
            description: null,
            serviceOfferingGroup: "DEVELOPER_TOOLS",
            sequence: 3,
          },
        },
        instanceConfigurations: [],
      },
      {
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: { classification: "U", display: "Unclassified - IL4", impactLevel: "IL4" },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              needForEntireTaskOrderDuration: true,
              usageDescription: "Infrastrcture upkeep",
              dowTaskNumber: "4.2.1.2.",
            },
          ],
          otherServiceOffering: null,
          serviceOffering: { name: "Database", description: null, serviceOfferingGroup: "DATABASE", sequence: 1 },
        },
        instanceConfigurations: [
          {
            instanceName: "Testing DB instance",
            instanceLocation: "CLOUD",
            numberOfInstances: 2,
            usageDescription: null,
            anticipatedNeedOrUsage: null,
            operatingSystem: null,
            licensing: null,
            region: null,
            needForEntireTaskOrderDuration: true,
            selectedPeriods: null,
            classificationLevel: { classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" },
            classifiedInformationTypes: [],
            dataEgressMonthlyAmount: null,
            dataEgressMonthlyUnit: null,
            memoryAmount: null,
            memoryUnit: null,
            storageAmount: null,
            storageUnit: null,
            storageType: null,
            numberOfVcpus: null,
            performanceTier: null,
            processorSpeed: null,
            pricingModel: null,
            pricingModelExpiration: null,
            databaseLicensing: null,
            databaseType: null,
            databaseTypeOther: null,
          },
        ],
      },
    ],
    crossDomainSolutions: {
      anticipatedNeedOrUsage: "need to transfer a lot of documents ",
      crossDomainSolutionRequired: true,
      selectedPeriods: [
        { periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 },
        { periodType: "BASE", periodUnitCount: 1, periodUnit: "YEAR", optionOrder: null },
      ],
      needForEntireTaskOrderDuration: false,
      projectedFileStreamType: "PDF",
      trafficPerDomainPair: [
        {
          type: "U_TO_S",
          dataQuantity: 75,
        },
        {
          type: "S_TO_U",
          dataQuantity: 50,
        },
      ],
      // trafficPerDomainPair: [
      //   {
      //     name: "S_TO_U",
      //     dataQuantity: "3495 GB"
      //   }
      // ],
    },
    cloudSupportPackages: [
      {
        instanceName: "Special porting",
        instanceLocation: "CLOUD",
        numberOfInstances: 3,
        usageDescription: null,
        anticipatedNeedOrUsage: null,
        operatingSystem: null,
        licensing: null,
        region: { name: "SOUTHCOM", description: "United States Southern Command", sequence: 8, group: "OCONUS" },
        needForEntireTaskOrderDuration: true,
        selectedPeriods: null,
        classificationLevel: { classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" },
        classifiedInformationTypes: [{ name: "Foreign Government Information (FGI)", description: null, sequence: 9 }],
        dataEgressMonthlyAmount: null,
        dataEgressMonthlyUnit: null,
        memoryAmount: null,
        memoryUnit: null,
        storageAmount: null,
        storageUnit: null,
        storageType: null,
        numberOfVcpus: null,
        performanceTier: null,
        processorSpeed: null,
        pricingModel: "PAY_AS_YOU_GO",
        pricingModelExpiration: null,
        personnelOnsiteAccess: "YES",
        serviceType: "PORTABILITY_PLAN",
      },
      {
        instanceName: "Advisory Assistance for Cloud perforamcne ",
        instanceLocation: "CLOUD",
        numberOfInstances: null,
        usageDescription: null,
        anticipatedNeedOrUsage: null,
        operatingSystem: null,
        licensing: null,
        region: null,
        needForEntireTaskOrderDuration: true,
        selectedPeriods: null,
        classificationLevel: { classification: "U", display: "Unclassified - IL5", impactLevel: "IL5" },
        classifiedInformationTypes: [],
        dataEgressMonthlyAmount: null,
        dataEgressMonthlyUnit: null,
        memoryAmount: null,
        memoryUnit: null,
        storageAmount: null,
        storageUnit: null,
        storageType: null,
        numberOfVcpus: null,
        performanceTier: null,
        processorSpeed: null,
        pricingModel: null,
        pricingModelExpiration: null,
        personnelOnsiteAccess: "NO",
        serviceType: "ADVISORY_ASSISTANCE",
      },
    ],
    contractType: { firmFixedPrice: true, timeAndMaterials: true, contractTypeJustification: "Really need this." },
    periodOfPerformance: {
      basePeriod: { periodType: "BASE", periodUnitCount: 1, periodUnit: "YEAR", optionOrder: null },
      optionPeriods: [
        { periodType: "OPTION", periodUnitCount: 36, periodUnit: "WEEK", optionOrder: 2 },
        { periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 },
      ],
      popStartRequest: true,
      requestedPopStartDate: "2022-11-30",
      timeFrame: "NO_SOONER_THAN",
      recurringRequirement: false,
    },
    securityRequirements: [
      {
        advisoryServicesSecret: [
          { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
          { name: "Controlled Unclassified Information (CUI)", description: null, sequence: 11 },
          { name: "Restricted Data", description: null, sequence: 2 },
        ],
        advisoryServicesTopSecret: [
          { name: "Foreign Government Information (FGI)", description: null, sequence: 9 },
          { name: "Restricted Data", description: null, sequence: 2 },
          {
            name: "National Intelligence Information: Sensitive Compartmented Information (SCI)",
            description: null,
            sequence: 5,
          },
        ],
        serviceOfferingGroup: "ADVISORY_ASSISTANCE",
        tsContractorClearanceType: "TS_SCI",
      },
    ],
    contractConsiderations: {
      potentialConflictOfInterest: true,
      conflictOfInterestExplanation: "Company investment in same solutions.",
      packagingShippingNoneApply: false,
      packagingShippingOther: false,
      packagingShippingOtherExplanation: "",
      contractorProvidedTransfer: false,
      piiPresent: false,
      systemOfRecordName: "",
      travel: [
        {
          durationInDays: 14,
          numberOfTravelers: 2,
          numberOfTrips: 6,
          selectedPeriods: [{ periodType: "OPTION", periodUnitCount: 7, periodUnit: "MONTH", optionOrder: 1 }],
          tripLocation: "Canada",
        },
      ],
    },
    sensitiveInformation: { section508Sufficient: true, accessibilityReqs508: "Some requirments for section 508." },
  },
};

// handler(body);
handler(alternativePayload);
