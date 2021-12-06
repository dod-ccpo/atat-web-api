import { Application } from "./Application";
import { Column, Entity, OneToMany } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";
import { TaskOrder } from "./TaskOrder";

export enum CloudServiceProvider {
  CSP_A = "CSP A",
  CSP_B = "CSP B",
}

export enum DodComponent {
  AIR_FORCE = "AIR_FORCE",
  ARMY = "ARMY",
  MARINE_CORPS = "MARINE_CORPS",
  NAVY = "NAVY",
  SPACE_FORCE = "SPACE_FORCE",
  COMBATANT_COMMAND = "COMBATANT_COMMAND",
  JOINT_STAFF = "JOINT_STAFF",
  DAFA = "DAFA",
  OSD_PSAS = "OSD_PSAS",
  NSA = "NSA",
}

@Entity("portfolio")
export class Portfolio extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 300 })
  description: string;

  @Column()
  owner: string;

  @Column({ type: "enum", enum: CloudServiceProvider })
  csp: CloudServiceProvider;

  @Column({ type: "enum", enum: DodComponent, array: true })
  dodComponents: Array<DodComponent>;

  @Column({ type: "varchar", array: true })
  portfolioManagers: Array<string>;

  @OneToMany(() => TaskOrder, (taskOrder) => taskOrder.portfolio)
  taskOrders: Array<TaskOrder>;

  @OneToMany(() => Application, (application) => application.portfolio)
  applications: Array<Application>;
}
