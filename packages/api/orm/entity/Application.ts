import { Column, Entity } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class Application extends ProvisionableEntity {
  @Column({ type: String, nullable: false, length: 100 })
  name: string;

  @Column({ type: String, nullable: true, length: 300 })
  description: string;

  // TODO environments: Array<Environment>;
  @Column()
  environments: string;

  // TODO operators: Array<AppEnvOperator>;
  @Column()
  operators: string;
}
