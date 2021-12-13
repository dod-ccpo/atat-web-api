import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity("environment")
export class Environment extends ProvisionableEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;
}
