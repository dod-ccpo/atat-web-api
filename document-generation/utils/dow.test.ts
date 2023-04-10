import {
  Classification,
  ImpactLevel,
  ServiceOfferingGroup,
} from "../../models/document-generation/description-of-work";
import {
  formatExpirationDate,
  formatImpactLevel,
  formatRegionUsers,
  formatStorageType,
  getCDRLs,
  getInstancePop,
  getSecurityRequirements,
  getSelectedInstances,
  getTaskPeriods,
  InstancesWithStorageType,
  organizeXaasServices,
  sortInstanceClassificationLevels,
  sortSelectedClassificationLevels,
  sortSelectedServicesByGroups,
  sortSupportPackagesByGroups,
  sortSupportPackagesByLevels,
} from "./dow";
import { sampleDowRequest } from "./sampleTestData";

describe("Formatting Utils", () => {
  it("formatStorageType - compute env", async () => {
    const envInstance = sampleDowRequest.templatePayload.xaasOfferings.computeInstances[0];
    const formattedStorageType = formatStorageType(envInstance as InstancesWithStorageType);
    const expectedFormat = "Compute Storage: 500 GB";
    expect(formattedStorageType).toBe(expectedFormat);
  });
  it.each([undefined, null, ""])("formatStorageType - '%s'", async (instance) => {
    // const envInstance = sampleDowRequest.templatePayload.xaasOfferings.computeInstances[0];
    const formattedStorageType = formatStorageType(instance as unknown as InstancesWithStorageType);
    const expectedFormat = "N/A";
    expect(formattedStorageType).toBe(expectedFormat);
  });

  it.each(["2023-02-28", "Feb. 28, 2023", "2023-02-28 17:45:08"])("formatExpirationDate - '%s'", async (goodDate) => {
    const expirationDate = formatExpirationDate(goodDate);
    const expectedFormat = "2/28/2023";
    expect(expirationDate).toBe(expectedFormat);
  });
  it.each([undefined, null, "", "Exp Date"])("formatExpirationDate - '%s'", async (badDate) => {
    const expirationDate = formatExpirationDate(badDate as string);
    const expectedFormat = "N/A";
    expect(expirationDate).toBe(expectedFormat);
  });

  it("formatImpactLevel", async () => {
    const compute = sampleDowRequest.templatePayload.xaasOfferings.computeInstances[0];
    const expirationDate = formatImpactLevel(compute.classificationLevel.impactLevel);
    const expectedFormat = "Impact Level IL5 (IL5)";
    expect(expirationDate).toBe(expectedFormat);
  });
  it.each([undefined, null, "", "Not an Impact level"])("formatImpactLevel - '%s'", async (badImpactLevel) => {
    const impactLevel = formatImpactLevel(badImpactLevel as string);
    const expectedFormat = "N/A";
    expect(impactLevel).toBe(expectedFormat);
  });

  it("formatRegionUsers", async () => {
    const usersPerRegion = sampleDowRequest.templatePayload.currentEnvironment.envInstances[2].usersPerRegion;
    const formattedUsersPerRegion = formatRegionUsers(usersPerRegion);
    const expectedFormat = ["CONUS Central: 19,238", "AFRICOM: 13,939"];
    expect(formattedUsersPerRegion).toEqual(expectedFormat);
  });
  it.each([undefined, null, "", "String usersPerRegion"])("formatRegionUsers - '%s'", async (badUsersPerRegion) => {
    const formattedUsersPerRegion = formatRegionUsers(badUsersPerRegion as string);
    const expectedFormat: string[] = [];
    expect(formattedUsersPerRegion).toEqual(expectedFormat);
  });
});

