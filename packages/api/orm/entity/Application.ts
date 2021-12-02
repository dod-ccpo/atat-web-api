import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { EnvironmentEntity } from "./Environment";
import { PortfolioEntity } from "./Portfolio";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class ApplicationEntity extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 300 })
  description: string;

  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.applications)
  portfolio: PortfolioEntity;

  @OneToMany(() => EnvironmentEntity, (environment) => environment.application)
  environments: Array<EnvironmentEntity>;
}
