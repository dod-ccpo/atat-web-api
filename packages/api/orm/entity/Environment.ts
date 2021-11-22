import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Environment extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;

  // TODO operators: Array<AppEnvOperator>;
  @Column()
  operators: string;
}
