import { Application } from "./Application";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { Column, Entity, OneToMany } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";
import { TaskOrder } from "./TaskOrder";

@Entity()
export class Portfolio extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 300 })
  description: string;

  @Column()
  owner: string;

  @Column({ type: "enum", enum: CloudServiceProvider })
  csp: CloudServiceProvider;

  @Column({ type: "varchar", array: true })
  dodComponents: Array<string>;

  @Column({ type: "varchar", array: true })
  portfolioManagers: Array<string>;

  @OneToMany(() => TaskOrder, (taskOrder) => taskOrder.portfolio)
  taskOrders: Array<TaskOrder>;

  @OneToMany(() => Application, (application) => application.portfolio)
  applications: Array<Application>;
}
