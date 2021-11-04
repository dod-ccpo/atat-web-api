import { AppEnvOperator } from "./Operator";

export interface Environment {
  name: string;
  operators: Array<AppEnvOperator>;
}
