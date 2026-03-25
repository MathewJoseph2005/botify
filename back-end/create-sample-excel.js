import XLSX from 'xlsx';

// Create a workbook and worksheet
const workbook = XLSX.utils.book_new();

// Data with proper phone formatting (India country code 91)
const data = [
  { Phone: '918075985610', Name: 'Aadarsh' },
  { Phone: '918891578012', Name: 'Sodeedh' },
  { Phone: '91889157812', Name: 'Mathew' },
];

// Create worksheet from data
const worksheet = XLSX.utils.json_to_sheet(data);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

// Write to file
XLSX.writeFile(workbook, './sample-contacts.xlsx');
console.log('✅ Excel file created: sample-contacts.xlsx');
