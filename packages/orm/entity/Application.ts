import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Environment } from "./Environment";
import { Portfolio } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

export interface IApplication {
  name: string;
  description: string;
}
export interface IApplicationOperators extends IApplication {
  administrators?: Array<string>;
  contributors?: Array<string>;
  readOnlyOperators?: Array<string>;
}

export interface IApplicationCreate extends IApplicationOperators {
  environments: Array<Environment>;
  portfolio?: Portfolio;
}
@Entity("application")
export class Application extends ProvisionableEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", nullable: true, length: 300 })
  description: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.applications)
  portfolio: Portfolio;

  @OneToMany(() => Environment, (environment) => environment.application, { cascade: true, onDelete: "CASCADE" })
  environments: Array<Environment>;
}
