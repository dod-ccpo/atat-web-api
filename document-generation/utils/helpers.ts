/* eslint-disable camelcase */
import { capitalize } from "./utils";
import { AwardType, IPeriod, ISelectedServiceOffering } from "../../models/document-generation";
import { HelperOptions } from "handlebars";

// DoW helpers
export const formatDuration = (periods: IPeriod[]): string => {
  if (periods === null || typeof periods === "string" || typeof periods === "boolean") {
    return "No periods provided.";
  }
  periods = periods.map((period: IPeriod) => {
    let periodUnit = capitalize(period.periodUnit);
    if (periodUnit !== "Year") {
      periodUnit += "(s)";
    }
    return { ...period, periodUnit };
  });

  const base = periods.filter((period: IPeriod) => period.periodType === "BASE");

  const options = periods
    .filter((period) => period.periodType === "OPTION")
    .sort((a, b) => a.optionOrder - b.optionOrder);

  // structure the base and option periods
  const hasBase = base.length > 0;
  const basePeriod = hasBase
    ? base.map((period) => `Base: ${period.periodUnitCount} ${period.periodUnit}`).join("")
    : "";
  const hasOptions = options.length > 0;
  const optionPeriods = hasOptions
    ? options.map((period) => `OP${period.optionOrder}: ${period.periodUnitCount} ${period.periodUnit}`).join(", ")
    : "";

  // display periods based on what duration is available
  if (hasBase && hasOptions) {
    return `${basePeriod} and option(s) ${optionPeriods}`;
  } else if (hasBase) {
    return basePeriod;
  } else if (hasOptions) {
    return `Option(s) - ${optionPeriods}`;
  }

  return "No periods found.";
};
export const formatGroupAndClassification = (serviceOffering: any, classificationLevel: any) => {
  let formattedClassification: string;

  // structure and display classification levels
  const { classification, impactLevel } = classificationLevel;
  if (classification === "TS") {
    formattedClassification = `Top Secret`;
  } else if (classification === "S") {
    formattedClassification = `Secret/${impactLevel}`;
  } else if (classification === "U") {
    formattedClassification = `Unclassified/${impactLevel}`;
  } else {
    // defaulting to a higher classification
    formattedClassification = "Secret/IL6";
  }

  // manual service offering input by the user as Other
  if (serviceOffering.serviceOfferingGroup === null) {
    return `${formattedClassification} — Other: ${serviceOffering.name}`;
  }

  // structure provided service offerings
  const offering = serviceOffering.serviceOfferingGroup.split("_").map(capitalize).join(" ");
  return `${formattedClassification} — ${offering}`;
};

export const formatAwardType = (award: AwardType): string => {
  if (award === AwardType.INITIAL_AWARD) {
    return "Award";
  }
  if (award === AwardType.MODIFICATION) {
    return "Mod";
  }
  return "";
};

// The counter fn is a helper used with handlebars to count the
// section number used in 4.2.2.X of the DoW dynamically. Because
// "count" is set outside of the function it can have unintended
// side-effects (e.g., if used for a separate section in the document)
// and will not hold long term since count may not be set to 0 during
// the next use. The combination of "counter" and "countSections" is
// used to determine how many sections (all classification_instances)
// nested inside of the service offerings) and then increase the count
let count = 0;
export const counter = (options: HelperOptions): string => {
  if (count < options.hash.sectionCount) {
    return `${++count}`;
  }

  count = 0;
  return `${count}`;
};

export const countSections = (serviceOfferings: ISelectedServiceOffering[]): number => {
  return serviceOfferings
    .map((service) => service.classificationInstances.length)
    .reduce((sum, current) => sum + current, 0);
};
