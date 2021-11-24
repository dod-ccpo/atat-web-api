import { BaseEntity } from "./BaseEntity";
import { Clin } from "./Clin";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { FileScanStatus } from "../../models/FileMetadata";
import { Portfolio } from "./Portfolio";

@Entity()
export class TaskOrder extends BaseEntity {
  @Column({
    type: String,
    length: 17,
    comment: "TO numbers are 13 characters. TO modifications are 17 characters.",
  })
  taskOrderNumber: string;

  @Column({ type: "uuid", comment: "S3 object key of task order pdf" })
  fileId: string;

  @Column({ type: String, length: 256, comment: "name of pdf file when uploaded" })
  fileName: string;

  @Column({ nullable: true, comment: "pdf file size in bytes" })
  fileSize: number;

  @Column({ type: "enum", enum: FileScanStatus, default: FileScanStatus.PENDING })
  fileScanStatus: FileScanStatus;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.taskOrders)
  portfolio: Portfolio;

  @OneToMany(() => Clin, (clin) => clin.taskOrder)
  clins: Array<Clin>;
}
