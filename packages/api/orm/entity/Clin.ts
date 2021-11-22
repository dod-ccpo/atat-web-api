import { BaseEntity } from "./ProvisionableEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { TaskOrder } from "./TaskOrder";

@Entity()
export class Clin extends BaseEntity {
  @Column({
    type: String,
    nullable: false,
    length: 4,
    comment: "contract line item number from task order, 0001 through 9999",
  })
  clinNumber: string;

  @Column({
    type: String,
    nullable: false,
    comment: "indefinite-delivery, indefinite-quantity CLIN specific to JWCC",
  })
  idiqClin: string;

  // decimal(17,2) allows tens of trillions
  @Column({
    type: "decimal",
    nullable: false,
    precision: 17,
    scale: 2,
    default: 0.0,
    comment: "full amount requested by customer from USG for project or contract",
  })
  totalClinValue: number;

  @Column({
    type: "decimal",
    nullable: false,
    precision: 17,
    scale: 2,
    default: 0.0,
    comment: "amount already disbursed by USG for project or contract to be spent during CLIN POP",
  })
  obligatedFunds: number;

  @Column({ type: "date", nullable: false, comment: "start of POP during which funds can be spent" })
  popStartDate: Date;

  @Column({ type: "date", nullable: false, comment: "end of POP during which funds can be spent" })
  popEndDate: Date;

  @ManyToOne(() => TaskOrder, (taskOrder) => taskOrder.clins)
  taskOrder: TaskOrder;
}
