import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";

@Entity()
export class Portfolio {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: ProvisioningStatus,
    default: ProvisioningStatus.NOT_STARTED,
  })
  status: string;

  @Column({
    type: String,
    nullable: false,
    length: 100,
  })
  name: string;

  @Column({
    type: String,
    nullable: true,
    length: 300,
  })
  description: string;

  @Column({
    type: "enum",
    enum: CloudServiceProvider,
    nullable: false,
  })
  csp: CloudServiceProvider;

  @Column({
    type: String,
    nullable: false,
    array: true,
  })
  dodComponents: Array<string>;

  @Column({
    type: String,
    nullable: false,
    array: true,
  })
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

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
