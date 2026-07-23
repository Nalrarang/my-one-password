import { useState } from "react";
import { Copy, Eye, EyeOff, Star, Pencil, Trash2, ArrowLeft, Check } from "lucide-react";
import type { DecryptedVaultItem } from "@my-one-password/shared";
import { CRYPTO_CONFIG } from "@my-one-password/shared";

import { useTranslation } from "../../lib/i18n";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { copyToClipboard } from "../../lib/clipboard";
import { TOTPDisplay } from "../TOTPDisplay";
import { getTitle, colorOf, monoOf, strengthOf, Mono, type Strength } from "./VaultList";

interface ItemDetailProps {
  item: DecryptedVaultItem;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
}

interface Field {
  key: string;
  label: string;
  value: string;
  secret?: boolean;
  mono?: boolean;
  copyable?: boolean;
  link?: string;
  strength?: Strength | null;
}

const MONO = "font-[ui-monospace,'SF_Mono',Menlo,monospace]";

export function ItemDetail({ item, onEdit, onDelete, onBack, onToggleFavorite }: ItemDetailProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const { data } = item;
  const title = getTitle(item);
  const typeLabelKey =
    data.type === "login" ? "vault.logins" : data.type === "card" ? "vault.cards" : data.type === "note" ? "vault.notes" : "vault.identities";

  function toggle(k: string) {
    setRevealed((r) => ({ ...r, [k]: !r[k] }));
  }
  async function copy(k: string, v: string) {
    await copyToClipboard(v, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey((c) => (c === k ? null : c)), 1600);
  }
  function handleDelete() {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    onDelete();
  }

  // --- Build type-specific fields ---
  const fields: Field[] = [];
  let cardVisual: React.ReactNode = null;
  let noteText = "";

  if (data.type === "login") {
    if (data.url) fields.push({ key: "url", label: t("field.website"), value: data.url, copyable: true, link: data.url.startsWith("http") ? data.url : `https://${data.url}` });
    if (data.username) fields.push({ key: "user", label: t("field.username"), value: data.username, copyable: true });
    if (data.password) fields.push({ key: "pw", label: t("field.password"), value: data.password, secret: true, mono: true, copyable: true, strength: strengthOf(item) });
    noteText = data.notes || "";
  } else if (data.type === "card") {
    const expiry = [data.expiryMonth, data.expiryYear].filter(Boolean).join("/");
    cardVisual = (
      <div
        className="mb-[18px] rounded-[18px] p-[26px_28px] text-white shadow-[var(--shadow)]"
        style={{ background: "linear-gradient(135deg,#3A3F45,#0E1013)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold tracking-[1.5px] text-[#C6CBCD]">{(data.cardholderName || title).toUpperCase()}</span>
        </div>
        <div className={`my-[24px] text-2xl tracking-[3px] ${MONO}`}>
          {data.cardNumber ? `•••• •••• •••• ${data.cardNumber.slice(-4)}` : "•••• •••• •••• ••••"}
        </div>
        <div className="flex justify-between">
          <div>
            <div className="mb-0.5 text-[10px] tracking-[0.5px] text-[#878F91]">{t("field.cardholder")}</div>
            <div className="text-sm font-semibold">{data.cardholderName || "-"}</div>
          </div>
          <div className="text-right">
            <div className="mb-0.5 text-[10px] tracking-[0.5px] text-[#878F91]">{t("field.expiry")}</div>
            <div className="text-sm font-semibold">{expiry || "-"}</div>
          </div>
        </div>
      </div>
    );
    if (data.cardNumber) fields.push({ key: "num", label: t("field.cardNumber"), value: data.cardNumber, secret: true, mono: true, copyable: true });
    if (data.cvv) fields.push({ key: "cvv", label: t("field.cvv"), value: data.cvv, secret: true, mono: true, copyable: true });
    noteText = data.notes || "";
  } else if (data.type === "identity") {
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    if (name) fields.push({ key: "name", label: t("field.name"), value: name });
    if (data.email) fields.push({ key: "email", label: t("field.email"), value: data.email, copyable: true });
    if (data.phone) fields.push({ key: "phone", label: t("field.phone"), value: data.phone, copyable: true });
    noteText = data.notes || "";
  } else if (data.type === "note") {
    noteText = data.content || "";
  }

  const hasOtp = data.type === "login" && !!data.totpSecret;

  // --- Renderers ---
  function fieldRow(f: Field, last: boolean) {
    const shown = !f.secret || revealed[f.key];
    return (
      <div key={f.key}>
        <div className="flex items-center gap-3 px-[18px] py-3.5">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-xs text-[var(--text-3)]">{f.label}</div>
            {f.link ? (
              <a
                href={f.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[15px] text-[var(--accent)] hover:underline"
              >
                {f.value}
              </a>
            ) : (
              <div className={`break-all text-[15px] text-[var(--text)] ${f.mono ? `${MONO} tracking-wide` : ""}`}>
                {shown ? f.value : "•".repeat(Math.min(12, Math.max(6, f.value.length)))}
              </div>
            )}
            {f.strength && (
              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="h-[5px] max-w-[200px] flex-1 overflow-hidden rounded-full bg-[var(--divider)]">
                  <div className="h-full rounded-full" style={{ width: f.strength.pct, background: f.strength.color }} />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: f.strength.color }}>
                  {t(`strength.${f.strength.key}`)}
                </span>
              </div>
            )}
          </div>
          {f.secret && (
            <button className="iconbtn-d" onClick={() => toggle(f.key)} aria-label="toggle">
              {revealed[f.key] ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          )}
          {f.copyable && (
            <button className="iconbtn-d" onClick={() => copy(f.key, f.value)} aria-label="copy">
              {copiedKey === f.key ? <Check className="h-[18px] w-[18px] text-[var(--pos)]" /> : <Copy className="h-[18px] w-[18px]" />}
            </button>
          )}
        </div>
        {!last && <div className="mx-[18px] h-px bg-[var(--divider)]" />}
      </div>
    );
  }

  const typeChip = (
    <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-[3px] text-xs font-semibold text-[var(--text-2)]">
      {t(typeLabelKey)}
    </span>
  );

  const favBtn = (
    <button className="iconbtn-d" onClick={() => onToggleFavorite(item.id)} aria-label="favorite">
      <Star className={`h-5 w-5 ${item.favorite ? "fill-[#FFCD00] text-[#FFCD00]" : ""}`} />
    </button>
  );

  const body = (
    <>
      {cardVisual}
      {data.type === "note" ? (
        <div className="whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--card)] px-[22px] py-5 text-sm leading-[1.7] text-[var(--text)]">
          {noteText}
        </div>
      ) : fields.length > 0 || hasOtp ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {fields.map((f, i) => fieldRow(f, i === fields.length - 1 && !hasOtp))}
          {hasOtp && data.type === "login" && (
            <>
              {fields.length > 0 && <div className="mx-[18px] h-px bg-[var(--divider)]" />}
              <div className="px-[18px] py-3.5">
                <TOTPDisplay
                  secret={data.totpSecret!}
                  algorithm={data.totpAlgorithm}
                  digits={data.totpDigits}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      {data.type !== "note" && noteText && (
        <>
          <div className="mb-2 mt-[22px] text-xs font-semibold text-[var(--text-2)]">{t("field.notes")}</div>
          <div className={`whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-[18px] text-sm leading-[1.7] text-[var(--text)] ${MONO}`}>
            {noteText}
          </div>
        </>
      )}
    </>
  );

  const deleteBtn = (
    <button
      onClick={handleDelete}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-[18px] text-sm font-semibold text-[var(--neg)] transition-colors hover:bg-[var(--neg-soft)]"
    >
      <Trash2 className="h-4 w-4" />
      {confirmDel ? t("common.confirm") : t("detail.delete")}
    </button>
  );

  // iconbtn helper class injected once
  const iconbtnStyle = (
    <style>{`.iconbtn-d{display:grid;place-items:center;width:34px;height:34px;min-width:34px;border-radius:8px;color:var(--text-3);transition:background .1s,color .1s;}.iconbtn-d:hover{background:var(--hover);color:var(--text);}`}</style>
  );

  if (isDesktop) {
    return (
      <div className="min-h-full bg-[var(--canvas)] px-7 py-7 lg:px-9">
        {iconbtnStyle}
        <div className="mx-auto max-w-[820px] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-[28px_28px] lg:p-[32px_36px]">
          <div className="mb-7 flex items-start gap-4">
            <Mono title={title} size={56} radius={15} font={22} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="break-keep text-2xl font-bold leading-[1.25] text-[var(--text)]">{title}</div>
              <div className="mt-2">{typeChip}</div>
            </div>
            {favBtn}
          </div>
          {body}
          <div className="mt-6 flex gap-2.5">
            <button
              onClick={onEdit}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-[18px] text-sm font-semibold text-white transition-[filter] hover:brightness-95"
            >
              <Pencil className="h-4 w-4" />
              {t("detail.edit")}
            </button>
            {deleteBtn}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--screen)] px-5 pb-10 pt-5">
      {iconbtnStyle}
      <div className="mb-[18px] flex items-center justify-between">
        <button className="iconbtn-d !bg-[var(--field)]" onClick={onBack} aria-label="back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {favBtn}
          <button className="iconbtn-d !bg-[var(--field)]" onClick={onEdit} aria-label="edit">
            <Pencil className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>
      <div className="mb-[22px] flex flex-col items-center text-center">
        <div className="mb-3">
          <div
            className="grid h-16 w-16 place-items-center rounded-[18px] text-[26px] font-bold text-white"
            style={{ background: colorOf(title) }}
          >
            {monoOf(title)}
          </div>
        </div>
        <div className="break-keep text-[22px] font-bold text-[var(--text)]">{title}</div>
        <div className="mt-2">{typeChip}</div>
      </div>
      {body}
      <div className="mt-5">{deleteBtn}</div>
    </div>
  );
}
