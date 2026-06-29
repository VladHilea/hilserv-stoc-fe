export const printHtmlLabel = (htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
          </style>
        </head>
        <body onload="window.print();">
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // Remove iframe after printing dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }
};
