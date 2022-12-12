import exceljs, { Row, Worksheet } from "exceljs";
import { logger } from "../utils/logging";

import {
  FundingType,
  IndependentGovernmentCostEstimate,
  IPeriodEstimate,
  PeriodType,
} from "../models/document-generation";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { convertPeriodToMonths } from "./utils/utils";

export async function generateIGCEDocument(
  templatePath: string,
  payload: IndependentGovernmentCostEstimate
): Promise<ApiBase64SuccessResponse> {
  if (!payload.periodsEstimate && !payload.fundingDocument && !payload.surgeCapabilities) {
    return INTERNAL_SERVER_ERROR;
  }

  // sort the base period and option periods
  const basePeriodLineItems = payload.periodsEstimate.filter((periodEstimate: IPeriodEstimate) => {
    return periodEstimate.period.periodType === PeriodType.BASE;
  });
  const optionPeriodsLineItems = payload.periodsEstimate
    .filter((periodEstimate: IPeriodEstimate) => {
      return periodEstimate.period.periodType === PeriodType.OPTION;
    })
    .sort((a, b) => a.period.optionOrder - b.period.optionOrder);

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(templatePath);

  // variables used within the sheets
  const fundingDoc = payload.fundingDocument;
  let fundingDocumentNumber: string;
  switch (fundingDoc.fundingType) {
    case FundingType.FS_FORM:
      fundingDocumentNumber = `Order Number: ${fundingDoc.orderNumber} and GT&C Number: ${fundingDoc.gtcNumber}`;
      break;
    case FundingType.MIPR:
      fundingDocumentNumber = `MIPR Number: ${fundingDoc.miprNumber}`;
      break;
    default:
      fundingDocumentNumber = "";
  }

  const summarySheet = workbook.getWorksheet("Summary");
  const allPeriodsIdiqClins: string[] = [];
  const summarySheetColumnsToExtend: string[] = []; // keep track of columns to extend
  let summarySheetIdiqClinCounter = 0; // keep count of unique idiq clins of each period

  // function that populates each period sheet
  function populatePeriodLineItems(estimate: IPeriodEstimate): void {
    const { optionOrder, periodUnit, periodUnitCount, periodType } = estimate.period;
    const periodLineItems = estimate.periodLineItems;
    const uniqueIdiqClins = Array.from(new Set(periodLineItems.map((lineItem) => lineItem.idiqClin)));
    const periodSheetTopHalfInitialStartRow = 8;
    const periodSheetLowerHalfInitialStartRow = 28;
    const mappingOfPeriodsToColumnOnSummarySheet: { [key: string]: string } = {
      "Base Period": "D",
      "Option Period 1": "E",
      "Option Period 2": "F",
      "Option Period 3": "G",
      "Option Period 4": "H",
      "Option Period 5": "I",
      "Option Period 6": "J",
    };

    const periodSheet =
      periodType === PeriodType.BASE
        ? workbook.getWorksheet("Base Period")
        : workbook.getWorksheet(`Option Period ${optionOrder}`);

    const pop = `${periodUnitCount} ${periodUnit[0] + periodUnit.slice(1).toLowerCase()}(s)`;
    periodSheet.getCell("C2").value = pop;
    periodSheet.getCell("C3").value = fundingDocumentNumber;

    // add each line item to the period sheet (top half)
    const numberOfItems = periodLineItems.length;
    const lineItemRows = periodSheet.getRows(periodSheetTopHalfInitialStartRow, numberOfItems);

    lineItemRows?.forEach((row, index) => {
      // fill each line item data
      row.getCell("A").value = periodLineItems[index].idiqClin; // "1000 Cloud";
      row.getCell("B").value = periodLineItems[index].contractType; // FFP or T&M
      row.getCell("C").value = periodLineItems[index].dowTaskNumber; // "4.2.2.1.1";
      row.getCell("D").value = periodLineItems[index].serviceOffering; // "Compute";
      row.getCell("E").value = periodLineItems[index].itemDescriptionOrConfigSummary; // "Compute - special project"
      row.getCell("F").value = periodLineItems[index].unitPrice; // "Compute - special project"
      row.getCell("G").value = periodLineItems[index].unitQuantity; // "Compute - special project"
    });

    // add additional rows to offset the numbers used on the summary sheet for idiq clins
    const initialUsableRows = 12;
    const lowerHalfEndingRow = periodSheetLowerHalfInitialStartRow + initialUsableRows;
    const expectedLinesNeeded = summarySheetIdiqClinCounter + uniqueIdiqClins.length;
    if (expectedLinesNeeded > initialUsableRows) {
      const summarySheetAdditionalRows = uniqueIdiqClins.length + 2;
      periodSheet.duplicateRow(lowerHalfEndingRow, summarySheetAdditionalRows, true);

      // update the formula of the duplicated rows
      periodSheet.eachRow((row, rowNumber) => {
        updatePeriodFormulas(row, rowNumber, periodSheet);
      });

      // update formulas on summary sheet if additional rows were added
      summarySheetColumnsToExtend.push(mappingOfPeriodsToColumnOnSummarySheet[periodSheet.name]);
    }

    // populate unique IDIQ CLIN items used on the period sheet (lower half)
    const periodIdiqClinLines = periodSheet.getRows(
      periodSheetLowerHalfInitialStartRow + summarySheetIdiqClinCounter,
      uniqueIdiqClins.length
    );
    periodIdiqClinLines?.forEach((row, index) => {
      row.getCell("A").value = uniqueIdiqClins[index];
      allPeriodsIdiqClins.push(uniqueIdiqClins[index]);
      summarySheetIdiqClinCounter++;
    });
  }

  // populate period sheets
  basePeriodLineItems.forEach(populatePeriodLineItems);
  optionPeriodsLineItems.forEach(populatePeriodLineItems);

  // Summary sheet
  // funding document number (A3)
  const summaryFundingDocCell = summarySheet.getCell("A3");
  summaryFundingDocCell.value = fundingDocumentNumber;

  // surge capabilities (A23)
  const summarySurge = summarySheet.getCell("A23");
  summarySurge.value = payload.surgeCapabilities / 100;

  // populate the summary sheet TO and IDIQ CLIN
  let summarySheetAdditionalRows = 0;
  const summarySheetInitialRow = 6;
  const availableSummarySheetRows = 14;
  const lastSummarySheetRow = 19;

  if (allPeriodsIdiqClins.length > availableSummarySheetRows) {
    summarySheetAdditionalRows = allPeriodsIdiqClins.length - availableSummarySheetRows;
    summarySheet.duplicateRow(lastSummarySheetRow, summarySheetAdditionalRows, true);
    const ref = `K6:K${summarySheetInitialRow + availableSummarySheetRows + summarySheetAdditionalRows}`;

    // update ref formula to include the additional rows
    const cell: any = summarySheet.getCell("K6").value;
    summarySheet.getCell("K6").value = { ...cell, ref };
  }

  // populate the TO and IDIQ CLIN from the period sheets
  const summarySheetEstimateRows = summarySheet.getRows(summarySheetInitialRow, allPeriodsIdiqClins.length);
  summarySheetEstimateRows?.forEach((row, index) => {
    const displayIdiqClin = allPeriodsIdiqClins[index].slice(0, 3) + "x";
    row.getCell("A").value = displayIdiqClin;
    row.getCell("B").value = displayIdiqClin + " " + allPeriodsIdiqClins[index].slice(5);
  });

  // update each column formula for the added rows on the summary sheet
  const initialDuplicatedRow = lastSummarySheetRow + 1;
  const periodSheetRowOffset = 22;
  const duplicatedSummaryRows = summarySheet.getRows(initialDuplicatedRow, summarySheetAdditionalRows);
  duplicatedSummaryRows?.forEach((row) => {
    if (row.number > lastSummarySheetRow) {
      // update the formulas in columns that required additional rows
      summarySheetColumnsToExtend.forEach((col) => {
        const data: any = summarySheet.getCell(`${col}${row.number}`).value;

        // mapping formulas to columns that were added
        const summaryCols = ["D", "E", "F", "G", "H", "I", "J"];
        if (col !== "D") {
          summarySheet.getCell(`${col}${row.number}`).value = {
            ...data,
            formula: `'Option Period ${summaryCols.indexOf(col)}'!J${row.number + periodSheetRowOffset}`,
          };
        } else {
          summarySheet.getCell(`${col}${row.number}`).value = {
            ...data,
            formula: `'Base Period'!J${row.number + periodSheetRowOffset}`,
          };
        }
      });
    }
  });

  // offset the summary calculations if rows added
  updateSummaryFormulas(summarySheetAdditionalRows, summarySheet);

  // exceljs does not support text boxs or shapes and the signature text box
  // is removed during generation of the IGCE document
  // see https://github.com/exceljs/exceljs/issues/1147
  // Add in signature rows to replace the removed text box
  const summarySheetSignatureRow = 31 + summarySheetAdditionalRows;
  summarySheet.getCell(`A${summarySheetSignatureRow}`).value = "Preparer Name: _____________________";
  summarySheet.getCell(`A${summarySheetSignatureRow + 1}`).value = "Title: _____________________________";
  summarySheet.getCell(`A${summarySheetSignatureRow + 2}`).value = "Email: _____________________________";
  summarySheet.getCell(`A${summarySheetSignatureRow + 4}`).value = "Signature: _________________________";

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=IndependentGovernmentCostEstimate.xlsx`,
  };

  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
  logger.info("IGCE document generated");

  return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, headers);
}

function updatePeriodFormulas(row: Row, rowNumber: number, sheet: Worksheet): void {
  const rowValues: any = row.values;
  const cellId = `I${rowNumber}`;
  if (rowValues[9] && String(rowValues[9].formula).includes("&C")) {
    const formula: string = rowValues[9].formula;
    const splitFormula = formula.split("&C");
    const newFormula = splitFormula[0] + `&C${rowNumber}` + splitFormula[1].slice(2);
    const cell = sheet.getCell(cellId);
    sheet.getCell(cellId).value = { ...cell, formula: newFormula };
  }

  if (String(rowValues[7]).includes("Total Price")) {
    const totalCell = sheet.getCell(cellId);
    sheet.getCell(cellId).value = { ...totalCell, formula: `=SUM(I28:I${rowNumber - 1})` };
  }
}

function updateSummaryFormulas(numberOfAddedRows: number, sheet: Worksheet): void {
  const initialSumRow = 22;
  const summaryStartRow = initialSumRow + numberOfAddedRows;
  const columns = ["C", "D", "E", "F", "G", "H", "I", "J"];

  // removed original calculations due to an error with master and shared formula types
  // added back in the original formulas to calculate totals
  const summaryCalculations = sheet.getRows(summaryStartRow, 3);
  summaryCalculations?.forEach((row, index) => {
    columns.forEach((col) => {
      const cellId = `${col}${row.number}`;
      const cell = sheet.getCell(cellId);
      let updatedFormula;

      switch (index) {
        case 0:
          updatedFormula = `=SUM(${col}6:${col}${row.number - 3})`;
          break;
        case 1:
          updatedFormula = `=${col}${row.number - 1}*.0225`;
          break;
        case 2:
          updatedFormula = `=SUM(${col}${row.number - 2}:${col}${row.number - 1})`;
          break;
        default:
          updatedFormula = "";
      }
      sheet.getCell(cellId).value = { ...cell, formula: updatedFormula };
    });
  });

  // update final cells to produce the grand total
  const initialPeriodsSumRow = 24;
  const initialGrandTotalCalculationStartRow = 26;
  const updatedStartingRow = initialGrandTotalCalculationStartRow + numberOfAddedRows;

  // total
  const totalCellId = `C${updatedStartingRow}`;
  const totalCell = sheet.getCell(totalCellId);
  sheet.getCell(totalCellId).value = { ...totalCell, formula: `=J${initialPeriodsSumRow + numberOfAddedRows}` };

  // total with fee
  const ditcoFeeCellId = `C${updatedStartingRow + 1}`;
  const ditcoFeeCell = sheet.getCell(ditcoFeeCellId);
  sheet.getCell(ditcoFeeCellId).value = { ...ditcoFeeCell, formula: `=${totalCellId}*.0225` };

  // grand total
  const grandTotalCellId = `C${updatedStartingRow + 2}`;
  const grandTotalCell = sheet.getCell(grandTotalCellId);
  sheet.getCell(grandTotalCellId).value = {
    ...grandTotalCell,
    formula: `=SUM(${totalCellId}:${ditcoFeeCellId})`,
  };
}
