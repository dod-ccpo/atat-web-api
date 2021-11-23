import { BaseEntity } from "./BaseEntity";
import { Column } from "typeorm";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";

export abstract class ProvisionableEntity extends BaseEntity {
  @Column({
    type: "enum",
    enum: ProvisioningStatus,
    default: ProvisioningStatus.NOT_STARTED,
  })
  provisioningStatus: string;
}
