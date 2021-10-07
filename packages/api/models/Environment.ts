import { AppEnvOperator } from "./AppEnvOperator";

export interface Environment {
  name: string;
  operators: Array<AppEnvOperator>;
}
