/**
 * Unified Excel Parser Utility
 * Centralizes all Excel file parsing logic for consistency and performance
 */

import XLSX from 'xlsx';

/**
 * Find column key by name (case-insensitive)
 * @param {Object} headerRow - First row from Excel with column names
 * @param {string} targetColumn - Column name to find
 * @returns {string|null} Column key if found, null otherwise
 */
function findColumnKey(headerRow, targetColumn) {
  if (!headerRow) return null;
  const lowerTarget = targetColumn.toLowerCase();
  return Object.keys(headerRow).find(key => key.toLowerCase() === lowerTarget) || null;
}

/**
 * Parse emails from Excel buffer
 * O(n) complexity - single pass
 * @param {Buffer} buffer - Excel file buffer
 * @param {Object} options - Parse options
 * @returns {string[]} Array of unique emails
 */
export function parseEmailsFromBuffer(buffer, options = {}) {
  const { columnName = 'email', includeData = false } = options;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return includeData ? [] : [];
    }

    const columnKey = findColumnKey(rows[0], columnName);
    if (!columnKey) {
      throw new Error(`Column "${columnName}" not found in Excel file`);
    }

    const emailMap = new Map();

    for (const row of rows) {
      const email = String(row[columnKey] || '').trim().toLowerCase();
      if (email && !emailMap.has(email)) {
        emailMap.set(email, includeData ? row : null);
      }
    }

    return includeData ? Object.fromEntries(emailMap) : Array.from(emailMap.keys());
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Parse emails from file path
 * @param {string} filePath - Path to Excel file
 * @param {Object} options - Parse options
 * @returns {string[]} Array of unique emails
 */
export function parseEmailsFromFile(filePath, options = {}) {
  const { columnName = 'email', includeData = false } = options;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return includeData ? {} : [];
    }

    const columnKey = findColumnKey(rows[0], columnName);
    if (!columnKey) {
      throw new Error(`Column "${columnName}" not found in Excel file`);
    }

    const emailMap = new Map();

    for (const row of rows) {
      const email = String(row[columnKey] || '').trim().toLowerCase();
      if (email && !emailMap.has(email)) {
        emailMap.set(email, includeData ? row : null);
      }
    }

    return includeData ? Object.fromEntries(emailMap) : Array.from(emailMap.keys());
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Extract rows with email and optional name columns
 * @param {Buffer|string} input - Excel buffer or file path
 * @param {Object} options - Parse options
 * @returns {Array} Array of {email, name, ...otherFields} objects
 */
export function extractRecipients(input, options = {}) {
  const { columnName = 'email', nameColumn = 'name', isBuffer = false } = options;

  try {
    let rows;

    if (isBuffer) {
      const workbook = XLSX.read(input, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      const workbook = XLSX.readFile(input);
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    const emailKey = findColumnKey(rows[0], columnName);
    const nameKey = findColumnKey(rows[0], nameColumn);

    if (!emailKey) {
      throw new Error(`Column "${columnName}" not found`);
    }

    const recipients = [];
    const emailSet = new Set();

    for (const row of rows) {
      const email = String(row[emailKey] || '').trim().toLowerCase();
      if (email && !emailSet.has(email)) {
        emailSet.add(email);
        recipients.push({
          email,
          name: nameKey ? String(row[nameKey] || '').trim() : '',
          ...row,
        });
      }
    }

    return recipients;
  } catch (error) {
    throw new Error(`Failed to extract recipients: ${error.message}`);
  }
}

/**
 * Extract content from Excel (for messages, etc.)
 * @param {Buffer|string} input - Excel buffer or file path
 * @param {string} columnName - Column name containing content
 * @param {boolean} isBuffer - Whether input is buffer or file path
 * @returns {string[]} Array of non-empty content strings
 */
export function extractContent(input, columnName = 'message', isBuffer = false) {
  try {
    let rows;

    if (isBuffer) {
      const workbook = XLSX.read(input, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    } else {
      const workbook = XLSX.readFile(input);
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }

    const contentKey = findColumnKey(rows[0] || {}, columnName);
    if (!contentKey) {
      throw new Error(`Column "${columnName}" not found`);
    }

    return rows
      .map(row => String(row[contentKey] || '').trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to extract content: ${error.message}`);
  }
}

/**
 * Get single content item (first row)
 * @param {Buffer|string} input - Excel buffer or file path
 * @param {string} columnName - Column name
 * @param {boolean} isBuffer - Whether input is buffer or file path
 * @returns {string} Content string or empty string
 */
export function extractSingleContent(input, columnName = 'message', isBuffer = false) {
  const content = extractContent(input, columnName, isBuffer);
  return content[0] || '';
}

/**
 * Validate Excel file structure
 * @param {Buffer|string} input - Excel buffer or file path
 * @param {string[]} requiredColumns - Column names that must exist
 * @param {boolean} isBuffer - Whether input is buffer or file path
 * @returns {boolean|Object} True if valid, or object with validation errors
 */
export function validateExcelStructure(input, requiredColumns = [], isBuffer = false) {
  try {
    let rows;

    if (isBuffer) {
      const workbook = XLSX.read(input, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      const workbook = XLSX.readFile(input);
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    if (!rows || rows.length === 0) {
      return { valid: false, error: 'Excel file is empty' };
    }

    const headerRow = rows[0];
    const headerKeys = Object.keys(headerRow).map(k => k.toLowerCase());

    const missing = [];
    for (const col of requiredColumns) {
      if (!headerKeys.includes(col.toLowerCase())) {
        missing.push(col);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required columns: ${missing.join(', ')}`,
        missing,
      };
    }

    return { valid: true, rowCount: rows.length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default {
  parseEmailsFromBuffer,
  parseEmailsFromFile,
  extractRecipients,
  extractContent,
  extractSingleContent,
  validateExcelStructure,
  findColumnKey,
};
