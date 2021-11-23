import { Application } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Environment extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @ManyToOne(() => Application, (application) => application.environments)
  application: Application;

  // operators - simple-array or AppEnvOperator[] ?
  @Column({ type: "simple-array", default: "" })
  administrators: string[];

  @Column({ type: "simple-array", default: "" })
  contributors: string[];

  @Column({ type: "simple-array", default: "" })
  readOnlyOperators: string[];
}
