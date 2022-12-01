export const sampleDowRequest = {
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
    toTitle: "AT-7394 package",
    scope: "Package used for AT-7394 for testing purposes.",
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

export const sampleIgceRequest = {
  documentType: "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
  templatePayload: {
    surgeCapabilities: 34,
    fundingDocument: {
      fundingType: "FS_FORM",
      orderNumber: "O2206-097-097-184790",
      gtcNumber: "A2201-097-097-18092",
    },
    periodsEstimate: [
      {
        period: { periodUnit: "YEAR", periodUnitCount: "1", periodType: "BASE", optionOrder: "" },
        periodLineItems: [
          {
            clin: "3000",
            idiqClin: "3000 Cloud Support UNCLASSIFIED",
            dowTaskNumber: "4.2.2.1",
            serviceOffering: "Cloud Audit/Monitoring Tools",
            itemDescriptionOrConfigSummary: "Monitoring network data",
            monthlyPrice: 394.38,
            monthsInPeriod: 36,
          },
          {
            clin: "2000",
            idiqClin: "2000 Cloud SECRET",
            dowTaskNumber: "4.2.2.2",
            serviceOffering: "Special custom built app - not SNOW",
            itemDescriptionOrConfigSummary: "To handle special cases that can not be done in SNOW",
            monthlyPrice: 799.0,
            monthsInPeriod: 36,
          },
          {
            clin: "1000",
            idiqClin: "1000 Cloud UNCLASSIFIED ",
            dowTaskNumber: "4.2.2.3",
            serviceOffering: "Application",
            itemDescriptionOrConfigSummary: "Staging App",
            monthlyPrice: 1200.0,
            monthsInPeriod: 36,
          },
          {
            clin: "1000",
            idiqClin: "1000 Cloud UNCLASSIFIED ",
            dowTaskNumber: "4.2.2.4",
            serviceOffering: "Application",
            itemDescriptionOrConfigSummary: "Basic App ",
            monthlyPrice: 1200.0,
            monthsInPeriod: 36,
          },
        ],
      },
      {
        period: { periodUnit: "WEEK", periodUnitCount: 12, periodType: "OPTION", optionOrder: 2 },
        periodLineItems: [
          {
            clin: "3002",
            idiqClin: "3000 Cloud Support UNCLASSIFIED",
            dowTaskNumber: "4.2.2.5",
            serviceOffering: "Cloud Audit/Monitoring Tools",
            itemDescriptionOrConfigSummary: "Monitoring network data",
            monthlyPrice: 394.38,
            monthsInPeriod: 36,
          },
          {
            clin: "2002",
            idiqClin: "2000 Cloud SECRET",
            dowTaskNumber: "4.2.2.6",
            serviceOffering: "Special custom built app - not SNOW",
            itemDescriptionOrConfigSummary: "To handle special cases that can not be done in SNOW",
            monthlyPrice: 799.0,
            monthsInPeriod: 36,
          },
          {
            clin: "1002",
            idiqClin: "1000 Cloud UNCLASSIFIED ",
            dowTaskNumber: "4.2.2.7",
            serviceOffering: "Application",
            itemDescriptionOrConfigSummary: "Basic App ",
            monthlyPrice: 1200.0,
            monthsInPeriod: 36,
          },
        ],
      },
    ],
  },
};

export const sampleIfpRequest = {
  documentType: "INCREMENTAL_FUNDING_PLAN",
  templatePayload: {
    requirementsTitle: "Versatile Demo Package",
    missionOwner: "Jewel Heart",
    financialPoc: "Ester Crest",
    estimatedTaskOrderValue: 125000.55,
    initialAmount: 50000.55,
    remainingAmount: 75000,
    fundingDocument: { fundingType: "FS_FORM", gtcNumber: "234234", orderNumber: "O-23434-34234" },
    fundingIncrements: [
      { amount: 25000, description: "2nd QTR FY23", order: 1 },
      { amount: 50000, description: "3rd QTR FY23", order: 2 },
    ],
    scheduleText: "Funding Increment #1:\n2nd QTR FY23 - $25,000.00\nFunding Increment #2:\n3rd QTR FY23 - $50,000.00",
    contractNumber: "TBD",
    taskOrderNumber: "TBD",
  },
};

export const fundingDocumentWithMiprNumber = {
  fundingType: "MIPR",
  miprNumber: "M2206-07-077-458790",
};
