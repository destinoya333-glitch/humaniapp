/**
 * Generador de CV en Word (.docx) y PDF.
 *
 * Recibe un objeto CVData y devuelve Buffer del archivo final.
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CVData = {
  nombre_completo: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  resumen_profesional?: string;
  experiencia: Array<{
    empresa: string;
    cargo: string;
    fechas: string;
    descripcion?: string;
  }>;
  educacion: Array<{
    institucion: string;
    grado: string;
    fechas: string;
  }>;
  habilidades?: string[];
  idiomas?: string[];
};

// =============== WORD ===============

export async function generateCVWord(data: CVData): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header — Nombre
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.nombre_completo, bold: true, size: 36 })],
    }),
  );

  // Contacto
  const contact: string[] = [];
  if (data.email) contact.push(data.email);
  if (data.telefono) contact.push(data.telefono);
  if (data.ciudad) contact.push(data.ciudad);
  if (contact.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contact.join(" • "), size: 22 })],
      }),
    );
  }
  children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

  if (data.resumen_profesional) {
    children.push(section("RESUMEN PROFESIONAL"));
    children.push(new Paragraph({ children: [new TextRun({ text: data.resumen_profesional, size: 22 })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  if (data.experiencia.length > 0) {
    children.push(section("EXPERIENCIA PROFESIONAL"));
    for (const exp of data.experiencia) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.cargo, bold: true, size: 24 }),
            new TextRun({ text: " — ", size: 24 }),
            new TextRun({ text: exp.empresa, italics: true, size: 24 }),
          ],
        }),
      );
      children.push(new Paragraph({ children: [new TextRun({ text: exp.fechas, size: 20, italics: true })] }));
      if (exp.descripcion) {
        children.push(new Paragraph({ children: [new TextRun({ text: exp.descripcion, size: 22 })] }));
      }
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }
  }

  if (data.educacion.length > 0) {
    children.push(section("EDUCACIÓN"));
    for (const edu of data.educacion) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.grado, bold: true, size: 24 }),
            new TextRun({ text: " — ", size: 24 }),
            new TextRun({ text: edu.institucion, italics: true, size: 24 }),
          ],
        }),
      );
      children.push(new Paragraph({ children: [new TextRun({ text: edu.fechas, size: 20, italics: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }
  }

  if (data.habilidades?.length) {
    children.push(section("HABILIDADES"));
    children.push(new Paragraph({ children: [new TextRun({ text: data.habilidades.join(" • "), size: 22 })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  if (data.idiomas?.length) {
    children.push(section("IDIOMAS"));
    children.push(new Paragraph({ children: [new TextRun({ text: data.idiomas.join(" • "), size: 22 })] }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

function section(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: title, bold: true, size: 26 })],
  });
}

// =============== PDF ===============

export async function generateCVPdf(data: CVData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([595, 842]); // A4
  const margin = 50;
  let y = 800;
  const lineHeight = 14;

  function addPageIfNeeded(needed: number = lineHeight) {
    if (y - needed < margin) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
  }

  function writeLine(text: string, opts: { font?: typeof helv; size?: number; color?: { r: number; g: number; b: number }; align?: "left" | "center" } = {}) {
    addPageIfNeeded();
    const f = opts.font ?? helv;
    const size = opts.size ?? 11;
    const color = opts.color ?? { r: 0, g: 0, b: 0 };
    const width = page.getWidth() - 2 * margin;
    let x = margin;
    if (opts.align === "center") {
      const tw = f.widthOfTextAtSize(text, size);
      x = margin + (width - tw) / 2;
    }
    // Wrap manual simple si excede ancho
    const maxWidth = width;
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        page.drawText(line, { x, y, size, font: f, color: rgb(color.r, color.g, color.b) });
        y -= lineHeight;
        addPageIfNeeded();
        if (opts.align === "center") {
          const tw = f.widthOfTextAtSize(w, size);
          x = margin + (width - tw) / 2;
        }
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y, size, font: f, color: rgb(color.r, color.g, color.b) });
      y -= lineHeight;
    }
  }

  function gap(n = 1) {
    y -= lineHeight * n;
  }

  function sectionHeader(title: string) {
    addPageIfNeeded(lineHeight * 2);
    gap(0.5);
    writeLine(title, { font: helvBold, size: 12, color: { r: 0.15, g: 0.15, b: 0.5 } });
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: page.getWidth() - margin, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.15, 0.15, 0.5),
    });
    gap(0.3);
  }

  writeLine(data.nombre_completo, { font: helvBold, size: 18, align: "center" });
  const contact = [data.email, data.telefono, data.ciudad].filter(Boolean).join(" • ");
  if (contact) writeLine(contact, { size: 10, align: "center" });
  gap(0.5);

  if (data.resumen_profesional) {
    sectionHeader("RESUMEN PROFESIONAL");
    writeLine(data.resumen_profesional, { size: 11 });
    gap(0.5);
  }

  if (data.experiencia.length > 0) {
    sectionHeader("EXPERIENCIA PROFESIONAL");
    for (const exp of data.experiencia) {
      writeLine(`${exp.cargo} — ${exp.empresa}`, { font: helvBold, size: 12 });
      writeLine(exp.fechas, { font: helvItalic, size: 10 });
      if (exp.descripcion) writeLine(exp.descripcion, { size: 11 });
      gap(0.5);
    }
  }

  if (data.educacion.length > 0) {
    sectionHeader("EDUCACIÓN");
    for (const edu of data.educacion) {
      writeLine(`${edu.grado} — ${edu.institucion}`, { font: helvBold, size: 12 });
      writeLine(edu.fechas, { font: helvItalic, size: 10 });
      gap(0.5);
    }
  }

  if (data.habilidades?.length) {
    sectionHeader("HABILIDADES");
    writeLine(data.habilidades.join(" • "), { size: 11 });
    gap(0.5);
  }

  if (data.idiomas?.length) {
    sectionHeader("IDIOMAS");
    writeLine(data.idiomas.join(" • "), { size: 11 });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
