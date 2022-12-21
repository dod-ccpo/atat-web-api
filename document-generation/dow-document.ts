import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { DescriptionOfWork } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { getCDRLs, getTaskPeriods } from "./utils/utils";

export async function generateDowDocument(
  template: Buffer,
  payload: DescriptionOfWork
): Promise<ApiBase64SuccessResponse> {
  const popTasks = getTaskPeriods(payload);
  const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
  const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
  const allPopTasks = entirePeriodTasks.concat(selectedPeriodTask);
  const cdrls = getCDRLs(allPopTasks, payload.contractType);

  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        pop: popTasks,
        cdrls,
        // TODO: match up with the data in sections 1-4 of DOW
        // checkXaaSClassifications: () => {},
        // sumTotalInstances: () => {
        //   let number = 0;
        //   for (let i = 0; i < payload.currentEnvironment.envInstances.length; i++) {
        //     number += payload.currentEnvironment.envInstances[i].currentEnvironmentInstance.numberOfInstances;
        //   }
        //   return number;
        // },
        // filterCloudSupport: (cloudSupportPackage: any) => {
        //   const impactLevel2: any = [];
        //   const impactLevel4: any = [];
        //   const impactLevel5: any = [];
        //   const impactLevel6: any = [];
        //   // iterate over Cloud Support Package
        //   cloudSupportPackage.instanceConfigurations.forEach((plan: any) => {
        //     plan.portabilityPlan.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //     plan.advisoryAndAssistance.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //     plan.helpDesk.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //     plan.training.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //     plan.docSupport.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //     plan.generalXaaS.forEach((item: any) => {
        //       switch (item.classificationLevel.impactLevel.impactLevel) {
        //         case dow.ImpactLevel.IL2:
        //           impactLevel2.push(item);
        //           break;
        //         case dow.ImpactLevel.IL4:
        //           impactLevel4.push(item);
        //           break;
        //         case dow.ImpactLevel.IL5:
        //           impactLevel5.push(item);
        //           break;
        //         default:
        //           impactLevel6.push(item);
        //       }
        //     });
        //   });
        //   const data = {
        //     il2: impactLevel2,
        //     il4: impactLevel4,
        //     il5: impactLevel5,
        //     il6: impactLevel6,
        //   };
        //   console.log(data);
        //   return data;
        // },
        // // fully implemented
        // checkForCloudSupport: () => {
        //   if (payload.cloudSupportPackage.length > 0) {
        //     return "Yes";
        //   } else {
        //     return "No";
        //   }
        // },
        // getComputeInstances: (impactLevel: any) => {
        //   const numInstances = {
        //     dev: 0,
        //     preProd: 0,
        //     prod: 0,
        //     coop: 0,
        //   };
        //   // need to filter on IL level...
        //   payload.xaasOfferings.instanceConfigurations.computeInstances.forEach((instance: any) => {
        //     if (instance.classificationLevel.impactLevel === impactLevel) {
        //       switch (instance.environmentType) {
        //         case dow.EnvironmentType.DEV_TEST:
        //           numInstances.dev += instance.numberOfInstances;
        //           break;
        //         case dow.EnvironmentType.PRE_PROD:
        //           numInstances.preProd += instance.numberOfInstances;
        //           break;
        //         case dow.EnvironmentType.COOP_DIASTER_RECOVERY:
        //           numInstances.coop += instance.numberOfInstances;
        //           break;
        //         default:
        //           numInstances.prod += instance.numberOfInstances;
        //       }
        //     }
        //   });
        //   return numInstances;
        // },
        // getDatabaseInstances: () => {
        //   const numInstances = {
        //     IL2: 0,
        //     IL4: 0,
        //     IL5: 0,
        //     IL6: 0,
        //   };
        //   // let base = "instance.classificationLevel." + impactLevel
        //   payload.xaasOfferings.instanceConfigurations.databaseInstances.forEach((instance: any) => {
        //     switch (instance.classificationLevel.impactLevel) {
        //       case dow.ImpactLevel.IL2:
        //         numInstances.IL2 += instance.numberOfInstances;
        //         break;
        //       case dow.ImpactLevel.IL4:
        //         numInstances.IL4 += instance.numberOfInstances;
        //         break;
        //       case dow.ImpactLevel.IL5:
        //         numInstances.IL5 += instance.numberOfInstances;
        //         break;
        //       default:
        //         numInstances.IL6 += instance.numberOfInstances;
        //     }
        //   });
        //   return numInstances;
        // },
        // calcAvgDataEgress: () => {
        //   let gbEgress = 0;
        //   let pbEgress = 0;
        //   let tbEgress = 0;
        //   const response = {
        //     dataEgressAverage: 0,
        //     dataEgressMonthlyUnit: dow.StorageUnit.TB,
        //   };
        //   payload.xaasOfferings.instanceConfigurations.computeInstances.forEach((instance: any) => {
        //     switch (instance.dataEgressMonthlyUnit) {
        //       case dow.StorageUnit.GB:
        //         gbEgress += instance.dataEgressMonthlyAmount * instance.numberOfInstances;
        //         break;
        //       case dow.StorageUnit.TB:
        //         tbEgress += instance.dataEgressMonthlyAmount * instance.numberOfInstances;
        //         break;
        //       case dow.StorageUnit.PB:
        //         pbEgress += instance.dataEgressMonthlyAmount * instance.numberOfInstances;
        //         break;
        //       default:
        //         console.error();
        //     }
        //   });
        //   let pbToGB;
        //   let tbToGB;
        //   let gbDataEgress;
        //   if (isNaN(gbEgress)) {
        //     gbEgress = 0;
        //   }
        //   if (isNaN(pbEgress)) {
        //     pbEgress = 0;
        //   }
        //   if (isNaN(tbEgress)) {
        //     tbEgress = 0;
        //   }
        //   pbToGB = pbEgress * 1000000;
        //   tbToGB = tbEgress * 1000;
        //   gbDataEgress = gbEgress + pbToGB + tbToGB;
        //   if (gbDataEgress / 1000000 > 1) {
        //     response.dataEgressAverage = gbDataEgress / 1000000;
        //     response.dataEgressMonthlyUnit = dow.StorageUnit.PB;
        //     return response;
        //   } else if (gbDataEgress / 1000 > 1) {
        //     response.dataEgressAverage = gbDataEgress / 1000;
        //     response.dataEgressMonthlyUnit = dow.StorageUnit.TB;
        //     return response;
        //   } else {
        //     response.dataEgressAverage = gbDataEgress;
        //     response.dataEgressMonthlyUnit = dow.StorageUnit.GB;
        //     return response;
        //   }
        // },
        // calcDevTestInstances: () => {
        //   /* for(let i = 0; i < dow.XaasServiceOfferingGroup.length; i ++){
        //   } */
        // },
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
