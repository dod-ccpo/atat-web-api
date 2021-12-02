import { AppEnvOperatorModel } from "./Operator";
import { EnvironmentModel } from "./Environment";
export interface ApplicationModel {
  name: string;
  description?: string;
  environments: Array<EnvironmentModel>;
  operators: Array<AppEnvOperatorModel>;
}
