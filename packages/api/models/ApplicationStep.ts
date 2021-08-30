import { Environment } from "./Environment";
export interface ApplicationStep {
  name: string;
  description: string;
  emvironments: Array<Environment>;
}
