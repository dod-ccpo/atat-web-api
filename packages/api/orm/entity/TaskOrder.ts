import { BaseEntity } from "./ProvisionableEntity";
import { Column, Entity } from "typeorm";
import { FileScanStatus } from "../../models/FileMetadata";

@Entity()
export class TaskOrder extends BaseEntity {
  @Column({
    type: String,
    nullable: false,
    length: 17,
    comment: "13 character TO number, or 17 character TO modification number",
  })
  taskOrderNumber: string;

  @Column({ type: "uuid", nullable: false, comment: "S3 object key of task order pdf" })
  fileId: string;

  @Column({ type: String, nullable: false, length: 256, comment: "name of pdf file when uploaded" })
  fileName: string;

  @Column({ nullable: true, comment: "pdf file size in bytes" })
  fileSize: number;

  @Column({ type: "enum", nullable: false, enum: FileScanStatus, default: FileScanStatus.PENDING })
  fileScanStatus: FileScanStatus;

  // TODO clins: Array<Clin>;
  @Column()
  clins: string;
}
