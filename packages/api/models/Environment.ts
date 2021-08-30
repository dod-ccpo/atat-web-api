import { Operator } from "./Operator";
export interface Environment {
  name: string;
  operators: Array<Operator>;
}
