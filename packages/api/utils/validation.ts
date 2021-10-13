import { Application } from "../models/Application";
import { ApplicationStep } from "../models/ApplicationStep";
import { Clin } from "../models/Clin";
import { containsExactlyFields } from "../models/TypeFields";
import { Environment } from "../models/Environment";
import { FundingStep } from "../models/FundingStep";
import { PortfolioStep } from "../models/PortfolioStep";
import { Operator, operatorFields } from "../models/Operator";
import { TaskOrder, taskOrderFields } from "../models/TaskOrder";
import { validate as uuidValidate, version as uuidVersion } from "uuid";

/**
 * Check whether a given string is valid JSON.
 *
 * @param str - The string to check
 * @returns the string parsed as the given type, or undefined
 */
export function isValidJson<T>(str?: string | null): T | undefined {
  if (!str) {
    return undefined;
  }
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    return undefined;
  }
}

/**
 * Check whether a given string is a valid v4 UUID.
 * @param str - The string to check
 * @returns true if the string is valid v4 UUID and false otherwise
 */
export function isValidUuidV4(str?: string): boolean {
  return !!str && uuidValidate(str) && uuidVersion(str) === 4;
}

/**
 * Check that the given object is in fact a valid object type.
 *
 * This should reject null, undefined, and non-object types.
 */
// This is a basic and low-level check that should probably not be exported. Any
// object type should have a higher-level interface for validation.
function isValidObject(object: unknown): object is any {
  return object !== undefined && object !== null && typeof object === "object";
}

/**
 * Check whether a given object is a {@link PortfolioStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link PortfolioStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link PortfolioStep}
 */
export function isPortfolioStep(object: unknown): object is PortfolioStep {
  // Ensure that the given item is a valid object prior to checks its members
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "csp", "dod_components", "portfolio_managers"].every((item) => item in object);
}

/**
 * Check whether a given object is a {@link FundingStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link FundingStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link FundingStep}
 */
export function isFundingStep(object: unknown): object is FundingStep {
  return isValidObject(object) && "task_orders" in object;
}

/**
 * Check whether a given object is a {@link TaskOrder}
 *
 * @param object - The object to check
 * @returns true if object has all attributes of a {@link TaskOrder}
 */
export function isTaskOrder(object: unknown): object is TaskOrder {
  return containsExactlyFields(object, taskOrderFields);
}

/**
 * Check whether a given object is a {@link ApplicationStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link ApplicationStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link ApplicationStep}
 */
export function isApplicationStep(object: unknown): object is ApplicationStep {
  if (!isValidObject(object)) {
    return false;
  }
  return ["applications", "operators"].every((item) => item in object);
}

/**
 * Check whether a given object is a {@link Application}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link Application}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link Application}
 */
export function isApplication(object: unknown): object is Application {
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "description", "environments", "operators"].every((item) => item in object);
}
/**
 * Check whether a given object is an {@link Environment}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link Environment}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of an {@link Environment}
 */
export function isEnvironment(object: unknown): object is Environment {
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "operators"].every((item) => item in object);
}
/**
 * Check whether a given object is an {@link Operator}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link Operator}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of an {@link Operator}
 */
export function isOperator(object: unknown): object is Operator {
  return containsExactlyFields(object, operatorFields);
}

/**
 * Check whether the path parameter is present in the request
 *
 * @param str - The string to check
 * @returns true if the string is empty or null
 */
export function isPathParameterPresent(pathParam: string | undefined): pathParam is string {
  return !!pathParam?.trim();
}
/**
 * Check whether a given string body is empty
 *
 * @param body - The body of the request
 * @returns true if the string is empty or null
 */
export function isBodyPresent(body: string | null): body is string {
  const emptyValues = ["", "{}"];
  // Treating a null body object as an empty string is legitimate since
  // an empty string is a forbidden value
  const trimmedBody = body?.replace(/\s/g, "") ?? "";
  return !emptyValues.includes(trimmedBody);
}

/**
 * Checks whether the given string is a valid date.
 *
 * This overcomes limitations in JSON Schema Draft 4 around the lack
 * of a `date` `format` specifier.
 *
 * @param possibleDate - The string to check for formatting as a date
 * @returns
 */
export function isValidDate(possibleDate: string): boolean {
  const resultingDate = new Date(possibleDate);
  if (!(resultingDate instanceof Date) || isNaN(resultingDate.getTime())) {
    return false;
  }
  // Date does weird things like converting February 31st to a date in March.
  // Because of that, we need to check that the resulting ISO String's date
  // portion (the stuff before the T) is the same as the input. Otherwise,
  // we might accept YYYY-02-31 as valid.
  // TODO: Migrate to a reputable date-handling library.
  return resultingDate.toISOString().split("T")[0] === possibleDate;
}

/**
 * Check whether a given object is a {@link Clin}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link Clin}
 */
export function isClin(object: unknown): object is Clin {
  if (!isValidObject(object)) {
    return false;
  }
  return ["clin_number", "idiq_clin", "total_clin_value", "obligated_funds", "pop_start_date", "pop_end_date"].every(
    (item) => item in object
  );
}

/**
 * Check whether a given string is a valid CLIN number.
 * @param str - The string to check
 * @returns true if the string is a valid CLIN number; false otherwise
 */
export function isClinNumber(str: string): boolean {
  if (str.length !== 4) {
    return false;
  }
  const num: number = parseInt(str);
  return num >= 1 && num <= 9999;
}

/**
 * Check whether a given string is a valid Funding Amount.
 * @param str - The string to check
 * @returns true if the string is a valid Funding Amount; false otherwise
 */
export function isFundingAmount(str: string): boolean {
  if (str.length === 0) {
    return false;
  }
  const num: number = parseFloat(str);
  return num > 0;
}

/**
 * Check whether an operator email is a valid email.
 *
 * @param email - The email to check
 * @returns boolean - true if the email matches the regex pattern, and false if not
 */
export function isMilEmail(email: string): boolean {
  if (!email.includes("@")) {
    return false;
  }

  // Users should not input email addresses with comments
  // so we can safely reject those. They aren't part of the actual
  // address and so get dropped when the email is being sent anyway.
  if (email.includes("(")) {
    return false;
  }

  // We make the assumption that we will not be receiving
  // email addresses with quoted local parts so that we can
  // ignore the complexities that come with parsing those.
  if (email.includes('"')) {
    return false;
  }

  const [localPart, domain] = email.split("@");

  // Reject values that are too long
  if (localPart.length > 63 || domain.length > 253) {
    return false;
  }

  // Domain restrictions (per DNS spec and business logic)
  // No need to handle IP address logic; those are rejected
  // by business logic
  // We're required to end in .mil per business logic and no
  // domain can have any segment > 63 characters.
  const domainRegex = /^([a-z0-9-]{1,63}\.)+mil$/i;
  if (!domainRegex.test(domain)) {
    return false;
  }

  // RFC 5321 defines the local part as a Dot-string (or Quoted-string, though we've
  // rejected all those possible strings), which is an Atom followed by a dot and then
  // an Atom any number of times.  An Atom is defined as one or more characters
  // in the atext class, which per the errata is defined to be the same as in RFC 5322;
  // the definition can be found at:
  //   https://datatracker.ietf.org/doc/html/rfc5322#section-3.2.3.
  // This lazily encodes that as a regular expression with some logic to forbid
  // back-to-back `.` or starting/ending with `.`. Trying to do this in regex would likely
  // require backtracking or other issues which might lead to a ReDoS vulnerability.
  const localPartCharacters = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
  return (
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    localPartCharacters.test(localPart)
  );
}
