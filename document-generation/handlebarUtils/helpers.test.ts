import { HelperOptions } from "handlebars";
import {
  AwardType,
  Classification,
  ImpactLevel,
  IPeriod,
  PeriodType,
  PeriodUnit,
} from "../../models/document-generation";
import { formatDuration, formatGroupAndClassification, formatAwardType, countSections, counter } from "./helpers";

const baseAdnOptionPeriods = [
  {
    period_type: PeriodType.OPTION,
    period_unit_count: 12,
    period_unit: PeriodUnit.WEEK,
    option_order: 2,
  },
  {
    period_type: PeriodType.BASE,
    period_unit_count: 1,
    period_unit: PeriodUnit.YEAR,
    // probably good to make bass periods -1 to keep type consistent
    option_order: -1,
  },
];
const basePeriodOnly = [
  {
    period_type: PeriodType.BASE,
    period_unit_count: 6,
    period_unit: PeriodUnit.MONTH,
    option_order: -1,
  },
];
const optionPeriodsOnly = [
  {
    period_type: PeriodType.OPTION,
    period_unit_count: 30,
    period_unit: PeriodUnit.DAY,
    option_order: 4,
  },
  {
    period_type: PeriodType.OPTION,
    period_unit_count: 3,
    period_unit: PeriodUnit.MONTH,
    option_order: 1,
  },
];

describe("formatDuration - used when not entire duration", () => {
  it("format the duration of base and option periods", async () => {
    const duration = formatDuration(baseAdnOptionPeriods);
    expect(duration).toBe("Base: 1 Year and option(s) OP2: 12 Week(s)");
  });
  it("format the duration of base periods only", async () => {
    const duration = formatDuration(basePeriodOnly);
    expect(duration).toBe("Base: 6 Month(s)");
  });
  it("format the duration of option periods only", async () => {
    const duration = formatDuration(optionPeriodsOnly);
    expect(duration).toBe("Option(s) - OP1: 3 Month(s), OP4: 30 Day(s)");
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
      service_offering_group: "DEVELOPER_TOOLS",
    };
    const classificationLevel = {
      classification: Classification.TS,
      impact_level: null,
    };
    const duration = formatGroupAndClassification(serviceOffering, classificationLevel);
    expect(duration).toBe("Top Secret — Developer Tools");
  });
  it("format section title", async () => {
    const otherServiceOffering = {
      name: "Special custom built app",
      service_offering_group: null,
    };
    const classificationLevel = {
      classification: Classification.S,
      impact_level: ImpactLevel.IL6,
    };
    const duration = formatGroupAndClassification(otherServiceOffering, classificationLevel);
    expect(duration).toBe("Secret/IL6 — Other: Special custom built app");
  });
  it("should return U classification with offering", async () => {
    const serviceOffering = {
      name: "Unclassified app",
      service_offering_group: "APPLICATIONS",
    };
    const classificationLevel = {
      classification: Classification.U,
      impact_level: ImpactLevel.IL4,
    };
    const duration = formatGroupAndClassification(serviceOffering, classificationLevel);
    expect(duration).toBe("Unclassified/IL4 — Applications");
  });
  it("should return S classification with no classification", async () => {
    const serviceOffering = {
      name: "Hoth app no class provided",
      service_offering_group: "APPLICATIONS",
    };
    const classificationLevel = {
      classification: null,
      impact_level: null,
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
        classification_instances: [
          {
            classification_level: {
              impact_level: null,
              classification: Classification.TS,
            },
          },
          {
            classification_level: {
              impact_level: ImpactLevel.IL4,
              classification: Classification.U,
            },
          },
        ],
      },
      {
        classification_instances: [
          {
            classification_level: {
              impact_level: ImpactLevel.IL2,
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
