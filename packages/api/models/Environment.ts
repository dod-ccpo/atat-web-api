import { AppEnvOperatorModel } from "./Operator";

export interface EnvironmentModel {
  name: string;
  operators: Array<AppEnvOperatorModel>;
}
