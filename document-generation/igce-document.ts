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

export async function generateIGCEDocument(
  templatePath: string,
  payload: IndependentGovernmentCostEstimate
): Promise<ApiBase64SuccessResponse> {
  // Validation of periodsEstimate
  if (!payload.periodsEstimate && !payload.fundingDocument && !payload.surgeCapabilities) {
    return INTERNAL_SERVER_ERROR;
  }
  // Sort the base period and option periods
  const basePeriodLineItems = payload.periodsEstimate.filter((periodEstimate: IPeriodEstimate) => {
    return periodEstimate.period.periodType === PeriodType.BASE;
  });
  const optionPeriodsLineItems = payload.periodsEstimate
    .filter((periodEstimate: IPeriodEstimate) => {
      return periodEstimate.period.periodType === PeriodType.OPTION;
    })
    .sort((a, b) => a.period.optionOrder - b.period.optionOrder);

  // Set fundingDocumentNumber variable
  // Located at the top of each Period sheet
  let fundingDoc;
  let fundingDocumentNumber = "";
  if (payload.fundingDocument) {
    fundingDoc = payload.fundingDocument;
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
  }
  // Set references for clin and contract drop down boxes
  // These references are on the CLIN Info Page, consist of x001/x017 Cloud UNCLASSIFIED and other CLINs
  const clinRangeString = `'CLIN Info'!$G$2:$G$9`;
  const contractRangeString = `'CLIN Info'!$H$2:$H$4`;

  // Determine unique CLINs from payload...
  // Sort them based on optionOrder
  const uniqueAndSorted = [...new Set(payload.periodsEstimate)].sort(
    (a, b) => a.period.optionOrder - b.period.optionOrder
  );

  // On the Summary sheet, contractCLINHelper will be used to fill
  // unique CLINs with associated contract type.
  const contractCLINHelper: Array<{ clin: string; contract: string }> = [];
  uniqueAndSorted.forEach(function (item) {
    item.periodLineItems.forEach(function (lineItem) {
      contractCLINHelper.push({ clin: lineItem.idiqClin.trim(), contract: lineItem.contractType });
    });
  });
  // Sort CLINs on Summary Page alphabetically
  contractCLINHelper.sort((a, b) => a.clin.localeCompare(b.clin));
  const uniqueCLINwithContract = [...new Map(contractCLINHelper.map((item) => [item.clin, item])).values()];

  // Use Exceljs to generate the workbook
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const summarySheet = workbook.getWorksheet("Summary");

  /* Period sheet helper is used to get the specific cell reference ranges for the summary sheet
    that are generated during populatePeriodLineItems.
    Example output for periodSheetHelper: 
      { period: 'Base Period', cellRef: 'A41:I54' }
      { period: 'Option Period 1', cellRef: 'A28:I41' }
      { period: 'Option Period 2', cellRef: 'A28:I41' }
  */
  const periodSheetHelper: Array<{ period: string; cellRef: string }> = [];

  // Populate Period sheets (Base and Option Periods)
  function populatePeriodLineItems(estimate: IPeriodEstimate): void {
    const { optionOrder, periodUnit, periodUnitCount, periodType } = estimate.period;
    const periodLineItems = estimate.periodLineItems;
    periodLineItems.sort((a, b) => a.idiqClin.localeCompare(b.idiqClin));
    // unique IDIQ Clins PER period sheet
    const uniqueIdiqClins = Array.from(new Set(periodLineItems.map((lineItem) => lineItem.idiqClin)));
    const periodSheetTopStartRow = 8; // On a Period Sheet, the first row is row 8 (see template)
    const periodSheetBottomStartRow = 28; // On a Period Sheet, the first row for the CLIN total calculations is 28
    let periodSheetName: string;
    if (periodType === PeriodType.BASE) {
      periodSheetName = "Base Period";
    } else {
      periodSheetName = `Option Period ${optionOrder - 1}`;
      // optionOrder for Base Period is 1, optionOrder for Option Period 1 is 2, optionOrder for Option Period 2 is 3...
      // For determining periodSheetName we need to subtract 1 from the optionOrder of the estimate.period...
      // Old functionality had Base Period's optionOrder as null and Option Period 1 use optionOrder 1...
    }

    // Get the specific worksheet
    const periodSheet =
      periodType === PeriodType.BASE
        ? workbook.getWorksheet("Base Period")
        : workbook.getWorksheet(`Option Period ${optionOrder - 1}`);

    // Set Period of Performance and Funding Document Number
    // Located at the top of each Period Sheet
    const pop = `${periodUnitCount} ${periodUnit[0] + periodUnit.slice(1).toLowerCase()}(s)`;
    periodSheet.getCell("C2").value = pop;
    periodSheet.getCell("C3").value = fundingDocumentNumber;

    // Track number of Line Items in periodLineItems
    // 20 is the default number of rows built into the template
    // If there are more than 20 items in periodLineItems for a given period, we will need to use
    // duplicateRow to extend the space alotted for these items... using duplicateRow preserves formatting
    const initialUsableRows = 20;
    let numberOfRowsToAdd = 0;
    const numberOfItems = periodLineItems.length;
    if (numberOfItems > initialUsableRows) {
      // If there are more than 20 periodLineItems for a given period, add rows = to the difference
      numberOfRowsToAdd = numberOfItems - initialUsableRows;
      console.log("Number of rows to add: " + numberOfRowsToAdd);
      periodSheet.duplicateRow(26, numberOfRowsToAdd, true);
    }

    // Get lineItemRows
    const lineItemRows = periodSheet.getRows(periodSheetTopStartRow, numberOfItems);

    // Fill each cell in the designated row with periodLineItems info
    lineItemRows?.forEach((row, index) => {
      // Set dropdown for the PeriodSheet cells column A (CLIN/CLIN Title/Classification Level)
      row.getCell("A").value = periodLineItems[index].idiqClin; // idiqClin
      row.getCell("A").dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [clinRangeString],
      };
      // Set dropdown for the PeriodSheet cells column B (Contract)
      row.getCell("B").value = periodLineItems[index].contractType; // Contract Type
      row.getCell("B").dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [contractRangeString],
      };
      // Set specific values based on the the incomming periodLine items
      row.getCell("C").value = periodLineItems[index].dowTaskNumber; // "4.2.2.1.1";
      row.getCell("D").value = periodLineItems[index].serviceTitle; // "Compute";
      row.getCell("E").value = periodLineItems[index].itemDescription; // Description
      row.getCell("F").value = periodLineItems[index].unitPrice; // Unit Price
      row.getCell("G").value = periodLineItems[index].quantity; // Quantity
      row.getCell("H").value = periodLineItems[index].unit; // Unit

      // Set the total price forumla
      // Example value =F8*G8
      const totalPrice = `=F${row.number}*G${row.number}`;
      row.getCell("I").value = { formula: totalPrice, date1904: false };
      // date 1904 is required or exceljs will have an error generating the document
    });

    // Populate unique IDIQ CLIN items
    // Located on each Period Sheet (lower half)
    const periodIdiqClinLines = periodSheet.getRows(
      periodSheetBottomStartRow + numberOfRowsToAdd,
      uniqueIdiqClins.length
    );
    // For each IDIQ CLIN Line item
    periodIdiqClinLines?.forEach((row, index) => {
      row.getCell("A").value = uniqueIdiqClins[index];
      // Set formula for totalIdiqClinValue
      const totalIdiqClinValue = `=SUMIF($A${periodSheetTopStartRow}:$A$${
        periodSheetBottomStartRow + numberOfRowsToAdd - 1
      },"="&A$${row.number},'${periodSheetName}'!$I$${periodSheetTopStartRow}:$I$${
        periodSheetBottomStartRow + numberOfRowsToAdd
      })`;
      // Fill formula for the specified cell
      row.getCell("I").value = { formula: totalIdiqClinValue, date1904: false };
    });

    // Set periodCellSummary caluclation, this is pushed to periodSheetHelper as cellRef, and used in the summary sheet
    const periodCellSummaryCalculation = `A${periodSheetBottomStartRow + numberOfRowsToAdd}:I${
      periodSheetBottomStartRow + numberOfRowsToAdd + 13
    }`;
    periodSheetHelper.push({ period: periodSheetName, cellRef: periodCellSummaryCalculation });

    // Set the formula for the Total Price of the period sheet (bottom right of table)
    const totalPeriodValueFormula = `=SUM(I${periodSheetBottomStartRow + numberOfRowsToAdd}:I${
      periodSheetBottomStartRow + numberOfRowsToAdd + 13
    })`;
    // Fill the formula for the Total price of the selected period sheet
    periodSheet.getCell(`I${periodSheetBottomStartRow + numberOfRowsToAdd + 14}`).value = {
      formula: totalPeriodValueFormula,
      date1904: false,
    };
  }
  // Use populatePeriodLine items on each item in the periodsEstimate array...
  // For each PeriodLineItem in the BASE Period, populatePeriodLineItems()
  basePeriodLineItems.forEach(populatePeriodLineItems);
  // For each PeriodLineItem in the OPTION Period, populatePeriodLineItems()
  optionPeriodsLineItems.forEach(populatePeriodLineItems);

  console.log("Period sheet helper output: ");
  periodSheetHelper.forEach(function (value) {
    console.log(value);
  });

  // Set summary page calculation cells
  const summaryRows = summarySheet.getRows(6, uniqueCLINwithContract.length);
  summaryRows?.forEach((row, index) => {
    row.getCell("A").dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [clinRangeString],
    };
    row.getCell("A").value = uniqueCLINwithContract[index].clin;
    // CELL C is Contract
    row.getCell("C").dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [contractRangeString],
    };
    row.getCell("C").value = uniqueCLINwithContract[index].contract;

    // CELL D is always Base Period
    const basePeriodCell = periodSheetHelper.find((obj) => {
      return obj.period === "Base Period";
    });
    const basePeriodCalc = `=IFERROR(VLOOKUP(A${row.number},'Base Period'!${basePeriodCell!.cellRef},9, FALSE),0)`;
    row.getCell("D").value = { formula: basePeriodCalc, date1904: false };
    // CELL E is always Option Period 1
    for (let i = 1; i <= 6; i++) {
      const optionPeriod = periodSheetHelper.find((obj) => {
        return obj.period === `Option Period ${i}`;
      });
      // Skip filling in any option periods that don't exist
      if (!optionPeriod) continue;
      const optionPeriodCalc = `=IFERROR(VLOOKUP(A${row.number},
        'Option Period ${i}'!${optionPeriod.cellRef},9, FALSE),0)`;
      // The base period is "D" and all option periods are offset from that
      const col = String.fromCharCode("D".charCodeAt(0) + i);
      console.log(col);
      row.getCell(col).value = { formula: optionPeriodCalc, date1904: false };
    }
  });
  // Set static Summary sheet cell values
  // Funding Document Number
  const summaryFundingDocCell = summarySheet.getCell("A3");
  summaryFundingDocCell.value = fundingDocumentNumber;

  // Surge Capabilities
  const surgeCapabilities = summarySheet.getCell("A23");
  surgeCapabilities.value = payload.surgeCapabilities / 100;

  // DITCO Fee / Contracting Shop Fee
  const contractingShopName = summarySheet.getCell("B26");
  const contractingShopFee = summarySheet.getCell("C26");
  if (payload.contractingShop.name === "OTHER") {
    contractingShopName.value = "Contracting Office Fee";
    if (payload.contractingShop.fee > 0) {
      const fee = (payload.contractingShop.fee / 100).toFixed(2); // round to 2 decimal places
      contractingShopFee.value = { formula: `=K24 *${fee}`, date1904: false };
    }
  } else if (payload.contractingShop.name === "DITCO") {
    contractingShopName.value = "DITCO Fee";
    contractingShopFee.value = { formula: `=K24 *.0225`, date1904: false };
  }
  // Grand Total With Fee
  const grandTotalWithFee = summarySheet.getCell("C27");
  grandTotalWithFee.value = { formula: `=C26 + K24`, date1904: false };
  // ^End of Summary sheet static cells

  // Set Instruction Sheet Cells
  const instructionSheet = workbook.getWorksheet("INSTRUCTIONS-MUST COMPLETE");
  const estimateMadeCell = instructionSheet.getCell("B11");
  estimateMadeCell.value = payload.instructions.estimateDescription;
  const infoToolsCell = instructionSheet.getCell("B12");
  infoToolsCell.value = payload.instructions.toolsUsed;
  const previousEstimate = instructionSheet.getCell("B13");
  previousEstimate.value = payload.instructions.previousEstimateComparison;

  // Create a Buffer to store finished workbook
  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
  logger.info("IGCE document generated");
  // Set headers of API Response
  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=IndependentGovernmentCostEstimate.xlsx`,
  };

  return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, headers);
}
