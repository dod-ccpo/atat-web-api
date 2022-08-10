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
    funding_document: {
      funding_type: "FS_FORM",
      gtc_number: "1234",
      order_number: "1234",
      mipr_number: "1234",
    },
    surge_capabilities: 5,
    periods_estimate: [
      {
        period: {
          period_unit: "YEAR",
          period_unit_count: "1",
          period_type: "BASE",
          option_order: null,
        },
        period_line_items: [
          {
            clin: "0001",
            idiq_clin: "1000_CLOUD",
            dow_task_number: "4.2.1.1",
            service_offering: "Compute",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
          {
            clin: "0002",
            idiq_clin: "2000_CLOUD_SUPPORT",
            dow_task_number: "4.2.1.2",
            service_offering: "Applications",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
          {
            clin: "0003",
            idiq_clin: "3000_OTHER",
            dow_task_number: "4.2.1.3",
            service_offering: "Database",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
        ],
      },
    ],
  },
};
