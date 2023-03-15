import { HelperOptions } from "handlebars";
import { AwardType, Classification, ImpactLevel, PeriodType, PeriodUnit } from "../../models/document-generation";
import { formatDuration, formatGroupAndClassification, formatAwardType, countSections, counter } from "./helpers";

const baseAndOptionPeriods = [
  {
    periodType: PeriodType.OPTION,
    periodUnitCount: 12,
    periodUnit: PeriodUnit.WEEK,
    optionOrder: 2,
  },
  {
    periodType: PeriodType.BASE,
    periodUnitCount: 1,
    periodUnit: PeriodUnit.YEAR,
    // probably good to make base periods -1 to keep type consistent
    optionOrder: -1,
  },
];
const basePeriodOnly = [
  {
    periodType: PeriodType.BASE,
    periodUnitCount: 6,
    periodUnit: PeriodUnit.MONTH,
    optionOrder: -1,
  },
];
const optionPeriodsOnly = [
  {
    periodType: PeriodType.OPTION,
    periodUnitCount: 30,
    periodUnit: PeriodUnit.DAY,
    optionOrder: 4,
  },
  {
    periodType: PeriodType.OPTION,
    periodUnitCount: 3,
    periodUnit: PeriodUnit.MONTH,
    optionOrder: 1,
  },
];

describe("formatDuration - used when not entire duration", () => {
  it("format the duration of base and option periods", async () => {
    const duration = formatDuration(baseAndOptionPeriods);
    expect(duration).toBe("Base: 1 Year and option(s) OP1: 12 Week(s)");
  });
  it("format the duration of base periods only", async () => {
    const duration = formatDuration(basePeriodOnly);
    expect(duration).toBe("Base: 6 Month(s)");
  });
  it("format the duration of option periods only", async () => {
    const duration = formatDuration(optionPeriodsOnly);
    expect(duration).toBe("Option(s) - OP1: 3 Month(s), OP2: 30 Day(s)");
  });
  it("return no periods found when empty array", async () => {
    const duration = formatDuration([]);
    expect(duration).toBe("No periods found.");
  });
  it.each(["", null, true, "random"])("return no periods provided when not an array", async (nullItem) => {
    const duration = formatDuration(nullItem as any);
    expect(duration).toBe("No periods provided.");
  });
});

describe("formatGroupAndClassification", () => {
  it("format section title", async () => {
    const serviceOffering = {
      name: "Cloud Audit/Monitoring Tools",
      serviceOfferingGroup: "DEVELOPER_TOOLS",
    };
    const classificationLevel = {
      classification: Classification.TS,
      impactLevel: null,
    };
    const duration = formatGroupAndClassification(serviceOffering, classificationLevel);
    expect(duration).toBe("Top Secret — Developer Tools");
  });
  it("format section title", async () => {
    const otherServiceOffering = {
      name: "Special custom built app",
      serviceOfferingGroup: null,
    };
    const classificationLevel = {
      classification: Classification.S,
      impactLevel: ImpactLevel.IL6,
    };
    const duration = formatGroupAndClassification(otherServiceOffering, classificationLevel);
    expect(duration).toBe("Secret/IL6 — Other: Special custom built app");
  });
  it("should return U classification with offering", async () => {
    const serviceOffering = {
      name: "Unclassified app",
      serviceOfferingGroup: "APPLICATIONS",
    };
    const classificationLevel = {
      classification: Classification.U,
      impactLevel: ImpactLevel.IL4,
    };
    const duration = formatGroupAndClassification(serviceOffering, classificationLevel);
    expect(duration).toBe("Unclassified/IL4 — Applications");
  });
  it("should return S classification with no classification", async () => {
    const serviceOffering = {
      name: "Hoth app no class provided",
      serviceOfferingGroup: "APPLICATIONS",
    };
    const classificationLevel = {
      classification: null,
      impactLevel: null,
    };
    const duration = formatGroupAndClassification(serviceOffering, classificationLevel);
    expect(duration).toBe("Secret/IL6 — Applications");
  });
});

describe("formatAwardType", () => {
  it("should return Award", async () => {
    const award = formatAwardType(AwardType.INITIAL_AWARD);
    expect(award).toBe("Award");
  });
  it("should return Mod", async () => {
    const mod = formatAwardType(AwardType.MODIFICATION);
    expect(mod).toBe("Mod");
  });
  it.each(["", "other", null, true, 1, {}])("should return empty string", async () => {
    const empty = formatAwardType(null as any);
    expect(empty).toBe("");
  });
});

describe("counter", () => {
  it("should return 3 after being called three times then reset to 0", async () => {
    const options = {
      hash: {
        sectionCount: 3,
      },
    };
    let count = counter(options as HelperOptions);
    count = counter(options as HelperOptions);
    count = counter(options as HelperOptions);
    expect(count).toBe("3");
    count = counter(options as HelperOptions);
    expect(count).toBe("0");
  });
});

describe("countSections", () => {
  it("should return 3 for number of classification instances", async () => {
    const serviceOfferings = [
      {
        classificationInstances: [
          {
            classificationLevel: {
              impactLevel: null,
              classification: Classification.TS,
            },
          },
          {
            classificationLevel: {
              impactLevel: ImpactLevel.IL4,
              classification: Classification.U,
            },
          },
        ],
      },
      {
        classificationInstances: [
          {
            classificationLevel: {
              impactLevel: ImpactLevel.IL2,
              classification: Classification.U,
            },
          },
        ],
      },
    ];

    const sectionCount = countSections(serviceOfferings as any);
    expect(sectionCount).toBe(3);
  });
});
