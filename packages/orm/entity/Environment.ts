import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

export interface IEnvironmentOperators {
  administrators?: Array<string>;
  contributors?: Array<string>;
  readOnlyOperators?: Array<string>;
}
export interface IEnvironment extends IEnvironmentOperators {
  name: string;
}
export interface IEnvironmentCreate extends IEnvironment {
  application: Application;
}

@Entity("environment")
export class Environment extends ProvisionableEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;
}
