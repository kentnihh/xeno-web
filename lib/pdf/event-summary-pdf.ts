import type { jsPDF } from "jspdf";
import { formatIDR, formatDate } from "@/lib/utils";
import type {
  Event,
  EventCrew,
  EventTask,
  EventExpense,
  EventStatus,
} from "@/types/database";

let _jsPdfConstructor: any = null;

export async function loadSummaryJsPdf(): Promise<typeof jsPDF> {
  if (!_jsPdfConstructor) {
    const mod = await import("jspdf");
    _jsPdfConstructor = mod.jsPDF || (mod as any).default?.jsPDF || (mod as any).default;
  }
  return _jsPdfConstructor;
}

function getSyncSummaryJsPdf(): typeof jsPDF | null {
  if (_jsPdfConstructor) return _jsPdfConstructor;
  if (typeof window === "undefined") {
    try {
      const mod = eval("require")("jspdf");
      _jsPdfConstructor = mod.jsPDF || mod.default?.jsPDF || mod.default;
      return _jsPdfConstructor;
    } catch {
      return null;
    }
  }
  return null;
}

export interface EventSummaryPdfData {
  event:
    | Event
    | {
        id: string;
        title: string;
        venue: string;
        start_date: string;
        end_date?: string;
        status: EventStatus;
        pic?: string | null;
        pax?: number | null;
        budget?: number | null; // ponytail: optional for legacy test caller compatibility
        client?: {
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
        } | null;
      };
  crew: EventCrew[];
  tasks: EventTask[];
  expenses?: EventExpense[];
}

/**
 * Generates an Apple-inspired, premium PDF summary for an event.
 */
