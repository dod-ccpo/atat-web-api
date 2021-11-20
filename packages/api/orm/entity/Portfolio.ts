import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { Column, Entity } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Portfolio extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @Column({ type: String, nullable: true, length: 300 })
  description: string;

  @Column({ type: "enum", enum: CloudServiceProvider, nullable: false })
  csp: CloudServiceProvider;

  @Column({ type: String, nullable: false, array: true })
  dodComponents: Array<string>;

  @Column({ type: String, nullable: false, array: true })
  portfolioManagers: Array<string>;

  // TODO: task_orders: Array<TaskOrder>;
  @Column()
  taskOrders: string;

  // TODO: applications: Array<Application>;
  @Column()
  applications: string;

  // TODO: operators: Array<PortfolioOperator>;
  @Column()
  operators: string;
}
