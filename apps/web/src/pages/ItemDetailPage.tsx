import { useState } from "react";
import type { DecryptedVaultItem, LoginItem, CardItem, NoteItem, IdentityItem } from "@my-one-password/shared";
import { ITEM_TYPE_LABELS, CRYPTO_CONFIG } from "@my-one-password/shared";
import { copyToClipboard } from "../lib/clipboard";
import { useTranslation } from "../lib/i18n";
import { TOTPDisplay } from "../components/TOTPDisplay";
import { ArrowLeft, Eye, EyeOff, Copy, Check, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

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
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyToClipboard(value, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-foreground">
          {revealed ? value : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRevealed((r) => !r)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={revealed ? `${t("detail.hide")} ${label}` : `${t("detail.reveal")} ${label}`}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`${t("detail.copy")} ${label}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plain field component
// ---------------------------------------------------------------------------

function PlainField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    await copyToClipboard(value, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="ml-3 h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`${t("detail.copy")} ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL field component (with external link)
// ---------------------------------------------------------------------------

function UrlField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    await copyToClipboard(value, CRYPTO_CONFIG.CLIPBOARD_CLEAR_TIMEOUT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const href = value.startsWith("http") ? value : `https://${value}`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
      </div>
      <div className="ml-3 flex items-center gap-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`${label}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`${t("detail.copy")} ${label}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type-specific detail views
// ---------------------------------------------------------------------------

function LoginDetail({ data }: { data: LoginItem }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <UrlField label={t("form.url")} value={data.url} />
      <PlainField label={t("form.username")} value={data.username} />
      <ConcealedField label={t("form.password")} value={data.password} />
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
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Card visual */}
      <div className="rounded-xl bg-gradient-to-br from-secondary to-secondary/60 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {detectCardBrand(data.cardNumber)}
          </span>
          <svg className="h-8 w-8 text-muted-foreground/60" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="1" y="4" width="22" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="8" width="22" height="3" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <p className="mt-4 font-mono text-lg tracking-[0.25em] text-foreground">
          {data.cardNumber
            ? formatCardDisplay(data.cardNumber)
            : "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022"}
        </p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("card.cardholderName")}
            </p>
            <p className="text-sm font-medium text-foreground/80">{data.cardholderName || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("detail.expires")}
            </p>
            <p className="text-sm font-medium text-foreground/80">
              {data.expiryMonth && data.expiryYear ? `${data.expiryMonth}/${data.expiryYear}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Sensitive fields */}
      <ConcealedField label={t("card.cardNumber")} value={data.cardNumber} />
      <ConcealedField label={t("card.cvv")} value={data.cvv} />
      {data.pin && <ConcealedField label={t("card.pin")} value={data.pin} />}
    </div>
  );
}

function NoteDetail({ data }: { data: NoteItem }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">{t("note.content")}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{data.content}</p>
      </div>
    </div>
  );
}

function IdentityDetail({ data }: { data: IdentityItem }) {
  const { t } = useTranslation();
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const { address } = data;
  const addressLines = [
    address.street,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <PlainField label={`${t("identity.firstName")} / ${t("identity.lastName")}`} value={fullName} />
      <PlainField label={t("identity.email")} value={data.email} />
      <PlainField label={t("identity.phone")} value={data.phone} />
      {addressLines.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{t("identity.address")}</p>
          <div className="mt-1 space-y-0.5">
            {addressLines.map((line, i) => (
              <p key={i} className="text-sm text-foreground">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ItemDetailPage({ item, onEdit, onDelete, onBack }: ItemDetailPageProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data } = item;
  const title = "title" in data ? (data as { title: string }).title : "Untitled";
  const notes = "notes" in data ? (data as { notes: string }).notes : "";

  function handleDeleteConfirm() {
    setDeleteDialogOpen(false);
    onDelete();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("form.goBack")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <Badge variant="secondary" className="mt-0.5">
            {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
          </Badge>
        </div>
      </header>

      {/* Fields */}
      <Card className="mt-6 border-border bg-background shadow-none">
        <CardContent className="space-y-2 p-4">
          {data.type === "login" && <LoginDetail data={data} />}
          {data.type === "card" && <CardDetail data={data} />}
          {data.type === "note" && <NoteDetail data={data} />}
          {data.type === "identity" && <IdentityDetail data={data} />}
        </CardContent>
      </Card>

      {/* Notes section */}
      {notes && (
        <Card className="mt-4 border-border bg-background shadow-none">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("form.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          {t("detail.edit")}
        </Button>
        <Button
          variant="outline"
          className="border-border text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          {t("detail.delete")}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.confirmDelete")}</DialogTitle>
            <DialogDescription>{t("detail.deleteWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("detail.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="h-4 w-4" />
              {t("detail.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
