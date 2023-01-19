import { ServiceOfferingGroup } from "../../models/document-generation/description-of-work";
import {
  getCDRLs,
  getInstancePop,
  getTaskPeriods,
  organizeXaasServices,
  sortInstanceClassificationLevels,
  sortSelectedServicesByGroups,
} from "./dow";
import { sampleDowRequest } from "./sampleTestData";

describe("Sorting XaaS Services", () => {
  it("sortInstanceClassificationLevels", async () => {
    const computeInstances = sampleDowRequest.templatePayload.xaasOfferings.computeInstances;
    const sortedComputeInstances = sortInstanceClassificationLevels(computeInstances);
    expect(sortedComputeInstances.il2).toHaveLength(1);
    expect(sortedComputeInstances.il4).toHaveLength(0);
    expect(sortedComputeInstances.il5).toHaveLength(1);
    expect(sortedComputeInstances.il6).toHaveLength(1);
    expect(sortedComputeInstances.ts).toHaveLength(0);
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

describe("Gather Tasks for PoP", () => {
  it("getTaskPeriods", async () => {
    const payload = sampleDowRequest.templatePayload;
    const expectedTasks = {
      // entireDurationTasksLength: [], // 17 found
      popPeriods: ["B", "OP1", "OP2", "OP3"],
      taskNumberGroups: [
        { dowTaskNumbers: ["4.2.3.1.1"], taskPeriods: ["OP1", "OP2"] },
        { dowTaskNumbers: ["4.2.4.3.3"], taskPeriods: ["OP1", "OP2", "OP3"] },
        { dowTaskNumbers: ["4.2.6"], taskPeriods: ["B", "OP1", "OP2"] },
      ],
    };

    const popTasks = getTaskPeriods(payload);
    expect(popTasks.entireDurationTasks).toHaveLength(17);
    expect(popTasks.popPeriods).toEqual(expectedTasks.popPeriods);
    expect(popTasks.taskNumberGroups).toHaveLength(expectedTasks.taskNumberGroups.length);
    expect(popTasks.taskNumberGroups).toEqual(expectedTasks.taskNumberGroups);
  });

  it("getInstancePop", async () => {
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
      { code: "*A004", clins: ["x004"], name: "System Administrator Training Materials", taskNumbers: ["4.3.4.3"] },
      { code: "*A005", clins: ["x004"], name: "Role-Based User Training Material", taskNumbers: ["4.3.4.3"] },
      { code: "A012", clins: ["x001", "x003"], name: "TO Monthly Progress Report", taskNumbers: ["ANY"] },
      { code: "**A006", clins: ["x001"], name: "Portability Plan", taskNumbers: ["4.3.3"] },
      { code: "***A017", clins: ["x001"], name: "TE Device Specifications", taskNumbers: ["4.2.1.9"] },
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