describe("Sorting XaaS Services - happy paths", () => {
  it("getSelectedInstances", async () => {
    const selectedServices = sortSelectedServicesByGroups(
      sampleDowRequest.templatePayload.xaasOfferings.selectedServiceInstances
    );
    const selectedInstances = getSelectedInstances(
      ImpactLevel.IL5,
      ServiceOfferingGroup.APPLICATIONS,
      selectedServices
    );
    expect(selectedInstances[0].serviceOfferingGroup).toBe(ServiceOfferingGroup.APPLICATIONS);
    expect(selectedInstances).toHaveLength(3);
  });
  it("sortInstanceClassificationLevels", async () => {
    const computeInstances = sampleDowRequest.templatePayload.xaasOfferings.computeInstances;
    const sortedComputeInstances = sortInstanceClassificationLevels(computeInstances);
    expect(sortedComputeInstances.il2).toHaveLength(1);
    expect(sortedComputeInstances.il4).toHaveLength(0);
    expect(sortedComputeInstances.il5).toHaveLength(1);
    expect(sortedComputeInstances.il6).toHaveLength(1);
    expect(sortedComputeInstances.ts).toHaveLength(0);
  });
  it("sortSelectedClassificationLevels", async () => {
    const selectedClassifications = sampleDowRequest.templatePayload.selectedClassificationLevels;
    const sortedClassificationLevels = sortSelectedClassificationLevels(selectedClassifications);
    expect(sortedClassificationLevels.il2).toBeDefined();
    expect(sortedClassificationLevels.il4).toBeUndefined();
    expect(sortedClassificationLevels.il5).toBeDefined();
    expect(sortedClassificationLevels.il6).toBeDefined();
    expect(sortedClassificationLevels.ts).toBeDefined();
  });
  it("sortSelectedServicesByGroups", async () => {
    const selectedInstances = sampleDowRequest.templatePayload.xaasOfferings.selectedServiceInstances;
    const services = ["APPLICATIONS", "DEVELOPER_TOOLS", "EDGE_COMPUTING"];
    const sortedSelectedInstances = sortSelectedServicesByGroups(selectedInstances);
    const selectedInstanceKeys = Object.keys(sortedSelectedInstances);
    expect(selectedInstanceKeys.length).toBe(3);
    expect(selectedInstanceKeys).toEqual(services);
  });
  it("organizeXaasServices", async () => {
    const xaasServices = sampleDowRequest.templatePayload.xaasOfferings;
    const organizedServices = organizeXaasServices(xaasServices);
    const { computeInstances, databaseInstances, storageInstances, generalInstances, selectedInstances } =
      organizedServices;
    const selectedServiceKeys = Object.keys(selectedInstances);

    // compute instances
    expect(computeInstances.il2).toHaveLength(1);
    expect(computeInstances.il4).toHaveLength(0);
    expect(computeInstances.il5).toHaveLength(1);
    expect(computeInstances.il6).toHaveLength(1);
    expect(computeInstances.ts).toHaveLength(0);
    // database instances
    expect(databaseInstances.il2).toHaveLength(0);
    expect(databaseInstances.il4).toHaveLength(0);
    expect(databaseInstances.il5).toHaveLength(0);
    expect(databaseInstances.il6).toHaveLength(1);
    expect(databaseInstances.ts).toHaveLength(0);
    // storage instances
    expect(storageInstances.il2).toHaveLength(0);
    expect(storageInstances.il4).toHaveLength(0);
    expect(storageInstances.il5).toHaveLength(0);
    expect(storageInstances.il6).toHaveLength(0);
    expect(storageInstances.ts).toHaveLength(0);
    // general instances
    expect(generalInstances.il2).toHaveLength(0);
    expect(generalInstances.il4).toHaveLength(0);
    expect(generalInstances.il5).toHaveLength(0);
    expect(generalInstances.il6).toHaveLength(0);
    expect(generalInstances.ts).toHaveLength(0);
    // number of selected services
    expect(selectedServiceKeys).toHaveLength(3);
  });
});

describe("Sorting XaaS Services - sad path", () => {
  it("sortInstanceClassificationLevels - exclude compute instance if no classification level", async () => {
    const computeInstanceNoClassificationLevel = {
      ...sampleDowRequest.templatePayload.xaasOfferings.computeInstances[0],
      classificationLevel: null,
    };
    const sortedComputeInstancesByLevel = sortInstanceClassificationLevels([computeInstanceNoClassificationLevel]);

    expect(sortedComputeInstancesByLevel).toEqual({ il2: [], il4: [], il5: [], il6: [], ts: [] });
  });
  it("sortSupportPackagesByLevels - exclude support pkg if no classification level", async () => {
    const trainingPackageNoClassificationLevel = {
      ...sampleDowRequest.templatePayload.cloudSupportPackages[0],
      classificationLevel: null,
    };
    const cloudSupportPackages = [trainingPackageNoClassificationLevel];
    const sortedCloudPkgs = sortSupportPackagesByGroups(cloudSupportPackages);
    const sortedCloudPkgsByLevel = sortSupportPackagesByLevels(sortedCloudPkgs);

    expect(sortedCloudPkgsByLevel).toEqual({ TRAINING: { il2: [], il4: [], il5: [], il6: [], ts: [] } });
  });
});

