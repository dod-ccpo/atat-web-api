import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Environment } from "./Environment";
import { Portfolio } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity("application")
export class Application extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 300 })
  description: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.applications)
  portfolio: Portfolio;

  @OneToMany(() => Environment, (environment) => environment.application)
  environments: Array<Environment>;
}
