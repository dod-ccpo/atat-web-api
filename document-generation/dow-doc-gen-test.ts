import createReport from "docx-templates";
import fs from "fs";
import * as path from "path";
import juice, { ignoredPseudos } from "juice";
import * as dow from "../models/document-generation/description-of-work";
// import PizZip from "pizzip";
// import DocxTemplater from "docxtemplater";

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
      //coming back to this one... need to finish the dow
      //TODO FIX THE CALCULATION
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
        // add commas to amounts
        // estimatedTaskOrderValue: templatePayload.estimatedTaskOrderValue.toLocaleString("en-US"),
        // initialAmount: templatePayload.initialAmount.toLocaleString("en-US"),
        // remainingAmount: templatePayload.remainingAmount.toLocaleString("en-US"),
        // getDocInfo: () => {
        //   const fundingDoc = templatePayload.fundingDocument;
        //   const docType = fundingDoc.fundingType;
        //   if (docType === "MIPR") {
        //     return `MIPR #: ${fundingDoc.miprNumber}`;
        //   }
        //   return `GT&C #: ${fundingDoc.gtcNumber} and Order #: ${fundingDoc.orderNumber}`;
        // },
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
      trafficPerDomainPair: "50",
      projectedFileStreamType: "xml",
      anticipatedNeedOrUsage: "Unknown",
    },

    //WIP
    cloudSupportPackage: {
      serviceOffering: {

      },
      instanceConfigurations: [{
        environmentInstance: {

        },
        computeInstance: {

        },
        databaseInstance: {

        },
        portabilityPlan:{
          cloudServiceOffering: dow.ServiceOfferingGroup.PORTABILITY_PLAN,
          classificationInstances: [{
            dowTaskNumber: "ABC123",
          }],
          otherServiceOffering: "Something?",
          durationOfTaskOrder: true,
          statementOfObjectives: " Something else ",
          cspOnSiteAccess: true,
          classificationLevel: { 
            classification: [dow.Classification.S, dow.Classification.U],
            impactLevel: {
              impactLevel: [dow.ImpactLevel.IL2, dow.ImpactLevel.IL4]
            },
        },
      },
        advisoryAndAssistance: {
          classificationLevel: {
            classification: [dow.ImpactLevel.IL4, dow.ImpactLevel.IL6]
          },
          cspOnSiteAccess: false,
          statementOfObjective: "Shouldn't print"
        },
        helpDesk: {

        },
        training: {

        },
        docSupport: {

        },
        generalXaaS: {

        }
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
              impactLevel: [dow.ImpactLevel.IL2, dow.ImpactLevel.IL4]
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
      //{EXEC IL2Compute = xaasOfferings.computeInstances} 4.2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
          impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
            impactLevel: dow.ImpactLevel.IL2
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
          operatingEnvironment: dow.OperatingEnvironment.SERVERLESS, //STRINGIFY IT
          selectedClassificationLevels: {
            //Anticipated Future needs
            usersIncrease: true,
            usersGrowthEstimatedPercentage: 14,
            usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
            dataIncreate: true,
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
          operatingEnvironment: dow.OperatingEnvironment.SERVERLESS,
          selectedClassificationLevels: {
            //Anticipated Future needs
            usersIncrease: true,
            usersGrowthEstimatedPercentage: 14,
            usersGrowthEstimateType: dow.GrowthEstimateType.MULTIPLE,
            dataIncreate: true,
            dataGrowthEstimatedPercentage: "12",
            dataGrowthEstimateType: dow.GrowthEstimateType.SINGLE
          }
        },
        // {
        //   //should not be in IL2
        //   environmentType: dow.EnvironmentType.PROD_STAGING,
        //   anticipatedNeedOrUsage: "Test String",
        //   osLicensing: dow.Licensing.NEW,
        //   instanceName: "Prod Prod",
        //   numberOfInstances: 5,
        //   needForEntierTaskOrderDuration: true,
        //   classificationLevel: {
        //     classification: dow.Classification.U,
        //     impactLevel: dow.ImpactLevel.IL4
        //   },
        //   instanceLocation: dow.InstanceLocation.CLOUD,
        //   region: dow.Region.CONUS,
        //   performanceTier: dow.PerformanceTier.COMPUTE,
        //   pricingModel: dow.PricingModel.PAY_AS_YOU_GO,
        //   pricingModelExpiration: "2023-06-24", //TODO add in date formatting
        //   licensing: "OSS License",
        //   operatingSystem: "Kali Linux",
        //   numberOfvCPUs: 10,
        //   processorSpeed: 4.7,
        //   storageType: dow.StorageType.BLOCK,
        //   storageAmount: 500,
        //   storageUnit: dow.StorageUnit.TB,
        //   memoryAmount: 256,
        //   memoryUnit: dow.StorageUnit.GB,
        //   dataEgressMonthlyAmount: 275,
        //   dataEgressMonthlyUnit: dow.StorageUnit.TB,
        //   operatingEnvironment: dow.OperatingEnvironment.SERVERLESS 
        // }
      ],
        databaseInstances: [{
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
          numberOfInstances: 10,
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
        }],

      }
    },

  }
    //   requirementsTitle: "Versatile Demo Package",
  //   missionOwner: " Jewel Heart",
  //   estimatedTaskOrderValue: (125000.55).toLocaleString("en-US"),
  //   initialAmount: 50000.55,
  //   remainingAmount: 75000,
  //   // fundingDocument: { fundingType: "MIPR", miprNumber: "234234" },
  //   fundingDocument: { fundingType: "FS_FORM", gtcNumber: "234234", orderNumber: "O-23434-34234" },
  //   requirementAmountIncrements: [
  //     { amount: 25000, description: "2nd QTR FY23", order: 1 },
  //     { amount: 50000, description: "3rd QTR FY23", order: 2 },
  //   ],
  //   scheduleText:
  //     "Funding Increment #1:\n2nd QTR FY23 - $25,000.00\n\nFunding Increment #2:\n3rd QTR FY23 - $50,000.00",
  //   contractNumber: "TBD",
  //   taskOrderNumber: "TBD",
  // },
};

handler(body);
