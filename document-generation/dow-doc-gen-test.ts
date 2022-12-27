import createReport from "docx-templates";
import fs from "fs";
import * as path from "path";
import * as dow from "../models/document-generation/description-of-work";

export async function handler(body: any) {
  const { documentType, templatePayload } = body;

  //const docxPath = path.join(__dirname, "./templates/dow-template.docx");
  const docxTemplatesPath = path.join(__dirname, "./templates/dow-template.docx");
  const docxTemplatesPathActual = path.join(__dirname, "./templates/Clean_JWCC Description of Work.docx");

  try {
    // NOTE: docx-templates
    const report = await createReport({
      template: fs.readFileSync(docxTemplatesPathActual),
      data: {
        ...templatePayload,
        sumTotalInstances: () => {
          let number = 0;
          for (let i = 0; i < templatePayload.currentEnvironment.envInstances.length; i++) {
            number += templatePayload.currentEnvironment.envInstances[i].currentEnvironmentInstance.numberOfInstances;
          }
          return number;
        },
        checkXaas: (xaasOfferings:any) => {
          let il2:any = [];
          let il4:any = [];
          let il5:any = [];
          let il6:any = [];

          xaasOfferings.forEach((offering:any)=> {
            if(Object.keys(offering.instanceConfigurations).length !== 0){
              offering.instanceConfigurations.forEach((instance:any)=> {
                switch(instance.classificationLevel.impactLevel){
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
            if(Object.keys(offering.serviceOffering).length !=0){
              offering.serviceOffering.classificationInstances.forEach((instance:any)=> {
                switch(instance.classificationLevel.impactLevel){
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
          let data = {
            il2: il2,
            il4: il4,
            il5: il5,
            il6: il6
          }
          return data;
        },
        filterCloudSupport: (cloudSupportPackages: any) => {
          let impactLevel2: any = [];
          let impactLevel4: any = [];
          let impactLevel5: any = [];
          let impactLevel6: any = [];
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
          let data = {
            il2: impactLevel2,
            il4: impactLevel4,
            il5: impactLevel5,
            il6: impactLevel6,
          };
          return data;
        },
        dataRequirementsList: (cloudSupportPackages: any, check4IL2:any, check4IL4:any, check4IL5:any, check4IL6:any, 
          il2EdgeCount:any, il4EdgeCount:any, il5EdgeCount:any,il6EdgeCount:any, contractType: any) => {
          let ffp;
          let timeMaterial;
          let data = [];
          if (contractType.firmFixedPrice) {
            ffp = true;
          }
          if (contractType.timeAndMaterials) {
            timeMaterial = true;
          }

          let trainingDowTaskNumbers: any = [];
          let trainingClinNumbers: any = [];
          let portabilityPlanTaskNumbers: any = [];
          let portabilityClinNumbers:any = []; 
          let monthlyClinNumbers:any = "";
          let teDeviceTaskNumbers: any = [];
          let teDeviceClinNumbers: any = [];
          
          cloudSupportPackages.forEach((plan: any) => {
            if(plan.serviceType == dow.ServiceOfferingGroup.PORTABILITY_PLAN){
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
                default:
                // do nothing
              }
            }
            if(plan.serviceType == dow.ServiceOfferingGroup.TRAINING){
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
                default:
                //do nothing
              }
            }
            });
          /** 
           * Training
           */

          if ( (ffp == true) && (
            trainingDowTaskNumbers.includes("4.3.1.3") ||
            trainingDowTaskNumbers.includes("4.3.2.1") ||
            trainingDowTaskNumbers.includes("4.3.3.3") )
          ) {
              trainingClinNumbers.push("x002");
          }
          else if((timeMaterial == true) && (
            trainingDowTaskNumbers.includes("4.3.1.3") ||
            trainingDowTaskNumbers.includes("4.3.2.1") ||
            trainingDowTaskNumbers.includes("4.3.3.3") )){
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
          if ( (ffp == true) && (
            portabilityPlanTaskNumbers.includes("4.3.1.3") ||
            portabilityPlanTaskNumbers.includes("4.3.2.1") ||
            portabilityPlanTaskNumbers.includes("4.3.3.3") )
          ) {
              portabilityClinNumbers.push("x002");
          }
          else if((timeMaterial == true) && (
            portabilityPlanTaskNumbers.includes("4.3.1.3") ||
            portabilityPlanTaskNumbers.includes("4.3.2.1") ||
            portabilityPlanTaskNumbers.includes("4.3.3.3") )){
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
          if((ffp==true) && (check4IL2 > 0 || check4IL4 > 0 || check4IL5 > 0) ){
            monthlyClinNumbers += "x001"
          }
          if((ffp==true) && check4IL6 > 0){
            monthlyClinNumbers += "x003"
          }
          if((timeMaterial == true) && (check4IL2 > 0 || check4IL4 > 0 || check4IL5 > 0)){
            monthlyClinNumbers += "x017"
          }
          if(timeMaterial == true && check4IL6 > 0){
            monthlyClinNumbers += "x019"
          }
          /**
           * Tactical Edge Device Specifications
           */
          
            if(il2EdgeCount >= 1){
              teDeviceTaskNumbers.push("4.2.1.9");
            } 
            if(il4EdgeCount >= 1){
              teDeviceTaskNumbers.push("4.2.2.9");
            } 
            if(il5EdgeCount >= 1){
              teDeviceTaskNumbers.push("4.2.3.9")
            }
            if(il6EdgeCount >= 1){
              teDeviceTaskNumbers.push("4.2.4.9")
            }

            if((ffp == true) && (teDeviceTaskNumbers.includes("4.2.1.9") || teDeviceTaskNumbers.includes("4.2.2.9")
             || teDeviceTaskNumbers.includes("4.2.3.9"))){
              teDeviceClinNumbers.push("x001")
             }
             if((timeMaterial == true) && (teDeviceTaskNumbers.includes("4.2.1.9") || teDeviceTaskNumbers.includes("4.2.2.9")
             || teDeviceTaskNumbers.includes("4.2.3.9"))){
              teDeviceClinNumbers.push("x017")
             }
             if(ffp == true && teDeviceTaskNumbers.includes("4.2.4.9")){
              teDeviceClinNumbers.push("x003")
             }
             if(timeMaterial == true && teDeviceTaskNumbers.includes("4.2.4.9")){
              teDeviceClinNumbers.push("x019")
             }


          if(trainingDowTaskNumbers.length != 0){
            let obj = {
              dowTaskNumbers: trainingDowTaskNumbers.toString(),
              clinNumbers: trainingClinNumbers.toString(),
              cdrl: {
                code: "*A004",
                name: "System Administrator Training Materials",
              },
            }
            data.push(obj);
            let obj2 = {
              dowTaskNumbers: trainingDowTaskNumbers.toString(),
              clinNumbers: trainingClinNumbers.toString(),
              cdrl: {
                code: "*A005",
                name: "Role-Based User Training Materials",
              },
            }
            data.push(obj2)
          }
          if(portabilityPlanTaskNumbers.length != 0){
            let obj =    {
              dowTaskNumbers: portabilityPlanTaskNumbers.toString(),
              clinNumbers: portabilityClinNumbers.toString(),
              cdrl: {
                code: "**A006",
                name: "Portability Plan"
              }
             }
             data.push(obj);
          }
          if(monthlyClinNumbers.length >0){
            let obj = {
              dowTaskNumbers: "ANY",
              clinNumbers: monthlyClinNumbers,
              cdrl: {
                code: "A012",
                name: "TO Monthly Progress Report"
              }
            }
            data.push(obj);
          }
          if(teDeviceClinNumbers.length > 0){
            let obj = {
              dowTaskNumbers: teDeviceTaskNumbers.toString(),
              clinNumbers: teDeviceClinNumbers.toString(),
              cdrl: {
                code: "***A017",
                name: "TE Device Specifications"
              }
            }
            data.push(obj)
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
          let numInstances = {
            dev: 0,
            preProd: 0,
            prod: 0,
            coop: 0,
          };
          console.log(numInstances);
          templatePayload.xaasOfferings.forEach((offering:any)=> { 
            if(offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.COMPUTE)
            {
              offering.instanceConfigurations.forEach((instance:any)=> {
                if(instance.classificationLevel.impactLevel === impactLevel){
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
              })
            }
        });
          return numInstances;
        },
        getComputeInstances: (impactLevel:any) => {
          let computeInstances:any = [];
          templatePayload.xaasOfferings.forEach((offering:any) => {
            if(offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.COMPUTE){
              offering.instanceConfigurations.forEach((instance:any)=> {
                if(instance.classificationLevel.impactLevel === impactLevel){
                  computeInstances.push(instance);
                }
              })
            }
          })
          return computeInstances;
        },
        getNumberDatabaseInstances: (impactLevel: any) => {
          let numInstances = 0;
          templatePayload.xaasOfferings.forEach((offering:any)=> { 
            if(offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.DATABASE)
            {
              offering.instanceConfigurations.forEach((instance:any)=> {
                if(instance.classificationLevel.impactLevel === impactLevel){
                  numInstances += instance.numberOfInstances;
                }
              })
            }
        });
          return numInstances;
        },
        getDatabaseInstances: (impactLevel:any) => {
          let databaseInstances:any = [];
          templatePayload.xaasOfferings.forEach((offering:any) => {
            if(offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.DATABASE){
              offering.instanceConfigurations.forEach((instance:any)=> {
                if(instance.classificationLevel.impactLevel === impactLevel){
                  databaseInstances.push(instance);
                }
              })
            }
          })
          return databaseInstances;
        },
        getStorageInstances: (impactLevel:any) => {
          let storageInstances:any = [];
          templatePayload.xaasOfferings.forEach((offering:any) => {
            if(offering.serviceOffering.serviceOffering.serviceOfferingGroup === dow.ServiceOfferingGroup.STORAGE){
              offering.instanceConfigurations.forEach((instance:any)=> {
                if(instance.classificationLevel.impactLevel === impactLevel){
                  storageInstances.push(instance);
                }
              })
            }
          })
          return storageInstances;
        },
        getStandardInstances: (impactLevel:any, service:any) => {
          
          let tools:any = [];
          templatePayload.xaasOfferings.forEach((offering:any) => {
            offering.serviceOffering.classificationInstances.forEach((classification:any) => {
              if(classification.classificationLevel.impactLevel === impactLevel && offering.serviceOffering.serviceOffering.serviceOfferingGroup === service){
                tools.push(offering.serviceOffering)
              }
            })
          })
          return tools;
        },
        getRegions: (impactLevel:any) => {
          let data: any = [];
          templatePayload.selectedClassificationLevels.forEach((classLevel:any)=> {
            if(classLevel.classificationLevel.impactLevel === impactLevel){
              let regions:any[] = classLevel.usersPerRegion.split(',');
              regions.forEach((region:any)=>{
                let r = JSON.parse(region);
                let zone = Object.keys(r);
                let obj = {
                  region: zone[0],
                  users: r[zone[0]]
                }
                data.push(obj)
              })
            }
          })
          return data;
        },
        getAnticipatedNeeds: (impactLevel:any) => {
          let data:any = [];
          let userGrowthEstimateType:any;
          let userGrowthEstimatePercentage:any = [];
          let dataGrowthEstimateType:any;
          let dataGrowthEstimatePercentage:any = [];
          templatePayload.selectedClassificationLevels.forEach((classLevel:any)=> {
            if(classLevel.classificationLevel.impactLevel === impactLevel){
              let usersIncrease = classLevel.usersIncrease;
              let dataIncrease = classLevel.dataIncrease;
              
              if(usersIncrease == true){
                userGrowthEstimateType = classLevel.userGrowthEstimateType;
                if(classLevel.userGrowthEstimateType === "SINGLE"){
                  console.log("Single", classLevel.userGrowthEstimatePercentage)
                  userGrowthEstimatePercentage[0] = classLevel.userGrowthEstimatePercentage;
                }
                else {
                  for(let i = 0; i < classLevel.userGrowthEstimatePercentage.length; i++){
                    let period;
                    if(i == 0){
                      period = "Base "
                    }
                    else {
                      period = "Option " + i
                    }
                    let obj = {
                      period: period,
                      value: classLevel.userGrowthEstimatePercentage[i]
                    }

                    userGrowthEstimatePercentage.push(obj)
                  }
                }
                let tmp = {
                  usersIncrease: usersIncrease,
                  userGrowthEstimateType: userGrowthEstimateType,
                  userGrowthEstimatePercentage: userGrowthEstimatePercentage
  
                }
                data.push(tmp);
              }
              if(dataIncrease == true){
                if(classLevel.dataGrowthEstimateType === "SINGLE"){
                  dataGrowthEstimatePercentage.push(classLevel.dataGrowthEstimatePercentage)
                }
                else{
                  for(let i = 0; i < classLevel.dataGrowthEstimatePercentage.length; i++){
                    let period;
                    if(i == 0){
                      period = "Base"
                    }
                    else {
                      period = "Option " + i
                    }
                    let obj = {
                      period: period,
                      value: classLevel.dataGrowthEstimatePercentage[i]
                    }
                    dataGrowthEstimatePercentage.push(obj);
                  }
                }

                let tmp = {
                  dataIncrease: dataIncrease,
                  dataGrowthEstimateType: dataGrowthEstimateType,
                  dataGrowthEstimatePercentage: dataGrowthEstimatePercentage
                }
                data.push(tmp)
              }
             
            }
          });
          return data;
        },
        calcAvgDataEgress: () => {
          let gbEgress = 0;
          let pbEgress = 0;
          let tbEgress = 0;
          let response = {
            dataEgressAverage: 0,
            dataEgressMonthlyUnit: dow.StorageUnit.TB,
          };
          templatePayload.selectedClassificationLevels.forEach((classLevel:any) => {
            switch (classLevel.dataEgressMonthlyUnit) {
              case dow.StorageUnit.GB:
                gbEgress += classLevel.dataEgressMonthlyAmount
                break;
              case dow.StorageUnit.TB:
                tbEgress += classLevel.dataEgressMonthlyAmount
                break;
              case dow.StorageUnit.PB:
                pbEgress += classLevel.dataEgressMonthlyAmount
                break;
              default:
                console.error();
            }
          });
          let pbToGB;
          let tbToGB;
          let gbDataEgress;
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
      {
        contractAwardType: dow.ContractAwardType.INITIAL_AWARD,
      },
    ],
    crossDomainSolution: {
      crossDomainSolutionRequired: true,
      //need to parse the string JSON.parse(string)
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
      //used for training ONLY
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL2,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL2,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.TRAINING,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL2,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
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
          impactLevel: dow.ImpactLevel.IL2,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.GENERAL_CLOUD_SUPPORT,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL2,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL4,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL4,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL5,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL5,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL6,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      },
      {
        serviceType: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
        classificationLevel: {
          impactLevel: dow.ImpactLevel.IL6,
        },
        personnelOnsiteAccess: true,
        anticipatedNeedOrUsage: "Anticipated need/usage",
        needForEntireTaskOrderDuration: false, //true
      }
      
    ],
    periodOfPerformance: {
      basePeriod: {
        periodType: dow.PeriodType.BASE,
        periodUnitCount: 12,
        periodUnit: dow.PeriodUnit.MONTH,
        optionOrder: null,
      },
      optionPeriods: [
        {
          periodType: dow.PeriodType.OPTION,
          periodUnitCount: 12,
          periodUnit: dow.PeriodUnit.MONTH,
          optionOrder: 1,
        },
        {
          periodType: dow.PeriodType.OPTION,
          periodUnitCount: 12,
          periodUnit: dow.PeriodUnit.MONTH,
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
      envClassificationsCloud: ["IL2", "IL6"],
      envInstances: [
        {
          //CLOUD
          currentEnvironmentInstance: {
            numberOfInstances: 32,
            classificationLevel: {
              classification: [dow.Classification.S, dow.Classification.U],
              impactLevel: {
                impactLevel: [dow.ImpactLevel.IL4, dow.ImpactLevel.IL4],
              },
              additionalInformation: "Cloud",
            },
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
          },
        },
        {
          currentEnvironmentInstance: {
            numberOfInstances: 8,
            classificationLevel: {
              classification: [dow.Classification.S, dow.Classification.U],
            },
            additionalInformation: "On-Prem",
          },
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
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            },{
            classificationLevel: {
              classification: "U",
              impactLevel: "IL4"
            },
            classifiedInformationTypes: [],
            selectedPeriods: null,
            usageDescription: "Infra upkeep",
            dowTaskNumber: "4.2.1.2"
        },],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.EDGE_COMPUTING,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            },
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL4"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.DEVELOPER_TOOLS,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.APPLICATIONS,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            },
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL4"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.MACHINE_LEARNING,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      // {
      //   //edge computing, dev tools & services, apps, machine learning
      //   //networking, security solutions, IoT
      //   serviceOffering: {
      //     classificationInstances: [
      //       {
      //         classificationLevel: {
      //           classification: "U",
      //           impactLevel: "IL4"
      //         },
      //         classifiedInformationTypes: [],
      //         selectedPeriods: null,
      //         usageDescription: "Infra upkeep",
      //         dowTaskNumber: "4.2.1.2"
      //       }
      //     ],
      //     otherServiceOffering: null,
      //     serviceOffering: { 
      //       name: "Edge Computing",
      //       serviceOfferingGroup: dow.ServiceOfferingGroup.MACHINE_LEARNING,
      //     }
      //   },
      //   //compute, general xaas, database, storage
      //   instanceConfigurations: [],
      // },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.NETWORKING,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.SECURITY,
          }
        },
        //compute, general xaas, database, storage
        instanceConfigurations: [],
      },
      {
        //edge computing, dev tools & services, apps, machine learning
        //networking, security solutions, IoT
        serviceOffering: {
          classificationInstances: [
            {
              classificationLevel: {
                classification: "U",
                impactLevel: "IL2"
              },
              classifiedInformationTypes: [],
              selectedPeriods: null,
              usageDescription: "Infra upkeep",
              dowTaskNumber: "4.2.1.2"
            }
          ],
          otherServiceOffering: null,
          serviceOffering: { 
            name: "Edge Computing",
            serviceOfferingGroup: dow.ServiceOfferingGroup.IOT,
          }
        },
        //compute, general xaas, database, storage
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
            environmentType: "PRE_PROD",
            operatingEnvironment: "VIRTUAL",
          },
        ]
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
            databaseType: dow.DatabaseType.OTHER, //only if type === "OTHER"
            databaseTypeOther: "other type...test",
            databaseLicensing: dow.Licensing.NEW,
            // environmentType: "DEV_TEST",
            // operatingEnvironment: "VIRTUAL",
          },
        ]
      }
      // {
      //   serviceOffering: {
      //     name: "Some service offering",
      //     ServiceOfferingGroup: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
      //   },
      //   instanceConfigurations: {
      //     //storage
      //     environmentInstances: [
      //       {
      //         anticipatedNeedOrUsage: "Please let this be over...",
      //         storageAmount: 250,
      //         storageUnit: dow.StorageUnit.GB,
      //         numberOfInstances: 35,
      //         storageType: dow.StorageType.ARCHIVE,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL4,
      //         },
      //       },
      //     ],
      //     computeInstances: [
      //       {
      //         environmentType: dow.EnvironmentType.DEV_TEST,
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Dev Too",
      //         numberOfInstances: 10,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL2,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         region: [
      //           {
      //             usersPerRegion: 50,
      //             name: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 1000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
      //         selectedClassificationLevels: {
      //           //Anticipated Future needs
      //           usersIncrease: false,
      //           usersGrowthEstimatedPercentage: 14,
      //           usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
      //           dataIncrease: false,
      //           dataGrowthEstimatedPercentage: "12",
      //           dataGrowthEstimateType: dow.GrowthEstimateType.SINGLE,
      //         },
      //       },
      //       {
      //         environmentType: dow.EnvironmentType.PROD_STAGING,
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Prod Prod",
      //         numberOfInstances: 5,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL4,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         deployedRegions: [
      //           {
      //             usersPerRegion: 500,
      //             regions: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 10000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
      //         selectedClassificationLevels: {
      //           //Anticipated Future needs
      //           usersIncrease: true,
      //           usersGrowthEstimatedPercentage: 14,
      //           usersGrowthEstimateType: dow.GrowthEstimateType.SINGLE,
      //           dataIncreate: true,
      //           dataGrowthEstimatedPercentage: "12",
      //           dataGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
      //         },
      //       },
      //       {
      //         environmentType: dow.EnvironmentType.DEV_TEST,
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Dev Too",
      //         numberOfInstances: 10,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL5,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         deployedRegions: [
      //           {
      //             usersPerRegion: 50,
      //             regions: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 1000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
      //         selectedClassificationLevels: {
      //           //Anticipated Future needs
      //           usersIncrease: false,
      //           usersGrowthEstimatedPercentage: 14,
      //           usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
      //           dataIncrease: false,
      //           dataGrowthEstimatedPercentage: "12",
      //           dataGrowthEstimateType: dow.GrowthEstimateType.SINGLE,
      //         },
      //       },
      //     ],
      //     databaseInstances: [
      //       {
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Dev Too",
      //         numberOfInstances: 2,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL2,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         deployedRegions: [
      //           {
      //             usersPerRegion: 500,
      //             regions: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 10000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         databaseType: dow.DatabaseType.GRAPH,
      //         databaseLicensing: dow.Licensing.NEW,
      //       },
      //       {
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Dev Too",
      //         numberOfInstances: 4,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL4,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         deployedRegions: [
      //           {
      //             usersPerRegion: 500,
      //             regions: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 10000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         databaseType: dow.DatabaseType.GRAPH,
      //         databaseLicensing: dow.Licensing.NEW,
      //       },
      //       {
      //         anticipatedNeedOrUsage: "Test String",
      //         osLicensing: dow.Licensing.NEW,
      //         instanceName: "Dev Too",
      //         numberOfInstances: 5,
      //         needForEntierTaskOrderDuration: true,
      //         classificationLevel: {
      //           classification: dow.Classification.U,
      //           impactLevel: dow.ImpactLevel.IL5,
      //         },
      //         instanceLocation: dow.InstanceLocation.CLOUD,
      //         deployedRegions: [
      //           {
      //             usersPerRegion: 500,
      //             regions: dow.Region.CONUS,
      //           },
      //           {
      //             usersPerRegion: 10000,
      //             regions: dow.Region.CONUS,
      //           },
      //         ],
      //         performanceTier: dow.PerformanceTier.COMPUTE,
      //         pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
      //         pricingModelExpiration: "2023-06-24", //TODO add in date formatting
      //         licensing: "OSS License",
      //         operatingSystem: "Kali Linux",
      //         numberOfvCPUs: 10,
      //         processorSpeed: 4.7,
      //         storageType: dow.StorageType.BLOCK,
      //         storageAmount: 500,
      //         storageUnit: dow.StorageUnit.TB,
      //         memoryAmount: 256,
      //         memoryUnit: dow.StorageUnit.GB,
      //         dataEgressMonthlyAmount: 275,
      //         dataEgressMonthlyUnit: dow.StorageUnit.TB,
      //         databaseType: dow.DatabaseType.GRAPH,
      //         databaseLicensing: dow.Licensing.NEW,
      //       },
      //     ],
      //   },
      // },
      // {},
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
        userGrowthEstimatePercentage: ["346","-10"],
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

handler(body);
