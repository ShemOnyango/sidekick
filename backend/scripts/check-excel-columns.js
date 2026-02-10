const ExcelJS = require('exceljs');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, '../sql/seeds/Metro Link map Data.xlsx');

async function checkColumns() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE);
  const sheet = workbook.getWorksheet('Sheet1');
  
  console.log('Header row:');
  const header = sheet.getRow(1);
  header.eachCell((cell, colNumber) => {
    console.log(`  Column ${colNumber}: ${cell.value}`);
  });
  
  console.log('\nFirst data row:');
  const row2 = sheet.getRow(2);
  row2.eachCell((cell, colNumber) => {
    console.log(`  Column ${colNumber}: ${cell.value}`);
  });
  
  console.log('\nSecond data row:');
  const row3 = sheet.getRow(3);
  row3.eachCell((cell, colNumber) => {
    console.log(`  Column ${colNumber}: ${cell.value}`);
  });
}

checkColumns().catch(console.error);
