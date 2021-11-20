import { Column, Entity } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Environment extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  // TODO operators: Array<AppEnvOperator>;
  @Column()
  operators: string;
}
