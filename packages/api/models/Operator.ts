import { AccessLevel } from "./AccessLevel";
export interface Operator {
  display_name: string;
  email: string;
  access: AccessLevel;
}
