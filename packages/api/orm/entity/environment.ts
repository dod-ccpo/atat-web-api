import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
@Entity()
export class Environment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: String,
    nullable: false,
    length: 100,
  })
  name: string;

  // TODO operators: Array<AppEnvOperator>;
  @Column()
  operators: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
