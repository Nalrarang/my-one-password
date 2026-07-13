import { jsPDF } from "jspdf";

/**
 * Generate an Emergency Kit PDF containing the user's Secret Key.
 * This allows users to recover access if they lose their device.
 *
 * The PDF is intentionally English-only: jsPDF's built-in fonts cover Latin
 * only, so rendering Korean would require embedding a multi-MB CJK font.
 * The values that matter (email, Secret Key) are ASCII regardless.
 */
export function downloadEmergencyKit(secretKey: string, email: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- Title ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("My One Password", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(16);
  doc.text("Emergency Kit", pageWidth / 2, y, { align: "center" });
  y += 14;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Description ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const description = [
    "This document contains your emergency recovery information.",
    "Store it in a safe place — you'll need it if you lose access to your device.",
    "",
    "Anyone with this information can access your account.",
    "Never share it with anyone.",
  ];

  for (const line of description) {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  y += 8;

  // --- Info box background ---
  const boxHeight = 52;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "F");
  y += 8;

  // --- Email ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Email Address", margin + 8, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(email, margin + 8, y);
  y += 12;

  // --- Secret Key ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Secret Key", margin + 8, y);
  y += 7;

  doc.setFontSize(14);
  doc.setFont("courier", "bold");
  doc.setTextColor(0);
  doc.text(secretKey, margin + 8, y);
  y += 12;

  // --- Date ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Created: ${new Date().toLocaleDateString()}`, margin + 8, y);
  y += 16;

  // --- Master password blank ---
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Master Password (write it down yourself):", margin, y);
  y += 8;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // --- Warning footer ---
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text(
    "If you lose this document and your device, you will not be able to recover your account.",
    pageWidth / 2,
    y,
    { align: "center" },
  );

  // --- Download ---
  doc.save("My-One-Password-Emergency-Kit.pdf");
}
