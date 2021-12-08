import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

export interface IEnvironment {
  name: string;
}

export interface IEnvironmentCreate extends IEnvironment {
  application: Application;
}
export interface IEnvironmentUpdate extends IEnvironment {
  administrators: string[];
  contributors: string[];
  readOnlyOperators: string[];
}
@Entity("environment")
export class Environment extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;
}
