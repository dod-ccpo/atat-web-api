import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Environment } from "./Environment";
import { Portfolio } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Application extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @Column({ type: String, nullable: true, length: 300 })
  description: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.applications)
  portfolio: Portfolio;

  @OneToMany(() => Environment, (environment) => environment.application)
  environments: Environment[];

  // TODO: add operators - simple-array or AppEnvOperator[] ?
}
