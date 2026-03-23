import { useState } from "react";
import type { DecryptedVaultItem, LoginItem, CardItem, NoteItem, IdentityItem } from "@my-one-password/shared";
import { ITEM_TYPE_LABELS, CRYPTO_CONFIG } from "@my-one-password/shared";
import { copyToClipboard } from "../lib/clipboard";
import { TOTPDisplay } from "../components/TOTPDisplay";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemDetailPageProps {
  item: DecryptedVaultItem;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Concealed field component
// ---------------------------------------------------------------------------

function ConcealedField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyToClipboard(value, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-slate-100">
          {revealed ? value : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
        >
          {revealed ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plain field component
// ---------------------------------------------------------------------------

function PlainField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    await copyToClipboard(value, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm text-slate-100">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-3 rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Copy ${label}`}
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type-specific detail views
// ---------------------------------------------------------------------------

function LoginDetail({ data }: { data: LoginItem }) {
  return (
    <div className="space-y-2">
      <PlainField label="URL" value={data.url} />
      <PlainField label="Username" value={data.username} />
      <ConcealedField label="Password" value={data.password} />
      {data.totpSecret && (
        <TOTPDisplay
          secret={data.totpSecret}
          algorithm={data.totpAlgorithm}
          digits={data.totpDigits}
          period={data.totpPeriod}
        />
      )}
    </div>
  );
}

function formatCardDisplay(number: string): string {
  return number.replace(/(.{4})/g, "$1 ").trim();
}

function detectCardBrand(number: string): string {
  const n = number.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  if (/^35/.test(n)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(n)) return "Diners";
  return "Card";
}

function CardDetail({ data }: { data: CardItem }) {
  return (
    <div className="space-y-3">
      {/* Card visual */}
      <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {detectCardBrand(data.cardNumber)}
          </span>
          <svg className="h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="1" y="4" width="22" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="8" width="22" height="3" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <p className="mt-4 font-mono text-lg tracking-[0.25em] text-slate-200">
          {data.cardNumber
            ? formatCardDisplay(data.cardNumber)
            : "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022"}
        </p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Cardholder</p>
            <p className="text-sm font-medium text-slate-300">{data.cardholderName || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Expires</p>
            <p className="text-sm font-medium text-slate-300">
              {data.expiryMonth && data.expiryYear ? `${data.expiryMonth}/${data.expiryYear}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Sensitive fields */}
      <ConcealedField label="Card Number" value={data.cardNumber} />
      <ConcealedField label="CVV" value={data.cvv} />
      {data.pin && <ConcealedField label="PIN" value={data.pin} />}
    </div>
  );
}

function NoteDetail({ data }: { data: NoteItem }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
        <p className="text-xs font-medium text-slate-400">Content</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{data.content}</p>
      </div>
    </div>
  );
}

function IdentityDetail({ data }: { data: IdentityItem }) {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const { address } = data;
  const addressLines = [
    address.street,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <PlainField label="Name" value={fullName} />
      <PlainField label="Email" value={data.email} />
      <PlainField label="Phone" value={data.phone} />
      {addressLines.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="text-xs font-medium text-slate-400">Address</p>
          <div className="mt-1 space-y-0.5">
            {addressLines.map((line, i) => (
              <p key={i} className="text-sm text-slate-100">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ItemDetailPage({ item, onEdit, onDelete, onBack }: ItemDetailPageProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data } = item;
  const title = "title" in data ? (data as { title: string }).title : "Untitled";
  const notes = "notes" in data ? (data as { notes: string }).notes : "";

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds if not confirmed.
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100">{title}</h1>
          <span className="mt-0.5 inline-block rounded bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
            {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
          </span>
        </div>
      </header>

      {/* Fields */}
      <div className="mt-6 space-y-2">
        {data.type === "login" && <LoginDetail data={data} />}
        {data.type === "card" && <CardDetail data={data} />}
        {data.type === "note" && <NoteDetail data={data} />}
        {data.type === "identity" && <IdentityDetail data={data} />}
      </div>

      {/* Notes section */}
      {notes && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="text-xs font-medium text-slate-400">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Edit
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
            confirmDelete
              ? "border-red-600 bg-red-600 text-white hover:bg-red-500"
              : "border-slate-700 text-red-400 hover:bg-slate-800 hover:text-red-300"
          }`}
        >
          {confirmDelete ? "Confirm Delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
