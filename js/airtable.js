/**
 * Client-side helper for interacting with Airtable via Cloudflare Pages Functions
 * This makes API calls to /api/airtable which runs server-side with the secure token
 */

class AirtableClient {
  constructor() {
    this.apiBase = '/api/airtable';
  }

  /**
   * Get records from a table
   * @param {string} tableName - Name of the Airtable table
   * @param {object} options - Query options
   * @param {string} options.view - View name (default: 'Grid view')
   * @param {number} options.maxRecords - Maximum records to return (default: 100)
   * @param {string} options.filterByFormula - Airtable filter formula
   * @returns {Promise<object>} Airtable response with records
   */
  async getRecords(tableName, options = {}) {
    const params = new URLSearchParams({ table: tableName });
    
    if (options.view) params.append('view', options.view);
    if (options.maxRecords) params.append('maxRecords', options.maxRecords.toString());
    if (options.filterByFormula) params.append('filterByFormula', options.filterByFormula);

    const response = await fetch(`${this.apiBase}?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch records');
    }

    return await response.json();
  }

  /**
   * Get a single record by ID
   * @param {string} tableName - Name of the Airtable table
   * @param {string} recordId - Record ID
   * @returns {Promise<object>} Airtable record
   */
  async getRecord(tableName, recordId) {
    const params = new URLSearchParams({ 
      table: tableName,
      recordId: recordId
    });

    const response = await fetch(`${this.apiBase}?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch record');
    }

    return await response.json();
  }

  /**
   * Create a new record
   * @param {string} tableName - Name of the Airtable table
   * @param {object|array} fields - Field data (object for single record, array for multiple)
   * @returns {Promise<object>} Created record(s)
   */
  async createRecord(tableName, fields) {
    const params = new URLSearchParams({ table: tableName });
    
    const response = await fetch(`${this.apiBase}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create record');
    }

    return await response.json();
  }

  /**
   * Update an existing record
   * @param {string} tableName - Name of the Airtable table
   * @param {string} recordId - Record ID to update
   * @param {object} fields - Updated field data
   * @returns {Promise<object>} Updated record
   */
  async updateRecord(tableName, recordId, fields) {
    const params = new URLSearchParams({ 
      table: tableName,
      recordId: recordId
    });
    
    const response = await fetch(`${this.apiBase}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update record');
    }

    return await response.json();
  }
}

// Create a global instance
const airtable = new AirtableClient();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AirtableClient, airtable };
}

// Make available globally
window.AirtableClient = AirtableClient;
window.airtable = airtable;

