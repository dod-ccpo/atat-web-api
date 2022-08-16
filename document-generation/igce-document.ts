import exceljs from "exceljs";
import {
  GeneratedDocument,
  IndependentGovernmentCostEstimate,
  IPeriodEstimate,
  PeriodType,
} from "../models/document-generation";
import { convertPeriodToMonths } from "./utils/utils";

export async function generateIGCEDocument(
  templatePath: string,
  payload: IndependentGovernmentCostEstimate
): Promise<GeneratedDocument> {
  const basePeriodLineItems = payload.periodsEstimate.filter((periodEstimate: IPeriodEstimate) => {
    return periodEstimate.period.periodType === PeriodType.BASE;
  });
  const optionPeriodsLineItems = payload.periodsEstimate.filter((periodEstimate: IPeriodEstimate) => {
    return periodEstimate.period.periodType === PeriodType.OPTION;
  });

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const { orderNumber, gtcNumber } = payload.fundingDocument;
  const summarySheet = workbook.getWorksheet("Summary");
  const fundingDocumentNumber = `Order Number: ${orderNumber} and GT&C Number: ${gtcNumber}`;

  function populatePeriodLineItems(estimate: IPeriodEstimate): void {
    const { optionOrder, periodUnit, periodUnitCount, periodType } = estimate.period;
    const subLineItems = estimate.periodLineItems;
    let periodSheet;
    const uniqueIdiqClins: string[] = [];

    if (periodType === PeriodType.BASE) {
      periodSheet = workbook.getWorksheet("Base Period");
    } else {
      periodSheet = workbook.getWorksheet(`Option Period ${optionOrder}`);
    }
    const pop = `${periodUnitCount} ${periodUnit[0] + periodUnit.slice(1).toLowerCase()}(s)`;
    periodSheet.getCell("C2").value = pop;
    periodSheet.getCell("C3").value = fundingDocumentNumber;

    // fill in items on a sheet
    const numberOfItems = subLineItems.length;
    const lineItemRows = periodSheet.getRows(8, numberOfItems); // was 20 rows
    lineItemRows?.forEach((row, index) => {
      if (!uniqueIdiqClins.includes(subLineItems[index].idiqClin)) {
        uniqueIdiqClins.push(subLineItems[index].idiqClin);
      }
      row.getCell("B").value = subLineItems[index].clin; // 1000
      row.getCell("C").value = subLineItems[index].idiqClin; // "1000 Cloud";
      row.getCell("D").value = subLineItems[index].dowTaskNumber; // "4.2.2.1.1";
      row.getCell("E").value = subLineItems[index].serviceOffering; // "Compute";
      row.getCell("F").value = subLineItems[index].itemDescriptionOrConfigSummary; // "Compute - for special project";
      row.getCell("G").value = subLineItems[index].monthlyPrice; // 159.03;
      // subLineItems[index].monthsInPeriod is calculated from period
      row.getCell("H").value = convertPeriodToMonths(estimate.period); // 12;
    });

    // group line items to be placed in summary page
    const lineGroupings = periodSheet.getRows(28, uniqueIdiqClins.length);
    lineGroupings?.forEach((row, index) => {
      row.getCell("H").value = uniqueIdiqClins[index];
    });
  }

  // Summary sheet
  // funding document number (A3)
  const summaryFundingDocCell = summarySheet.getCell("A3");
  summaryFundingDocCell.value = fundingDocumentNumber;
  // A23 surge capabilities (A23)
  const summarySurge = summarySheet.getCell("A23");
  summarySurge.value = payload.surgeCapabilities / 100;
  // summarySheet.commit();

  // populate period sheets
  basePeriodLineItems.forEach(populatePeriodLineItems);
  optionPeriodsLineItems.forEach(populatePeriodLineItems);

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=IndependentGovernmentCostEstimate.xlsx`,
  };

  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

  return { headers, buffer };
}
