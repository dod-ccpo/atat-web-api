import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

@Entity()
export class Clin {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: String, nullable: false, length: 4 })
  clinNumber: string;

  @Column({ type: String, nullable: false })
  idiqClin: string;

  // decimal(17,2) allows tens of trillions
  @Column({ type: "decimal", nullable: false, precision: 17, scale: 2, default: 0.0 })
  totalClinValue: number;

  @Column({ type: "decimal", nullable: false, precision: 17, scale: 2, default: 0.0 })
  obligatedFunds: number;

  @Column({ type: "date", nullable: false })
  popStartDate: Date;

  @Column({ type: "date", nullable: false })
  popEndDate: Date;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
