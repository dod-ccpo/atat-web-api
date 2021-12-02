import { ApplicationEntity } from "./Application";
import { Column, Entity, ManyToOne } from "typeorm";
import { ProvisionableEntity } from "./ProvisionableEntity";

@Entity()
export class EnvironmentEntity extends ProvisionableEntity {
  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => ApplicationEntity, (application) => application.environments)
  application: ApplicationEntity;
}
