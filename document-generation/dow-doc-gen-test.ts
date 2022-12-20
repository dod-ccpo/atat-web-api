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
        checkXaaSClassifications: () => {

        },
        sumTotalInstances: () => {
          let number = 0;
          for(let i = 0; i<templatePayload.currentEnvironment.envInstances.length; i++){
            number += templatePayload.currentEnvironment.envInstances[i].currentEnvironmentInstance.numberOfInstances
          }
          return number;
        },
        filterCloudSupport: (cloudSupportPackage:any) => {

          let impactLevel2:any = [];
          let impactLevel4:any = []; 
          let impactLevel5:any = []; 
          let impactLevel6:any = [];
          //iterate over Cloud Support Package
          cloudSupportPackage.instanceConfigurations.forEach((plan:any) => {
            plan.portabilityPlan.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
            plan.advisoryAndAssistance.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
            plan.helpDesk.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
            plan.training.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
            plan.docSupport.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
            plan.generalXaaS.forEach((item:any) => {
              switch(item.classificationLevel.impactLevel.impactLevel){
                      case dow.ImpactLevel.IL2:
                        impactLevel2.push(item);
                        break;
                      case dow.ImpactLevel.IL4:
                        impactLevel4.push(item);
                        break;
                      case dow.ImpactLevel.IL5:
                        impactLevel5.push(item);
                        break;
                      default:
                        impactLevel6.push(item);
                    }
            })
          })
          let data = {
            il2: impactLevel2,
            il4: impactLevel4,
            il5: impactLevel5,
            il6: impactLevel6
          }
          console.log(data);
          return data;
          },
        //fully implemented
        checkForCloudSupport: () => {
          if(templatePayload.cloudSupportPackage.length > 0){
            return "Yes"
          }
          else {
            return "No"
          }
        },
        getComputeInstances: (impactLevel:any) => {
          let numInstances = {
            dev: 0,
            preProd: 0,
            prod: 0,
            coop: 0
          }
          //need to filter on IL level...
          templatePayload.xaasOfferings.instanceConfigurations.computeInstances.forEach((instance:any) => {
            if(instance.classificationLevel.impactLevel === impactLevel){
            switch(instance.environmentType){
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
        return numInstances;
      },
      getDatabaseInstances: () => {
        let numInstances = {
          IL2: 0,
          IL4: 0,
          IL5: 0,
          IL6: 0
        }
        //let base = "instance.classificationLevel." + impactLevel
        templatePayload.xaasOfferings.instanceConfigurations.databaseInstances.forEach((instance:any) => {
          switch(instance.classificationLevel.impactLevel){
            case dow.ImpactLevel.IL2:
              numInstances.IL2 += instance.numberOfInstances;
              break;
            case dow.ImpactLevel.IL4:
              numInstances.IL4 += instance.numberOfInstances;
              break;
            case dow.ImpactLevel.IL5:
              numInstances.IL5 += instance.numberOfInstances;
              break;
            default:
              numInstances.IL6 += instance.numberOfInstances;
          }
      })
      return numInstances;
    },
        calcAvgDataEgress: () => {
          let gbEgress = 0;
          let pbEgress = 0;
          let tbEgress = 0;
          let response = {
            dataEgressAverage: 0,
            dataEgressMonthlyUnit: dow.StorageUnit.TB
          }
          templatePayload.xaasOfferings.instanceConfigurations.computeInstances.forEach((instance:any) => {
            switch(instance.dataEgressMonthlyUnit){
              case dow.StorageUnit.GB:
                gbEgress += (instance.dataEgressMonthlyAmount * instance.numberOfInstances);
                break;
              case dow.StorageUnit.TB:
                tbEgress += (instance.dataEgressMonthlyAmount * instance.numberOfInstances);
                break;
              case dow.StorageUnit.PB:
                pbEgress += (instance.dataEgressMonthlyAmount * instance.numberOfInstances);
                break;
              default:
                console.error()
                
            }
          })
          let pbToGB;
          let tbToGB;
          let gbDataEgress;
            if(isNaN(gbEgress)){
              gbEgress = 0;
            }
            if(isNaN(pbEgress)){
              pbEgress = 0;
            }
            if(isNaN(tbEgress)){
              tbEgress = 0;
            }
            pbToGB = pbEgress * 1000000;
            tbToGB = tbEgress * 1000;
            gbDataEgress = gbEgress + pbToGB + tbToGB;
            if(gbDataEgress / 1000000 > 1){
              response.dataEgressAverage = gbDataEgress / 1000000;
              response.dataEgressMonthlyUnit = dow.StorageUnit.PB;
              return response;
            }
            else if(gbDataEgress / 1000 > 1){
              response.dataEgressAverage = gbDataEgress / 1000;
              response.dataEgressMonthlyUnit = dow.StorageUnit.TB
              return response;
            }
            else{
              response.dataEgressAverage = gbDataEgress;
              response.dataEgressMonthlyUnit = dow.StorageUnit.GB
              return response;
            }
        },
        calcDevTestInstances: () => {
          /*for(let i = 0; i < dow.XaasServiceOfferingGroup.length; i ++){

          }*/
        }
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
      previousTaskOrderNumber: ""
    },
    awardHistory: [{
      contractAwardType: dow.ContractAwardType.INITIAL_AWARD
    }],
    crossDomainSolution: {
      crossDomainSolutionRequired: true,
      trafficPerDomainPair: [{
        name: "U_TO_S",
        dataQuantity: 500
      },
      {
        name: "S_TO_U",
        dataQuantity: 50,
      }
    ],
      projectedFileStreamType: "xml",
      anticipatedNeedOrUsage: "Unknown",
    },

    //WIP
    cloudSupportPackage: {
      serviceOffering: {

      },
      instanceConfigurations: [{
        // environmentInstance: {

        // },
        // computeInstance: {

        // },
        // databaseInstance: {

        // },
        portabilityPlan:[{
          cloudServiceOffering: dow.ServiceOfferingGroup.PORTABILITY_PLAN,
          classificationInstances: [{
            dowTaskNumber: "ABC123",
          }],
          otherServiceOffering: "Something?",
          //refactor
          durationOfTaskOrder: true,
          statementOfObjectives: " Something else ",
          cspOnSiteAccess: true,
          classificationLevel: { 
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL2
            },
        },
        planRequired: true,
      }],
        advisoryAndAssistance: [{
          cloudServiceOffering: dow.ServiceOfferingGroup.ADVISORY_ASSISTANCE,
          cspOnSiteAccess: true,
          statementOfObjectives: "Some statement",
          classificationLevel: { 
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL2
            },
        }
        }],
        helpDesk: [{
          classificationLevel: { 
            cloudServiceOffering: dow.ServiceOfferingGroup.HELP_DESK_SERVICES,
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL2
            },
        },
      }],
        training: [{
          cloudServiceOffering: dow.ServiceOfferingGroup.TRAINING,
          classificationLevel: { 
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL2
            },
          },
            canTrainInUnclassEnv: true,
            trainingLocation: "DC",
            trainingRequirementTitle: "NetHunter",
            trainingTimeZone: "EST",
            personnelOnsiteAccess: false,
            trainingFacilityType: dow.FacilityType.NON_GOVERNMENT_FACILITY,
            trainingFormat: dow.TrainingFormat.VIRTUAL_INSTRUCTOR,
            personnelRequiringTraining: 25,
            statementOfObjectives: "Some statement"
        
      }],
        docSupport: [{
          classificationLevel: { 
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL4
            },
        },
      }],
        generalXaaS: [{
          classificationLevel: { 
            impactLevel: {
              impactLevel: dow.ImpactLevel.IL4
            },
        }
      }]
    }],
    },
    periodOfPerformance: {
      basePeriod: {
        periodType: dow.PeriodType.BASE,
        periodUnitCount: 12,
        periodUnit: dow.PeriodUnit.MONTH,
        optionOrder: null
      },
      optionPeriods: [{
        periodType: dow.PeriodType.OPTION,
        periodUnitCount: 12,
        periodUnit: dow.PeriodUnit.MONTH,
        optionOrder: 1
      },
    {
      periodType: dow.PeriodType.OPTION,
      periodUnitCount: 12,
      periodUnit: dow.PeriodUnit.MONTH,
      optionOrder: 2
    }],
      popStartRequest: false,
      requestedPopStartDate: null,
      recurringRequirement: false
    },
    currentEnvironment: {
      currentEnvironmentExists: true,
      hasSystemDocumentation: true,
      hasMigrationDocumentation: false,
      envLocation: dow.EnvironmentLocation.HYBRID,
      envClassificationsCloud: ["IL2","IL6"],
      envInstances: [{
        //CLOUD
        currentEnvironmentInstance: {
          numberOfInstances: 32,
          classificationLevel: { 
            classification: [dow.Classification.S, dow.Classification.U],
            impactLevel: {
              impactLevel: [dow.ImpactLevel.IL4, dow.ImpactLevel.IL4]
            },
            additionalInformation: "Cloud"
          },
          currentUsageDescription: dow.UsageDescription.IRREGULAR_USAGE,
          isTrafficSpikeEventBased: true,
          trafficSpikeEventDescription: "Santa",
          isTrafficSpikePeriodBased: true,
          trafficSpikePeriodDescription: "Holidays",
          deployedRegions: [{
            usersPerRegion: 500,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 10000,
            regions: [dow.Region.CENTCOM]
          }],
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
        }
      },
      {
        currentEnvironmentInstance: {
          numberOfInstances: 8,
          classificationLevel: {
            classification: [dow.Classification.S, dow.Classification.U],
          },
          additionalInformation: "On-Prem"
        },
        currentUsageDescription: dow.UsageDescription.EVEN_USAGE,
        deployedRegions: [{
          usersPerRegion: 250,
          regions: [dow.Region.SOUTHCOM]
        },
        {
          usersPerRegion: 300,
          regions: [dow.Region.EUCOM]
        }
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
        instanceLocation: "On-Prem"
      }
    ],
    currentEnvironmentReplicatedOptimized: "No",
    anticipatedYearlyAdditionalCapacity: 15,
    hasPhasedApproach: true,
    phasedApproachSchedule: "Sample Phased Approach Schedule",
    needsarchitecturalDesignRequirements: "Yes",
    architecturalDesignRequirement: [{
      applicationNeedingDesign: "Test 1",
      statement: "Statement 1",
      externalFactors: "Ex Factors 1",
      dataClassificationLevels:  { 
        classification: [dow.Classification.S],
        impactLevel: {
          impactLevel: [dow.ImpactLevel.IL5]
        }
      }
    },
    {
      applicationNeedingDesign: "Test 2",
      statement: "Statement 2",
      externalFactors: "Ex Factors 2",
      dataClassificationLevels:  { 
        classification: [dow.Classification.U],
        impactLevel: {
          impactLevel: [dow.ImpactLevel.IL4]
        }
      }
    }
  ],
    },
    xaasOfferings: {
       //All basic Subtasks for DOW (i.e Name/Description)
      xaasServiceOffering: {
        application: [{
          name: "Some App",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        developerTools: [{
          name: "Some Dev Tool",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        },{          
          name: "Some Dev Tool - Too",
        description: "Sample App",
        period: {
          periodType: dow.PeriodType.BASE,
          periodUnitCount: "12",
          periodUnit: dow.PeriodUnit.MONTH,
          optionOrder:  "1"
        },
        classificationLevel: {
          classification: dow.Classification.U,
          impactLevel: dow.ImpactLevel.IL4
        }}],
        edgeComputing: [{
          name: "Some Edge Comp",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        generalXaaS: [{
          name: "Some generalXaaS",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        iot: [{
          name: "Some IOT",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        machineLearning: [{
          name: "Some Machine Learning",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        networking: [{
          name: "Some Networking",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        security: [{
          name: "Some Security",
          description: "Sample App",
          period: {
            periodType: dow.PeriodType.BASE,
            periodUnitCount: "12",
            periodUnit: dow.PeriodUnit.MONTH,
            optionOrder:  "1"
          },
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }]
      },
      instanceConfigurations: {
        //storage
        environmentInstances: [{
          anticipatedNeedOrUsage: "Please let this be over...",
          storageAmount: 250,
          storageUnit: dow.StorageUnit.GB,
          numberOfInstances: 35,
          storageType: dow.StorageType.ARCHIVE,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          }
        }],
        computeInstances: [ 
          {
          environmentType: dow.EnvironmentType.DEV_TEST,
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Dev Too",
          numberOfInstances: 10,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL2
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 50,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 1000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
          selectedClassificationLevels: {
            //Anticipated Future needs
            usersIncrease: false,
            usersGrowthEstimatedPercentage: 14,
            usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
            dataIncrease: false,
            dataGrowthEstimatedPercentage: "12",
            dataGrowthEstimateType: dow.GrowthEstimateType.SINGLE
          }
        },
        {
          environmentType: dow.EnvironmentType.PROD_STAGING,
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Prod Prod",
          numberOfInstances: 5,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 500,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 10000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
          selectedClassificationLevels: {
            //Anticipated Future needs
            usersIncrease: true,
            usersGrowthEstimatedPercentage: 14,
            usersGrowthEstimateType: dow.GrowthEstimateType.SINGLE,
            dataIncreate: true,
            dataGrowthEstimatedPercentage: "12",
            dataGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE
          }
        },
        {
          environmentType: dow.EnvironmentType.DEV_TEST,
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Dev Too",
          numberOfInstances: 10,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL5
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 50,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 1000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
          selectedClassificationLevels: {
            //Anticipated Future needs
            usersIncrease: false,
            usersGrowthEstimatedPercentage: 14,
            usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
            dataIncrease: false,
            dataGrowthEstimatedPercentage: "12",
            dataGrowthEstimateType: dow.GrowthEstimateType.SINGLE
          },
        },

      ],
        databaseInstances: [{
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Dev Too",
          numberOfInstances: 2,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL2
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 500,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 10000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          databaseType: dow.DatabaseType.GRAPH, 
          databaseLicensing: dow.Licensing.NEW 
        },
        {
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Dev Too",
          numberOfInstances: 4,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL4
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 500,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 10000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          databaseType: dow.DatabaseType.GRAPH,
          databaseLicensing: dow.Licensing.NEW
        },        
        {
          anticipatedNeedOrUsage: "Test String",
          osLicensing: dow.Licensing.NEW,
          instanceName: "Dev Too",
          numberOfInstances: 5,
          needForEntierTaskOrderDuration: true,
          classificationLevel: {
            classification: dow.Classification.U,
            impactLevel: dow.ImpactLevel.IL5
          },
          instanceLocation: dow.InstanceLocation.CLOUD,
          deployedRegions: [{
            usersPerRegion: 500,
            regions: [dow.Region.CENTCOM],
          },
          {
            usersPerRegion: 10000,
            regions: [dow.Region.CENTCOM]
          }],
          performanceTier: dow.PerformanceTier.COMPUTE,
          pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
          pricingModelExpiration: "2023-06-24", //TODO add in date formatting
          licensing: "OSS License",
          operatingSystem: "Kali Linux",
          numberOfvCPUs: 10,
          processorSpeed: 4.7,
          storageType: dow.StorageType.BLOCK,
          storageAmount: 500,
          storageUnit: dow.StorageUnit.TB,
          memoryAmount: 256,
          memoryUnit: dow.StorageUnit.GB,
          dataEgressMonthlyAmount: 275,
          dataEgressMonthlyUnit: dow.StorageUnit.TB,
          databaseType: dow.DatabaseType.GRAPH,
          databaseLicensing: dow.Licensing.NEW
        },
      ],
      }
    },
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
    sensitiveInformation: { section508Sufficient: true, accessibilityReqs508: "Some requirments for section 508." },
  }

};

handler(body);
