import { BaseEntity } from "./BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { TaskOrder } from "./TaskOrder";

@Entity()
export class Clin extends BaseEntity {
  @Column({
    length: 4,
    comment: "contract line item number from task order, 0001 through 9999",
  })
  clinNumber: string;

  @Column({
    comment: "indefinite-delivery, indefinite-quantity CLIN specific to JWCC",
  })
  idiqClin: string;

  @Column({
    type: "money",
    comment: "full amount requested by customer from USG for project or contract",
  })
  totalClinValue: number;

  @Column({
    type: "money",
    comment: "amount already disbursed by USG for project or contract to be spent during CLIN POP",
  })
  obligatedFunds: number;

  @Column({ type: "date", comment: "start of POP during which funds can be spent" })
  popStartDate: Date;

  @Column({ type: "date", comment: "end of POP during which funds can be spent" })
  popEndDate: Date;

  @ManyToOne(() => TaskOrder, (taskOrder) => taskOrder.clins)
  taskOrder: TaskOrder;
}
