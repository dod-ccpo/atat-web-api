import { Column, DeleteDateColumn, Entity, ManyToOne, OneToMany } from "typeorm";
import { Environment } from "./Environment";
import { Portfolio } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

export interface IApplication {
  name: string;
  description: string;
}
export interface IApplicationUpdate extends IApplication {
  administrators?: Array<string>;
  contributors?: Array<string>;
  readOnlyOperators?: Array<string>;
}

export interface IApplicationCreate extends IApplicationUpdate {
  portfolio: Portfolio;
  environments: Array<Environment>;
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
