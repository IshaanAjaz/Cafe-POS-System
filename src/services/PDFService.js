import RNPrint from 'react-native-print';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const generateMonthlyReport = async (orders, expenses, monthName) => {
  try {
    const cafeName =
      (await AsyncStorage.getItem('cafe_name')) || 'Hisaab Kitaab Cafe';

    // 1. Calculate Stats (Kept exactly the same)
    const totalSales = orders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0,
    );
    const netProfit = totalSales - totalExpenses;
    const profitColor = netProfit >= 0 ? '#16a34a' : '#dc2626';

    // 2. Prepare HTML (Kept exactly the same)
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, sans-serif; padding: 20px; color: #333; }
            h1 { margin-bottom: 5px; font-size: 28px; text-transform: uppercase; }
            .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
            .summary-box { display: flex; justify-content: space-between; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .stat-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th { background-color: #0f172a; color: white; padding: 10px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${cafeName}</h1>
          <div class="meta">Financial Report: ${monthName} <br/> Generated: ${new Date().toLocaleString()}</div>
          <div class="summary-box">
            <div><div class="stat-label">Total Revenue</div><div class="stat-val">₹${totalSales.toFixed(
              2,
            )}</div></div>
            <div><div class="stat-label">Total Expenses</div><div class="stat-val">₹${totalExpenses.toFixed(
              2,
            )}</div></div>
            <div><div class="stat-label">Net Profit</div><div class="stat-val" style="color: ${profitColor}">₹${netProfit.toFixed(
      2,
    )}</div></div>
          </div>
          <h3>Sales Breakdown (${orders.length} orders)</h3>
          <table>
            <thead><tr><th>Date</th><th>Bill #</th><th>Items</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${orders
                .map(
                  o =>
                    `<tr><td>${new Date(
                      o.date,
                    ).toLocaleDateString()}</td><td>#${
                      o.billNumber || o.id
                    }</td><td style="color:#666">${JSON.parse(o.items)
                      .map(i => i.name)
                      .join(
                        ', ',
                      )}</td><td style="text-align:right; font-weight:bold">₹${o.finalTotal.toFixed(
                      2,
                    )}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <h3>Expenses Breakdown</h3>
          <table>
            <thead><tr><th>Date</th><th>Expense Title</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${expenses
                .map(
                  e =>
                    `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${
                      e.title
                    }</td><td style="text-align:right; font-weight:bold">₹${e.amount.toFixed(
                      2,
                    )}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // 3. Launch Native Print/Save Dialog
    // Use "Save as PDF" option in the dialog to save.
    await RNPrint.print({
      html: html,
      jobName: `Report_${monthName.replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
  } catch (error) {
    // If user cancels the dialog, it throws an error. We can ignore that specific one.
    if (
      error.message !== 'User canceled' &&
      error.message !== 'User cancelled'
    ) {
      console.error('PDF Error:', error);
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
    }
  }
};