export function buildEventSummaryPdf(data: EventSummaryPdfData, customDoc?: jsPDF): jsPDF {
  const { event, crew, tasks, expenses } = data;

  const JsPdfClass = getSyncSummaryJsPdf() || (customDoc ? (customDoc.constructor as any) : null);
  if (!customDoc && !JsPdfClass) {
    throw new Error(
      "jsPDF has not been loaded. In browser environments, call downloadEventSummaryPdf."
    );
  }

  // Initialize A4 document (210mm x 297mm)
  const doc =
    customDoc ||
    new JsPdfClass({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm
  const bottomThreshold = pageHeight - 22; // 275mm

  let cursorY = 16;

  function ensureSpace(requiredHeight: number) {
    if (cursorY + requiredHeight > bottomThreshold) {
      doc.addPage();
      cursorY = 18;
      renderRunningHeader();
    }
  }

  function renderRunningHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("XENO ENTERTAINMENT — RINGKASAN ACARA", marginX, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(event.title, pageWidth - marginX, cursorY, { align: "right" });

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginX, cursorY + 2, marginX + contentWidth, cursorY + 2);
    cursorY += 8;
  }

  // ================= 1. HEADER & BRANDING =================
  // Logo Mark (Rounded Slate Badge with crisp "X")
  doc.setFillColor(17, 24, 39);
  doc.roundedRect(marginX, cursorY, 11, 11, 2.5, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("X", marginX + 5.5, cursorY + 7.5, { align: "center" });

  // Brand Name & Subtitle
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("XENO ENTERTAINMENT", marginX + 14, cursorY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "OPERATIONS & STAGE PRODUCTION MANAGEMENT",
    marginX + 14,
    cursorY + 9
  );

  // Document Tag / Timestamp (Right-Aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 122, 255);
  doc.text("RINGKASAN OPERASIONAL ACARA", pageWidth - marginX, cursorY + 4, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  const nowFormatted = formatDate(new Date().toISOString());
  doc.text(`Dicetak: ${nowFormatted}`, pageWidth - marginX, cursorY + 8, {
    align: "right",
  });
  doc.text(
    `Ref ID: #${(event.id || "00000000").slice(0, 8).toUpperCase()}`,
    pageWidth - marginX,
    cursorY + 11.5,
    { align: "right" }
  );

  cursorY += 16;

  // Divider line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, marginX + contentWidth, cursorY);
  cursorY += 6;

  // ================= 2. EVENT HERO CARD =================
  const cardHeight = 38;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, contentWidth, cardHeight, 3, 3, "FD");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text(event.title, marginX + 5, cursorY + 8);

  // Status Badge Pill
  const statusUpper = (event.status || "DRAFT").toUpperCase();
  const badgeWidth = doc.getTextWidth(statusUpper) + 7;
  const badgeX = marginX + contentWidth - badgeWidth - 5;
  const badgeY = cursorY + 4;

  if (event.status === "confirmed" || event.status === "completed") {
    doc.setFillColor(16, 185, 129);
  } else if (event.status === "ongoing" || event.status === "planning") {
    doc.setFillColor(0, 122, 255);
  } else if (event.status === "cancelled") {
    doc.setFillColor(239, 68, 68);
  } else {
    doc.setFillColor(107, 114, 128);
  }

  doc.roundedRect(badgeX, badgeY, badgeWidth, 5.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statusUpper, badgeX + badgeWidth / 2, badgeY + 4, {
    align: "center",
  });

  // Card Content Grid (2 columns)
  const col1X = marginX + 5;
  const col2X = marginX + contentWidth / 2 + 3;

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("Jadwal & Waktu:", col1X, cursorY + 16);
  doc.text("Lokasi / Venue:", col2X, cursorY + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(formatDate(event.start_date), col1X, cursorY + 21);
  const truncatedVenue =
    event.venue && event.venue.length > 40
      ? event.venue.slice(0, 38) + "..."
      : event.venue || "-";
  doc.text(truncatedVenue, col2X, cursorY + 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("Klien Terdaftar:", col1X, cursorY + 28);
  doc.text("PIC (Person In Charge):", col2X, cursorY + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  const clientName = event.client?.name || "Klien Internal / Direct";
  doc.text(clientName, col1X, cursorY + 33);

  const picText = event.pic
    ? event.pax
      ? `${event.pic} • ${event.pax.toLocaleString("id-ID")} Pax`
      : event.pic
    : event.pax
    ? `${event.pax.toLocaleString("id-ID")} Pax`
    : "-";
  doc.setTextColor(17, 24, 39);
  doc.text(picText, col2X, cursorY + 33);

  cursorY += cardHeight + 8;


  // ================= 3. ASSIGNED CREW SECTION =================
  ensureSpace(24);
  renderSectionHeading(doc, "TIM & PETUGAS OPERASIONAL", crew.length, marginX, cursorY);
  cursorY += 6;

  if (crew.length === 0) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, 12, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "Belum ada kru operasional yang ditugaskan untuk acara ini.",
      marginX + 5,
      cursorY + 7.5
    );
    cursorY += 17;
  } else {
    // Crew Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(marginX, cursorY, contentWidth, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);

    const cCol1 = marginX + 3; // No
    const cCol2 = marginX + 12; // Nama
    const cCol3 = marginX + 68; // Peran
    const cCol4 = marginX + 115; // Kontak

    doc.text("#", cCol1, cursorY + 4.5);
    doc.text("NAMA LENGKAP", cCol2, cursorY + 4.5);
    doc.text("PERAN DI ACARA", cCol3, cursorY + 4.5);
    doc.text("KONTAK / EMAIL", cCol4, cursorY + 4.5);
    cursorY += 6.5;

    // Crew Rows
    crew.forEach((c, index) => {
      ensureSpace(8);

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(marginX, cursorY, contentWidth, 7, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(17, 24, 39);

      doc.text(String(index + 1), cCol1, cursorY + 5);

      const name = c.profile?.full_name || "Petugas Kru";
      doc.setFont("helvetica", "bold");
      doc.text(name, cCol2, cursorY + 5);

      doc.setFont("helvetica", "normal");
      doc.text(c.role_in_event || "Staff Operasional", cCol3, cursorY + 5);

      const contact =
        c.profile?.phone || c.profile?.email || "Tidak ada kontak";
      doc.setTextColor(75, 85, 99);
      doc.text(contact, cCol4, cursorY + 5);

      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.2);
      doc.line(marginX, cursorY + 7, marginX + contentWidth, cursorY + 7);
      cursorY += 7;
    });

    cursorY += 5;
  }

  // ================= 4. EVENT TASKS & RUNDOWN =================
  ensureSpace(25);
  renderSectionHeading(
    doc,
    "RUNDOWN & DAFTAR TUGAS OPERASIONAL",
    tasks.length,
    marginX,
    cursorY
  );
  cursorY += 6;

  if (tasks.length === 0) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, 12, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "Belum ada daftar tugas atau rundown yang ditambahkan untuk acara ini.",
      marginX + 5,
      cursorY + 7.5
    );
    cursorY += 17;
  } else {
    // Tasks Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(marginX, cursorY, contentWidth, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);

    const tCol1 = marginX + 3; // Status
    const tCol2 = marginX + 28; // Tugas & Catatan
    const tCol3 = marginX + 110; // Prioritas
    const tCol4 = marginX + 135; // Tenggat
    const tCol5 = marginX + 158; // Petugas

    doc.text("STATUS", tCol1, cursorY + 4.5);
    doc.text("TUGAS & KETERANGAN", tCol2, cursorY + 4.5);
    doc.text("PRIORITAS", tCol3, cursorY + 4.5);
    doc.text("TENGGAT", tCol4, cursorY + 4.5);
    doc.text("PETUGAS", tCol5, cursorY + 4.5);
    cursorY += 6.5;

    // Task Rows
    tasks.forEach((task, index) => {
      const titleLines = doc.splitTextToSize(task.title || "Tugas", 78);
      const descLines = task.description
        ? doc.splitTextToSize(task.description, 78)
        : [];
      const textLinesCount = titleLines.length + descLines.length;
      const rowHeight = Math.max(8.5, 5 + textLinesCount * 3.4);

      ensureSpace(rowHeight + 2);

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(marginX, cursorY, contentWidth, rowHeight, "F");
      }

      // Status Pill
      const status = task.status || "todo";
      let statusLabel = "TODO";
      let sBg: [number, number, number] = [148, 163, 184];

      if (status === "done") {
        statusLabel = "DONE";
        sBg = [16, 185, 129];
      } else if (status === "in_progress") {
        statusLabel = "PROGRESS";
        sBg = [0, 122, 255];
      }

      doc.setFillColor(sBg[0], sBg[1], sBg[2]);
      doc.roundedRect(tCol1, cursorY + 1.8, 18, 4.5, 1.2, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(255, 255, 255);
      doc.text(statusLabel, tCol1 + 9, cursorY + 5, { align: "center" });

      // Title & Description
      let textY = cursorY + 4.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(17, 24, 39);
      titleLines.forEach((tl: string) => {
        doc.text(tl, tCol2, textY);
        textY += 3.4;
      });

      if (descLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        descLines.forEach((dl: string) => {
          doc.text(dl, tCol2, textY);
          textY += 3.2;
        });
      }

      // Priority
      const priority = (task.priority || "medium").toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      if (priority === "URGENT") {
        doc.setTextColor(220, 38, 38);
      } else if (priority === "HIGH") {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(107, 114, 128);
      }
      doc.text(priority, tCol3, cursorY + 5);

      // Due Date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(75, 85, 99);
      const dueStr = task.due_date
        ? formatDate(task.due_date).split(",")[0]
        : "-";
      doc.text(dueStr, tCol4, cursorY + 5);

      // Assignee
      const assigneeName = task.assignee?.full_name
        ? task.assignee.full_name.split(" ")[0]
        : "-";
      doc.text(assigneeName, tCol5, cursorY + 5);

      // Bottom Row Divider
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.2);
      doc.line(
        marginX,
        cursorY + rowHeight,
        marginX + contentWidth,
        cursorY + rowHeight
      );
      cursorY += rowHeight;
    });

    cursorY += 6;
  }


  // ================= 5. FINANCIAL BRIEF (IF EXPENSES EXIST) =================
  if (expenses && expenses.length > 0) {
    ensureSpace(22);
    renderSectionHeading(
      doc,
      "IKHTISAR KEUANGAN OPERASIONAL",
      expenses.length,
      marginX,
      cursorY
    );
    cursorY += 6;

    const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, 12, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);

    const fCol1 = marginX + 5;
    const fCol2 = marginX + 60;

    doc.text("Total Realisasi Biaya:", fCol1, cursorY + 4.5);
    doc.text("Jumlah Transaksi:", fCol2, cursorY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(formatIDR(totalSpent), fCol1, cursorY + 9);
    doc.text(`${expenses.length} entri`, fCol2, cursorY + 9);

    cursorY += 17;
  }

  // ================= 6. MULTI-PAGE FOOTER =================
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Hairline divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginX, 283, marginX + contentWidth, 283);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      "Xeno Entertainment • Dokumen Ringkasan Operasional Acara • Rahasia (Internal Use Only)",
      marginX,
      288
    );

    doc.text(
      `Halaman ${page} dari ${totalPages}`,
      pageWidth - marginX,
      288,
      { align: "right" }
    );
  }

  return doc;
}

/** Helper to render styled section titles with item count pill */
function renderSectionHeading(
  doc: jsPDF,
  title: string,
  count: number,
  x: number,
  y: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(title, x, y);

  const titleWidth = doc.getTextWidth(title);
  const pillText = `${count} item`;
  const pillWidth = doc.getTextWidth(pillText) + 5;
  const pillX = x + titleWidth + 4;

  doc.setFillColor(243, 244, 246);
  doc.roundedRect(pillX, y - 3.5, pillWidth, 4.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(107, 114, 128);
  doc.text(pillText, pillX + pillWidth / 2, y - 0.5, { align: "center" });
}

/**
 * Client-side trigger to generate and immediately download the PDF file.
 */
export async function downloadEventSummaryPdf(data: EventSummaryPdfData): Promise<void> {
  const JsPdfClass = await loadSummaryJsPdf();
  const doc = new JsPdfClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  buildEventSummaryPdf(data, doc);
  const cleanTitle = (data.event.title || "Acara")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `xeno-summary-${cleanTitle || "event"}.pdf`;
  doc.save(fileName);
}


