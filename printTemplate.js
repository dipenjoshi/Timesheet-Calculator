/**
 * Generates the HTML template for the time card summary print window.
 * @param {string} employeeName - The name of the employee.
 * @param {string} dateRangeDisplay - The date range to display.
 * @param {string} entriesHtml - The table rows with time entries.
 * @param {number} totalHours - The total hours worked.
 * @param {number} incomeEarned - The income earned.
 * @returns {string} The complete HTML document as a string.
 */
const generatePrintTemplate = (employeeName, dateRangeDisplay, entriesHtml, totalHours, incomeEarned) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Time Card Summary - ${employeeName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; margin: 10px; } /* Reduced margin */
                .print-content { width: 100%; margin: 0 auto; padding: 10px; box-sizing: border-box; } /* Reduced padding */
                h3 { text-align: center; margin-bottom: 0.5em; font-size: 1.1em; } /* Smaller font for h3 */
                table { width: 100%; border-collapse: collapse; margin-bottom: 0.5em; } /* Reduced margin */
                th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; font-size: 0.8em; } /* Reduced padding and font size */
                .text-right { text-align: right; }
                .total-row td { font-weight: bold; }
                .contractual-line { margin-top: 1em; text-align: center; font-size: 0.75em; } /* Smaller font size */
                .signature-block { margin-top: 2em; display: flex; justify-content: space-around; width: 90%; margin-left: auto; margin-right: auto;} /* Reduced margin, increased width */
                .signature-item { flex: 1; text-align: center; margin: 0 5px; } /* Reduced margin */
                .signature-line { border-top: 1px solid #000; padding-top: 3px; margin-top: 1em; } /* Reduced padding and margin */
                .date-line { border-top: 1px solid #000; padding-top: 3px; margin-top: 1em; } /* Reduced padding and margin */
            </style>
        </head>
        <body>
            <div class="print-content">
                <h3>Time Card Summary for ${employeeName}</h3>
                <p style="text-align: center; margin-bottom: 1em; font-size: 0.9em;">Date Range: ${dateRangeDisplay}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th class="text-right">Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entriesHtml}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3" class="text-right">Total Hours for Range:</td>
                            <td class="text-right">${totalHours.toFixed(2)}h</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="3" class="text-right">Income Earned:</td>
                            <td class="text-right">$${incomeEarned}</td>
                        </tr>
                    </tfoot>
                </table>

                <p class="contractual-line">I hereby agree to these times and have taken the above printed payment.</p>
                
                <div class="signature-block">
                    <div class="signature-item">
                        <div class="signature-line"></div>
                        <span>Employee Signature</span>
                    </div>
                    <div class="signature-item">
                        <div class="date-line"></div>
                        <span>Date</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};
