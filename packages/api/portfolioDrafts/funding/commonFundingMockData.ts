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

// good data - this is acceptable per business rules
export const mockClinObligatedEqualsTotal: Clin = {
  ...mockClin,
  obligated_funds: 1,
  total_clin_value: 1,
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

export const mockClinInvalidClinNumberTooShort: Clin = {
  ...mockClin,
  clin_number: "1",
};
export const mockClinInvalidClinNumberTooLong: Clin = {
  ...mockClin,
  clin_number: "55555",
};
export const mockClinInvalidClinNumberAllZeros: Clin = {
  ...mockClin,
  clin_number: "0000",
};
export const mockClinInvalidDates: Clin = {
  ...mockClin,
  pop_start_date: "not an ISO date",
  pop_end_date: "2021-13-01",
};
export const mockClinStartAfterEnd: Clin = {
  ...mockClin,
  pop_start_date: tomorrow,
  pop_end_date: today,
};
export const mockClinStartEqualsEnd: Clin = {
  ...mockClin,
  pop_start_date: today,
  pop_end_date: today,
};
export const mockClinAlreadyEnded: Clin = {
  ...mockClin,
  pop_end_date: yesterday,
};
export const mockClinLessThanZeroFunds: Clin = {
  ...mockClin,
  obligated_funds: -1,
  total_clin_value: -1,
};
export const mockClinZeroFunds: Clin = {
  ...mockClin,
  obligated_funds: 0,
  total_clin_value: 0,
};
export const mockClinObligatedGreaterThanTotal: Clin = {
  ...mockClin,
  obligated_funds: 2,
  total_clin_value: 1,
};
export const mockClinNotANumberFunds = {
  // return type can't be Clin for this mock because strings
  // below don't meet the Clin interface
  ...mockClin,
  obligated_funds: "not a number",
  total_clin_value: "not a number",
};
// clins containing bad data that should each cause validation errors
const mockClinArrayBadData = [
  mockClinInvalidClinNumberTooShort,
  mockClinInvalidClinNumberTooLong,
  mockClinInvalidClinNumberAllZeros,
  mockClinInvalidDates,
  mockClinStartAfterEnd,
  mockClinStartEqualsEnd,
  mockClinAlreadyEnded,
  mockClinLessThanZeroFunds,
  mockClinZeroFunds,
  mockClinObligatedGreaterThanTotal,
  // mockClinNotANumberFunds, - doesn't satisfy Clin interface
];
export const mockFundingStepBadData: FundingStep = {
  task_orders: [
    {
      task_order_number: "12345678910",
      task_order_file: mockTaskOrderFile,
      clins: mockClinArrayBadData,
    },
  ],
};
