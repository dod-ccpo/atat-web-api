import { BaseEntity } from "./ProvisionableEntity";
import { Column, Entity } from "typeorm";
import { FileScanStatus } from "../../models/FileMetadata";

@Entity()
export class TaskOrder extends BaseEntity {
  @Column({ type: String, nullable: false, length: 17 })
  taskOrderNumber: string;

  // S3 Object Key
  @Column({ type: "uuid", nullable: true })
  fileId: string;

  // name of file when uploaded
  @Column({ type: String, nullable: true, length: 256 })
  fileName: string;

  // size in bytes
  @Column({ nullable: true })
  fileSize: number;

  @Column({ type: "enum", nullable: true, enum: FileScanStatus })
  fileScanStatus: FileScanStatus;

  // TODO clins: Array<Clin>;
  @Column()
  clins: string;
}
