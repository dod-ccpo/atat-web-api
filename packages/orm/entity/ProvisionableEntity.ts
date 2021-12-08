import { BaseEntity } from "./BaseEntity";
import { Column } from "typeorm";

export enum ProvisioningStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export abstract class ProvisionableEntity extends BaseEntity {
  @Column({
    type: "enum",
    enum: ProvisioningStatus,
    default: ProvisioningStatus.PENDING,
  })
  provisioningStatus: ProvisioningStatus;

  @Column({ type: "varchar", array: true, default: "{}" })
  administrators: Array<string>;

  // Not valid for Portfolio
  @Column({ type: "varchar", array: true, default: "{}" })
  contributors: Array<string>;

  // Not valid for Portfolio
  @Column({ type: "varchar", array: true, default: "{}" })
  readOnlyOperators: Array<string>;
}
