import { jsPDF } from "jspdf";

/**
 * Generate an Emergency Kit PDF containing the user's Secret Key.
 * This allows users to recover access if they lose their device.
 */
export function downloadEmergencyKit(
  secretKey: string,
  email: string,
  locale: "ko" | "en",
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const isKo = locale === "ko";

  // --- Title ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("My One Password", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(16);
  doc.text(
    isKo ? "Emergency Kit" : "Emergency Kit",
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 14;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Description ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const description = isKo
    ? [
        "이 문서는 기기를 분실하거나 새 기기에서 로그인할 때 필요한",
        "비상 복구 키트입니다. 안전한 장소에 보관하세요.",
        "",
        "이 정보가 있으면 누구나 당신의 계정에 접근할 수 있습니다.",
        "절대 다른 사람에게 공유하지 마세요.",
      ]
    : [
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
  doc.text(isKo ? "이메일 주소" : "Email Address", margin + 8, y);
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
  doc.text(isKo ? "시크릿 키" : "Secret Key", margin + 8, y);
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
  const dateLabel = isKo ? "생성일" : "Created";
  doc.text(`${dateLabel}: ${new Date().toLocaleDateString()}`, margin + 8, y);
  y += 16;

  // --- Master password blank ---
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    isKo
      ? "마스터 비밀번호 (직접 기입하세요):"
      : "Master Password (write it down yourself):",
    margin,
    y,
  );
  y += 8;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // --- Warning footer ---
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  const warning = isKo
    ? "이 문서를 분실하면 기기 없이는 계정을 복구할 수 없습니다. 안전하게 보관하세요."
    : "If you lose this document and your device, you will not be able to recover your account.";
  doc.text(warning, pageWidth / 2, y, { align: "center" });

  // --- Download ---
  doc.save("My-One-Password-Emergency-Kit.pdf");
}
