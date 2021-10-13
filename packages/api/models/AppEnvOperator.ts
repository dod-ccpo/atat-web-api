import { AccessLevel } from "./AccessLevel";
import { Operator } from "./Operator";
export interface AppEnvOperator extends Operator {
  access: AccessLevel.ADMINISTRATOR | AccessLevel.CONTRIBUTOR | AccessLevel.READ_ONLY;
}
