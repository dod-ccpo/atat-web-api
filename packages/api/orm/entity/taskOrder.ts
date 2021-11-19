import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { FileScanStatus } from "../../models/FileMetadata";

@Entity()
export class TaskOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: String,
    nullable: false,
    length: 17,
  })
  taskOrderNumber: string;

  // S3 Object Key
  @Column({
    type: "uuid",
    nullable: true,
  })
  fileId: string;

  // name of file when uploaded
  @Column({
    type: String,
    nullable: true,
    length: 256,
  })
  fileName: string;

  // size in bytes
  @Column({
    nullable: true,
  })
  fileSize: number;

  @Column({
    type: "enum",
    nullable: true,
    enum: FileScanStatus,
  })
  fileScanStatus: FileScanStatus;

  // TODO clins: Array<Clin>;
  @Column()
  clins: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