describe("Gather Tasks for PoP", () => {
  it("getTaskPeriods", async () => {
    // An additional training is added to ensure no duplication occurs in cloud support packages
    const extraTraining = {
      ...sampleDowRequest.templatePayload.cloudSupportPackages[0],
      instanceName: "Training #2",
      anticipatedNeedOrUsage: "public training",
      classificationLevel: {
        classification: "U",
        display: "Unclassified - IL4",
        impactLevel: "IL4",
      },
      classifiedInformationTypes: [],
    };
    const payload = {
      ...sampleDowRequest.templatePayload,
      cloudSupportPackages: [...sampleDowRequest.templatePayload.cloudSupportPackages, extraTraining],
    };
    const expectedTaskNumbersLength = 21;
    const expectedTasks = {
      // entireDurationTasks: [], // left out for brevity
      popPeriods: ["B", "OP1", "OP2", "OP3"],
      taskNumberGroups: [
        { dowTaskNumbers: ["4.2.3.1.1"], taskPeriods: ["OP1", "OP2"] },
        { dowTaskNumbers: ["4.2.4.3.3"], taskPeriods: ["OP1", "OP2", "OP3"] },
        { dowTaskNumbers: ["4.2.6"], taskPeriods: ["B", "OP1", "OP2"] },
      ],
    };

    const popTasks = getTaskPeriods(payload);
    expect(popTasks.entireDurationTasks).toHaveLength(expectedTaskNumbersLength);
    expect(popTasks.popPeriods).toEqual(expectedTasks.popPeriods);
    expect(popTasks.taskNumberGroups).toHaveLength(expectedTasks.taskNumberGroups.length);
    expect(popTasks.taskNumberGroups).toEqual(expectedTasks.taskNumberGroups);
  });

  it("getInstancePop - happy path", async () => {
    const computeInstance = sampleDowRequest.templatePayload.xaasOfferings.computeInstances[0];

    const computeInstancesTaskPops = getInstancePop(computeInstance, ServiceOfferingGroup.COMPUTE, 0);
    expect(computeInstancesTaskPops).toEqual({
      dowTaskNumber: "4.2.3.1.1",
      entireDuration: false,
      taskPeriods: ["OP1", "OP2"],
    });
  });
});

describe("getCDRLs", () => {
  it("All rows present", async () => {
    const payload = sampleDowRequest.templatePayload;
    const popTasks = getTaskPeriods(payload);
    const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
    const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
    const allPopTasks = entirePeriodTasks.concat(selectedPeriodTask);
    const expectedCdrls = [
      {
        code: "*A004",
        clins: ["x004", "x006"],
        name: "System Administrator Training Materials",
        taskNumbers: ["4.3.4.3", "4.3.5.3"],
      },
      {
        code: "*A005",
        clins: ["x004", "x006"],
        name: "Role-Based User Training Material",
        taskNumbers: ["4.3.4.3", "4.3.5.3"],
      },
      { code: "A012", clins: ["x001", "x003", "x005"], name: "TO Monthly Progress Report", taskNumbers: ["ANY"] },
      { code: "**A006", clins: ["x001"], name: "Portability Plan", taskNumbers: ["4.3.3"] },
      {
        code: "***A017",
        clins: ["x001", "x003", "x005"],
        name: "TE Device Specifications",
        taskNumbers: ["4.2.1.9", "4.2.4.9", "4.2.5.9"],
      },
    ];

    const cdrls = getCDRLs(allPopTasks, payload.contractType);
    expect(cdrls).toEqual(expectedCdrls);
    expect(cdrls).toHaveLength(expectedCdrls.length);
  });
  it("Only TE and monthly report rows", async () => {
    const payload = sampleDowRequest.templatePayload;
    const popTasks = getTaskPeriods(payload);
    const entirePeriodTasks = popTasks.entireDurationTasks.map((taskNumber: any) => taskNumber);
    const selectedPeriodTask = popTasks.taskNumberGroups.flatMap((group: any) => group.dowTaskNumbers);
    const expectedTaskNumbers = ["4.2.1.9"];
    const allPopTasks = entirePeriodTasks
      .concat(selectedPeriodTask)
      .map((taskNumber: string) => taskNumber.slice(0, 7))
      .filter((taskNumber: any) => expectedTaskNumbers.includes(taskNumber));
    const expectedCdrls = [
      { code: "A012", clins: ["x001"], name: "TO Monthly Progress Report", taskNumbers: ["ANY"] },
      { code: "***A017", clins: ["x001"], name: "TE Device Specifications", taskNumbers: ["4.2.1.9"] },
    ];

    const cdrls = getCDRLs(allPopTasks, payload.contractType);
    expect(cdrls).toEqual(expectedCdrls);
    expect(cdrls).toHaveLength(expectedCdrls.length);
  });
});

