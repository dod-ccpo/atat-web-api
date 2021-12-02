import { ClinModel } from "../../models/Clin";
import { FileMetadataSummaryModel } from "../../models/FileMetadataSummary";
import { FundingStepModel } from "../../models/FundingStep";

const isoFormatDay = (base: number, offset = 0) => new Date(base + offset).toISOString().slice(0, 10);
export const millisInDay = 24 * 60 * 60 * 1000;
export const now = Date.now();
export const yesterday = isoFormatDay(now, -millisInDay);
export const today = isoFormatDay(now);
export const tomorrow = isoFormatDay(now, millisInDay);

export const mockFileMetadataSummary: FileMetadataSummaryModel = {
  id: "b91db32f-40fa-4225-9885-b032f0d229fe",
  name: "TO_12345678910.pdf",
};

export const mockClin: ClinModel = {
  clin_number: "0001",
  idiq_clin: "1234",
  obligated_funds: 10000,
  pop_start_date: yesterday,
  pop_end_date: tomorrow,
  total_clin_value: 200000,
};
export const mockClinObligatedEqualsTotal: ClinModel = {
  ...mockClin,
  obligated_funds: 1,
  total_clin_value: 1,
};
// clins containing good data that should not cause any validation errors
export const mockClinArrayGoodData = [mockClin, mockClinObligatedEqualsTotal];

export const mockFundingStep: FundingStepModel = {
  task_orders: [
    {
      task_order_number: "12345678910123",
      task_order_file: mockFileMetadataSummary,
      clins: [mockClin],
    },
  ],
};

/* ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA */
/* BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA */

export const mockClinInvalidClinNumberTooShort: ClinModel = {
  ...mockClin,
  clin_number: "1",
};
export const mockClinInvalidClinNumberTooLong: ClinModel = {
  ...mockClin,
  clin_number: "55555",
};
export const mockClinInvalidClinNumberAllZeros: ClinModel = {
  ...mockClin,
  clin_number: "0000",
};
export const mockClinInvalidDates: ClinModel = {
  ...mockClin,
  pop_start_date: "not an ISO date",
  pop_end_date: "2021-13-01",
};
export const mockClinStartAfterEnd: ClinModel = {
  ...mockClin,
  pop_start_date: tomorrow,
  pop_end_date: today,
};
export const mockClinStartEqualsEnd: ClinModel = {
  ...mockClin,
  pop_start_date: today,
  pop_end_date: today,
};
export const mockClinAlreadyEnded: ClinModel = {
  ...mockClin,
  pop_end_date: yesterday,
};
export const mockClinLessThanZeroFunds: ClinModel = {
  ...mockClin,
  obligated_funds: -1,
  total_clin_value: -1,
};
export const mockClinZeroFunds: ClinModel = {
  ...mockClin,
  obligated_funds: 0,
  total_clin_value: 0,
};
export const mockClinObligatedGreaterThanTotal: ClinModel = {
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
export const mockClinArrayBadData = [
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
];
export const mockFundingStepBadData: FundingStepModel = {
  task_orders: [
    {
      task_order_number: "12345678910", // invalid task number, too short
      task_order_file: mockFileMetadataSummary,
      clins: mockClinArrayBadData,
    },
  ],
};

export const mockClinArrayBadBusinessRulesData = [
  mockClinStartAfterEnd,
  mockClinAlreadyEnded,
  mockClinObligatedGreaterThanTotal,
];

export const mockFundingStepBadBusinessRulesData: FundingStepModel = {
  task_orders: [
    {
      task_order_number: "12345678910123",
      task_order_file: mockFileMetadataSummary,
      clins: mockClinArrayBadBusinessRulesData,
    },
  ],
};
