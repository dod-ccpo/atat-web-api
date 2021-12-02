import { BaseEntity } from "./BaseEntity";
import { ClinEntity } from "./Clin";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { FileScanStatus } from "../../models/FileMetadata";
import { PortfolioEntity } from "./Portfolio";

@Entity()
export class TaskOrderEntity extends BaseEntity {
  @Column({
    length: 17,
    comment: "TO numbers are 13 characters. TO modifications are 17 characters.",
  })
  taskOrderNumber: string;

  @Column({ type: "uuid", comment: "S3 object key of task order pdf" })
  fileId: string;

  @Column({ length: 256, comment: "name of pdf file when uploaded" })
  fileName: string;

  @Column({ nullable: true, comment: "pdf file size in bytes" })
  fileSize: number;

  @Column({ type: "enum", enum: FileScanStatus, default: FileScanStatus.PENDING })
  fileScanStatus: FileScanStatus;

  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.taskOrders)
  portfolio: PortfolioEntity;

  @OneToMany(() => ClinEntity, (clin) => clin.taskOrder)
  clins: Array<ClinEntity>;
}
