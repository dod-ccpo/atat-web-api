import { Environment } from "./Environment";
export interface ApplicationStep {
  name: string;
  description: string;
  environments: Array<Environment>;
}
