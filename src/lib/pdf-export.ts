export async function downloadTextAsPdf(
  filename: string,
  content: string,
  fontSize = 11,
  lineHeight = 6,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  const splitText = doc.splitTextToSize(content, 180);
  let cursorY = 20;

  splitText.forEach((line: string) => {
    if (cursorY > 275) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, 15, cursorY);
    cursorY += lineHeight;
  });

  doc.save(filename);
}
