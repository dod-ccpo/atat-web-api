import { Application } from "./Application";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { Column, Entity, OneToMany } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";
import { TaskOrder } from "./TaskOrder";

@Entity()
export class Portfolio extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @Column({ type: String, nullable: true, length: 300 })
  description: string;

  @Column({ type: String, nullable: false })
  owner: string;

  @Column({ type: "enum", enum: CloudServiceProvider, nullable: false })
  csp: CloudServiceProvider;

  @Column({ type: String, nullable: false, array: true })
  dodComponents: Array<string>;

  @Column({ type: String, nullable: false, array: true })
  portfolioManagers: Array<string>;

  @OneToMany(() => TaskOrder, (taskOrder) => taskOrder.portfolio)
  taskOrders: TaskOrder[];

  @OneToMany(() => Application, (application) => application.portfolio)
  applications: Application[];

  // TODO: add operators - simple-array or PortfolioOperator[] ?
}
