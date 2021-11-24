import { Application } from "./Application";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { Column, Entity, OneToMany } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";
import { TaskOrder } from "./TaskOrder";

@Entity()
export class Portfolio extends ProvisionableEntity {
  @Column({ type: String, length: 100 })
  name: string;

  @Column({ type: String, nullable: true, length: 300 })
  description: string;

  @Column({ type: String })
  owner: string;

  @Column({ type: "enum", enum: CloudServiceProvider })
  csp: CloudServiceProvider;

  @Column({ type: String, array: true })
  dodComponents: Array<string>;

  @Column({ type: String, array: true })
  portfolioManagers: Array<string>;

  @OneToMany(() => TaskOrder, (taskOrder) => taskOrder.portfolio)
  taskOrders: Array<TaskOrder>;

  @OneToMany(() => Application, (application) => application.portfolio)
  applications: Array<Application>;

  // operators - simple-array or PortfolioOperator[] ?
  @Column({ type: "simple-array", default: "" })
  administrators: Array<string>;

  @Column({ type: "simple-array", default: "" })
  contributors: Array<string>;

  @Column({ type: "simple-array", default: "" })
  readOnlyOperators: Array<string>;
}
