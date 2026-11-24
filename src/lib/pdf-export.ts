/** Exports a plain or Markdown document as a cleanly formatted typographic PDF. */
export async function downloadTextAsPdf(
  filename: string,
  content: string,
  fontSize = 10.5,
  lineHeight = 5.2
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 18;
  const maxWidth = 210 - marginX * 2;
  const pageBottomY = 278;
  let cursorY = 20;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageBottomY) {
      doc.addPage();
      cursorY = 20;
    }
  };

  const lines = content.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trimEnd();
    const trimmed = raw.trim();

    if (!trimmed) {
      cursorY += 2.6;
      continue;
    }

    // # Document Title
    if (/^#(?!#)\s+/.test(trimmed)) {
      const title = trimmed.replace(/^#\s+/, "");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const wrapped = doc.splitTextToSize(title, maxWidth) as string[];
      ensureSpace(wrapped.length * 7 + 2);
      for (const line of wrapped) {
        doc.text(line, marginX, cursorY);
        cursorY += 7;
      }
      cursorY += 1;
      continue;
    }

    // ## Section Heading
    if (/^##(?!#)\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^##\s+/, "");
      cursorY += 2.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      const wrapped = doc.splitTextToSize(heading, maxWidth) as string[];
      ensureSpace(wrapped.length * 5.5 + 4);
      for (const line of wrapped) {
        doc.text(line, marginX, cursorY);
        cursorY += 5.5;
      }
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.3);
      doc.line(marginX, cursorY - 1.2, marginX + maxWidth, cursorY - 1.2);
      cursorY += 2.2;
      continue;
    }

    // ### Subheading (Role / Degree / Project)
    if (/^###\s+/.test(trimmed)) {
      const subheading = trimmed.replace(/^###\s+/, "");
      cursorY += 1.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      const wrapped = doc.splitTextToSize(subheading, maxWidth) as string[];
      ensureSpace(wrapped.length * 5 + 1);
      for (const line of wrapped) {
        doc.text(line, marginX, cursorY);
        cursorY += 5;
      }
      continue;
    }

    // Bullet item (•, -, *)
    if (/^[•\-*]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[•\-*]\s+/, "");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const bulletIndent = 4.5;
      const wrapped = doc.splitTextToSize(
        bulletText,
        maxWidth - bulletIndent
      ) as string[];
      ensureSpace(wrapped.length * lineHeight);
      wrapped.forEach((line, idx) => {
        if (idx === 0) {
          doc.text("•", marginX + 1, cursorY);
        }
        doc.text(line, marginX + bulletIndent, cursorY);
        cursorY += lineHeight;
      });
      continue;
    }

    // Regular paragraph / metadata line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
    const wrapped = doc.splitTextToSize(cleanText, maxWidth) as string[];
    ensureSpace(wrapped.length * lineHeight);
    for (const line of wrapped) {
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    }
  }

  doc.save(filename);
}
