import { Clin } from "../../models/Clin";
import { FileMetadata, FileScanStatus } from "../../models/FileMetadata";
import { FundingStep } from "../../models/FundingStep";

const isoFormatDay = (base: number, offset = 0) => new Date(base + offset).toISOString().slice(0, 10);
export const millisInDay = 24 * 60 * 60 * 1000;
export const now = Date.now();
export const yesterday = isoFormatDay(now, -millisInDay);
export const today = isoFormatDay(now);
export const tomorrow = isoFormatDay(now, millisInDay);

export const mockTaskOrderFile: FileMetadata = {
  created_at: "2021-08-03T16:21:07.978Z",
  id: "b91db32f-40fa-4225-9885-b032f0d229fe",
  name: "TO_12345678910.pdf",
  size: 694331,
  status: FileScanStatus.ACCEPTED,
  updated_at: "2021-08-03T16:21:07.978Z",
};

export const mockClin: Clin = {
  clin_number: "0001",
  idiq_clin: "1234",
  obligated_funds: 10000,
  pop_start_date: yesterday,
  pop_end_date: tomorrow,
  total_clin_value: 200000,
};

export const mockFundingStep: FundingStep = {
  task_orders: [
    {
      task_order_number: "12345678910",
      task_order_file: mockTaskOrderFile,
      clins: [mockClin],
    },
  ],
};

/** ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA **/
/** BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA **/
