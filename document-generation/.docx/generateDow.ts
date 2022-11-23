import { logger } from "../../utils/logging";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../../utils/response";
import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import * as fs from "fs";
import * as path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function generateDow(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const payload = event.body.templatePayload;
  /*
  const test_body = {
    documentType: "DESCRIPTION_OF_WORK",
    templatePayload: {
      awardHistory: [
        {
          contractAwardType: "INITIAL_AWARD",
          effectiveDate: "2022-05-20",
          modificationOrder: "",
        },
        {
          contractAwardType: "MODIFICATION",
          modificationOrder: 1,
          effectiveDate: "2022-09-01",
        },
        {
          contractAwardType: "MODIFICATION",
          modificationOrder: 3,
          effectiveDate: "2023-02-01",
        },
      ],
      contractInformation: {
        contractNumber: "1234567890",
        currentContractExists: true,
        contractExpirationDate: "2022-09-30",
        incumbentContractorName: "Morgan Hall",
        previousTaskOrderNumber: "0987654321",
      },
      toTitle: "Log Event",
      scope: "Package AC.",
      scopeSurge: "34",
      currentEnvironment: {
        currentEnvironmentExists: true,
        environmentInstances: [
          {
            instanceName: "Test AT-7394",
            classificationLevel: {
              classification: "U",
              impactLevel: "IL4",
            },
            instanceLocation: "CSP",
            cspRegion: "CSP_A",
            performanceTier: null,
            pricingModel: "PAY_AS_YOU_GO",
            pricingModelExpiration: "2022-11-30",
            operatingSystemLicensing: "Linux  MIT",
            numberOfVcpus: 4,
            storageType: null,
            storageAmount: 30,
            storageUnit: "GB",
            memoryAmount: 32,
            memoryUnit: "GB",
            dataEgressMonthlyAmount: 2,
            dataEgressMonthlyUnit: "GB",
          },
          {
            instanceName: "Another Test instance",
            classificationLevel: {
              classification: "TS",
              impactLevel: null,
            },
            instanceLocation: "HYBRID",
            cspRegion: "CSP_A",
            performanceTier: null,
            pricingModel: "RESERVED",
            pricingModelExpiration: "2023-02-04",
            operatingSystemLicensing: "Arch Linux",
            numberOfVcpus: 12,
            storageType: null,
            storageAmount: 20,
            storageUnit: "TB",
            memoryAmount: 128,
            memoryUnit: "GB",
            dataEgressMonthlyAmount: 40,
            dataEgressMonthlyUnit: "GB",
          },
        ],
        additionalInfo: "Currently NA at the moment",
      },
      selectedServiceOfferings: [
        {
          otherServiceOffering: "N/A",
          serviceOffering: {
            serviceOfferingGroup: "DEVELOPER_TOOLS",
            name: "Cloud Audit/Monitoring Tools",
          },
          classificationInstances: [
            {
              needForEntireTaskOrderDuration: true,
              usageDescription: "Monitoring network data",
              classificationLevel: {
                impactLevel: null,
                classification: "TS",
              },
              selectedPeriods: [],
            },
          ],
        },
        {
          otherServiceOffering: "Special custom built app - not SNOW",
          serviceOffering: {
            name: "Special custom built app - not SNOW",
            serviceOfferingGroup: null,
          },
          classificationInstances: [
            {
              needForEntireTaskOrderDuration: true,
              usageDescription: "To handle special cases that can not be done in SNOW",
              classificationLevel: {
                impactLevel: null,
                classification: "TS",
              },
              selectedPeriods: [],
            },
          ],
        },
        {
          otherServiceOffering: "N/A",
          serviceOffering: {
            serviceOfferingGroup: "APPLICATIONS",
            name: "Application",
          },
          classificationInstances: [
            {
              needForEntireTaskOrderDuration: false,
              usageDescription: "Staging App",
              classificationLevel: {
                impactLevel: "IL4",
                classification: "U",
              },
              selectedPeriods: [
                {
                  periodType: "OPTION",
                  periodUnitCount: 30,
                  periodUnit: "DAY",
                  optionOrder: 4,
                },
                {
                  periodType: "BASE",
                  periodUnitCount: "1",
                  periodUnit: "YEAR",
                  optionOrder: null,
                },
              ],
            },
            {
              needForEntireTaskOrderDuration: null,
              usageDescription: "Basic App ",
              classificationLevel: {
                impactLevel: "IL4",
                classification: "U",
              },
              selectedPeriods: [
                {
                  periodType: "OPTION",
                  periodUnitCount: 12,
                  periodUnit: "WEEK",
                  optionOrder: 2,
                },
                {
                  periodType: "BASE",
                  periodUnitCount: "1",
                  periodUnit: "YEAR",
                  optionOrder: null,
                },
                {
                  periodType: "OPTION",
                  periodUnitCount: 30,
                  periodUnit: "DAY",
                  optionOrder: 4,
                },
                {
                  periodType: "OPTION",
                  periodUnitCount: 3,
                  periodUnit: "MONTH",
                  optionOrder: 1,
                },
              ],
            },
          ],
        },
      ],
      periodOfPerformance: {
        basePeriod: {
          periodUnit: "YEAR",
          periodUnitCount: "1",
          periodType: "BASE",
          optionOrder: null,
        },
        optionPeriods: [
          {
            periodType: "OPTION",
            periodUnitCount: 12,
            periodUnit: "WEEK",
            optionOrder: 2,
          },
          {
            periodType: "OPTION",
            periodUnitCount: 3,
            periodUnit: "MONTH",
            optionOrder: 1,
          },
          {
            periodType: "OPTION",
            periodUnitCount: 30,
            periodUnit: "DAY",
            optionOrder: 4,
          },
        ],
        popStartRequest: true,
        requestedPopStartDate: "2022-09-30",
        timeFrame: "NO_SOONER_THAN",
        recurringRequirement: null,
      },
      gfeOverview: {
        gfeOrGfpFurnished: true,
        propertyAccountable: true,
        dpasUnitId: "888999",
        dpasCustodianNumber: "909090",
        propertyCustodianName: "Jane Smith",
      },
      contractConsiderations: {
        packagingShippingNoneApply: true,
        packagingShippingOther: true,
        packagingShippingOtherExplanation: "N/A",
        potentialConflictOfInterest: false,
        conflictOfInterestExplanation: "None so far.",
        contractorProvidedTransfer: true,
        contractorRequiredTraining: true,
        requiredTrainingServices: ["basic training", "intermediate training", "advanced training"],
      },
      section508AccessibilityStandards: {
        piiPresent: true,
        workToBePerformed: "Investigation of specific individuals",
        systemOfRecordName: "Secret Name",
        FOIACityApoFpo: "Crystal",
        FOIACountry: "United States of America",
        FOIAStreetAddress1: "973 Inspector Rd",
        FOIAStreetAddress2: "",
        FOIAAddressType: "US",
        FOIAZipPostalCode: "22222",
        FOIAStateProvinceCode: "VA",
        FOIAFullName: "Alice Wonder",
        FOIAEmail: "alice@ccpo.mil",
        BAARequired: false,
        potentialToBeHarmful: false,
        section508Sufficient: null,
        accessibilityReqs508: "Some requirements for 508.",
      },
    },
  };
  */
  // const test_payload = test_body.templatePayload;

  // Load the docx file as binary content
  const content = fs.readFileSync(path.resolve(__dirname, "dow.docx"), "binary");
  const zip = new PizZip(content);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  document.render(payload);
  // document.render(test_payload);

  // Create Node JS Buffer to send as response
  const report = document.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  // Write file locally (for testing only)
  // fs.writeFileSync(path.resolve(__dirname, "output.docx"), report);

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };
  return new ApiBase64SuccessResponse(report, SuccessStatusCode.OK, headers);
}
