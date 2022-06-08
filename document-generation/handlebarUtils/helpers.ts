/* eslint-disable camelcase */
import { convertToLowerCase, capitalize } from "./utils";
import { AwardType, IPeriod, ISelectedServiceOffering } from "../../models/document-generation";
import { HelperOptions } from "handlebars";
export const formatDuration = (periods: IPeriod[]): string => {
  periods = periods.map((period: IPeriod) => {
    let period_unit = convertToLowerCase(period.period_unit);
    period_unit = capitalize(period_unit);
    if (period_unit !== "Year") {
      period_unit += "(s)";
    }
    return { ...period, period_unit };
  });

  const base = periods.filter((period: IPeriod) => period.period_type === "BASE");
  const options = periods
    .filter((period) => period.period_type === "OPTION")
    .sort((a, b) => a.option_order - b.option_order);

  // structure the base and option periods
  const hasBase = base.length > 0;
  const basePeriod = hasBase
    ? base.map((period) => `Base: ${period.period_unit_count} ${period.period_unit}`).join("")
    : "";
  const hasOptions = options.length > 0;
  const optionPeriods = hasOptions
    ? options.map((period) => `OP${period.option_order}: ${period.period_unit_count} ${period.period_unit}`).join(", ")
    : "";

  // display periods based on what duration is available
  if (hasBase && hasOptions) {
    return `${basePeriod} and option(s) ${optionPeriods}`;
  } else if (hasBase) {
    return basePeriod;
  } else if (hasOptions) {
    return `Option(s) - ${optionPeriods}`;
  }

  return "No duration found";
};
export const formatGroupAndClassification = (serviceOffering: any, classificationLevel: any) => {
  let formattedClassification: string;

  // structure and display classification levels
  const { classification, impact_level } = classificationLevel;
  if (classification === "TS") {
    formattedClassification = `Top Secret`;
  } else if (classification === "S") {
    formattedClassification = `Secret/${impact_level}`;
  } else if (classification === "U") {
    formattedClassification = `Unclassified/${impact_level}`;
  } else {
    // defaulting to a higher classification
    formattedClassification = "Secret/IL6";
  }

  // manual service offering input by the user as Other
  if (serviceOffering.service_offering_group === null) {
    return `${formattedClassification} — Other: ${serviceOffering.name}`;
  }

  // structure provided service offerings
  const offering = serviceOffering.service_offering_group.split("_").map(convertToLowerCase).map(capitalize).join(" ");
  return `${formattedClassification} — ${offering}`;
};

export const formatAwardType = (award: AwardType) => {
  if (award === "INITIAL_AWARD") {
    return "Award";
  }
  return "Mod";
};

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
    .map((service) => service.classification_instances.length)
    .reduce((prev, current) => prev + current, 0);
};
