import { AccessLevel } from "./AccessLevel";
export interface Operator {
  first_name: string;
  last_name: string;
  email: string;
  access: AccessLevel;
}