describe("securityRequirements", () => {
  it("should have expected summary values", async () => {
    const payload = sampleDowRequest.templatePayload;
    const sr = getSecurityRequirements(payload);
    const expectedClassificationTypes = {
      advisoryAssistance: {
        secret: [
          {
            description: null,
            name: "Restricted Data",
            sequence: 2,
          },
          {
            description: null,
            name: "Formerly Restricted Data",
            sequence: 4,
          },
          {
            description: null,
            name: "Controlled Unclassified Information (CUI)",
            sequence: 11,
          },
        ],
        ts: [],
        tsClearanceLevel: "",
      },
      documentationSupport: {
        secret: [],
        ts: [],
        tsClearanceLevel: "",
      },
      edgeComputing: {
        secret: [
          {
            description: "If CNWDI access is required, then Restricted Data must also be selected.",
            name: "EDGE Computing Classified Info Type - Secret",
            sequence: 3,
          },
        ],
        ts: [
          {
            description: "If CNWDI access is required, then Restricted Data must also be selected.",
            name: "EDGE Computing Classified Info Type - Top Secret",
            sequence: 3,
          },
        ],
        tsClearanceLevel: "TS",
      },
      generalCloudSupport: {
        secret: [],
        ts: [],
        tsClearanceLevel: "",
      },
      helpDesk: {
        secret: [],
        ts: [],
        tsClearanceLevel: "",
      },
      training: {
        secret: [
          {
            description: "If CNWDI access is required, then Restricted Data must also be selected.",
            name: "Critical Nuclear Weapon Design Information (CNWDI)",
            sequence: 3,
          },
        ],
        ts: [
          {
            description: "If CNWDI access is required, then Restricted Data must also be selected.",
            name: "Top Secret info type - cloud support",
            sequence: 3,
          },
        ],
        tsClearanceLevel: "TS",
      },
    };
    expect(sr.classificationTypes).toEqual(expectedClassificationTypes);
  });

  it("should have expected values for aggregate classification calculations", async () => {
    const payload = sampleDowRequest.templatePayload;
    const sr = getSecurityRequirements(payload);
    expect(sr.containsSecretOffering).toBeTruthy();
    expect(sr.containsTopSecretOffering).toBeTruthy();
    expect(sr.hasSecretCloudSupport).toBeTruthy();
    expect(sr.hasTopSecretCloudSupport).toBeTruthy();
  });

  it("should have expected classified information types", async () => {
    const payload = sampleDowRequest.templatePayload;
    const sr = getSecurityRequirements(payload);
    expect(
      sr.secretLevelOfAccess.map((classifiedInfoType: any) => {
        return classifiedInfoType.name;
      })
    ).toEqual([
      "Restricted Data",
      "National Intelligence Information: Non-SCI",
      "North Atlantic Treaty Organization (NATO) Information",
      "Foreign Government Information (FGI)",
    ]);
    expect(
      sr.topSecretLevelOfAccess.map((classifiedInfoType: any) => {
        return classifiedInfoType.name;
      })
    ).toEqual(["A TS level", "Another TS Level"]);
  });

  it("should have expected value for includeArchDesign", async () => {
    const payload = sampleDowRequest.templatePayload;
    const sr = getSecurityRequirements(payload);
    expect(sr.includeSecretArchDesign).toBeTruthy();
    expect(sr.includeTopSecretArchDesign).toBeTruthy();
  });

  it("containsTopSecretOffering should be true if > 1 TS instances", async () => {
    const sr = getSecurityRequirements(sampleDowRequest.templatePayload);
    expect(sr.containsTopSecretOffering).toBeTruthy();
  });

  it("containsTopSecretOffering should be false if no TS instances", async () => {
    const payload: any = sampleDowRequest.templatePayload;
    // Remove TS instances from test data
    payload.xaasOfferings.selectedServiceInstances = payload.xaasOfferings.selectedServiceInstances.filter(
      (selectedServiceInstance: any) => {
        return !selectedServiceInstance.classificationInstances
          .map((classificationInstance: any) => {
            return classificationInstance.classificationLevel.classification;
          })
          .includes(Classification.TS);
      }
    );
    const sr = getSecurityRequirements(payload);
    expect(sr.containsSecretOffering).toBeTruthy();
    expect(sr.containsTopSecretOffering).toBeFalsy();
  });
});
