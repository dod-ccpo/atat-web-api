import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

export interface IEnvironment {
  name: string;
}

export interface IEnvironmentUpdate extends IEnvironment {
  administrators?: Array<string>;
  contributors?: Array<string>;
  readOnlyOperators?: Array<string>;
}
export interface IEnvironmentCreate extends IEnvironmentUpdate {
  application: Application;
}

@Entity("environment")
export class Environment extends ProvisionableEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;
}
