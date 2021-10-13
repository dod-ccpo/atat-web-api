import { AccessLevel } from "./AccessLevel";
import { ExhaustiveAttributeMap } from "./TypeFields";
export interface Operator {
  display_name: string;
  email: string;
  access: AccessLevel;
}

export const operatorFields: ExhaustiveAttributeMap<Operator> = {
  display_name: null,
  email: null,
  access: null,
};
