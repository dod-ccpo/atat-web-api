import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

@Entity()
export class Application {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: String,
    nullable: false,
    length: 100,
  })
  name: string;

  @Column({
    type: String,
    nullable: true,
    length: 300,
  })
  description: string;

  // TODO environments: Array<Environment>;
  @Column()
  environments: string;

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
