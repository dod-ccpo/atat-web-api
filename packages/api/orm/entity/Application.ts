import { Column, Entity, ManyToOne } from "typeorm";
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

  // TODO environments: Array<Environment>;
  @Column()
  environments: string;

  // TODO operators: Array<AppEnvOperator>;
  @Column()
  operators: string;
}
