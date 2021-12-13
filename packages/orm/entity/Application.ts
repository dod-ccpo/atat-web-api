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
  // eslint-disable-next-line
  @ManyToOne(() => Portfolio, portfolio => portfolio.applications, { cascade: true })
  portfolio: Portfolio;

  @OneToMany(() => Environment, (environment) => environment.application, { cascade: true })
  environments: Array<Environment>;
}

/*
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Environment } from "./Environment";
import { Portfolio } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity("application")
export class Application extends ProvisionableEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", nullable: true, length: 300 })
  description: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.applications)
  portfolio: Portfolio;

  @OneToMany(() => Environment, (environment) => environment.application)
  environments: Array<Environment>;
}
*/
