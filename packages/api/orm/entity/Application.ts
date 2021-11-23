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

  // operators - simple-array or AppEnvOperator[] ?
  @Column({ type: "simple-array", default: "" })
  administrators: string[];

  @Column({ type: "simple-array", default: "" })
  contributors: string[];

  @Column({ type: "simple-array", default: "" })
  readOnlyOperators: string[];
}
