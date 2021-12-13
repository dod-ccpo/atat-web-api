import { BaseEntity } from "./BaseEntity";
import { Clin } from "./Clin";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Portfolio } from "./Portfolio";

export enum FileScanStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

@Entity("task_order")
export class TaskOrder extends BaseEntity {
  @Column({
    type: "varchar",
    length: 17,
    comment: "TO numbers are 13 characters. TO modifications are 17 characters.",
  })
  taskOrderNumber: string;

  @Column({ type: "uuid", comment: "S3 object key of task order pdf" })
  fileId: string;

  @Column({ type: "varchar", length: 256, comment: "name of pdf file when uploaded" })
  fileName: string;

  @Column({ type: "integer", nullable: true, comment: "pdf file size in bytes" })
  fileSize: number;

  @Column({ type: "enum", enum: FileScanStatus, default: FileScanStatus.PENDING })
  fileScanStatus: FileScanStatus;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.taskOrders)
  portfolio: Portfolio;

  @OneToMany(() => Clin, (clin) => clin.taskOrder)
  clins: Array<Clin>;
}
