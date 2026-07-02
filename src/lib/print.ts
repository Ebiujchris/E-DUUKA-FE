/**
 * Opens a new window with the given HTML, waits for it to load,
 * then triggers the print dialog. Works as both Print and Save as PDF.
 */
export function printHtml(html: string, title = 'E-DUUKA') {
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) { alert('Please allow popups to print / download.'); return; }

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 24px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 15px; font-weight: 600; margin: 16px 0 8px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #475569; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card .label { font-size: 11px; color: #64748b; }
    .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .green { color: #16a34a; } .red { color: #dc2626; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
    @media print {
      body { padding: 0; }
      @page { margin: 18mm; }
    }
  </style>
</head>
<body>${html}<script>window.onload = () => { window.print(); }<\/script></body>
</html>`);
  win.document.close();
}
