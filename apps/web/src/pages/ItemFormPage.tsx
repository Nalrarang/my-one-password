import { useState, useEffect, useRef } from "react";
import type { ItemType, VaultItemData, LoginItem, CardItem, NoteItem, IdentityItem } from "@my-one-password/shared";
import type { DecryptedVaultItem } from "@my-one-password/shared";
import { ArrowLeft, Eye, EyeOff, Loader2, Shield, ChevronDown, Wand2 } from "lucide-react";
import { PasswordGenerator, StrengthMeter } from "../components/PasswordGenerator";
import { evaluateStrength, initPasswordStrength } from "../lib/password-strength";
import type { StrengthResult } from "../lib/password-strength";
import { useTranslation } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Select } from "../components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemFormPageProps {
  mode: "create" | "edit";
  editItem?: DecryptedVaultItem;
  onSave: (itemType: ItemType, data: VaultItemData) => Promise<void>;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Default data factories
// ---------------------------------------------------------------------------

function defaultLogin(): LoginItem {
  return { type: "login", title: "", url: "", urls: [], username: "", password: "", notes: "", customFields: [] };
}

function defaultCard(): CardItem {
  return { type: "card", title: "", cardholderName: "", cardNumber: "", expiryMonth: "", expiryYear: "", cvv: "", notes: "" };
}

function defaultNote(): NoteItem {
  return { type: "note", title: "", content: "", notes: "" };
}

function defaultIdentity(): IdentityItem {
  return { type: "identity", title: "", firstName: "", lastName: "", email: "", phone: "", address: { street: "", city: "", state: "", postalCode: "", country: "" }, notes: "" };
}

function defaultDataForType(itemType: ItemType): VaultItemData {
  switch (itemType) {
    case "login": return defaultLogin();
    case "card": return defaultCard();
    case "note": return defaultNote();
    case "identity": return defaultIdentity();
  }
}

// ---------------------------------------------------------------------------
// Sub-forms
// ---------------------------------------------------------------------------

function LoginFields({ data, onChange, disabled, t }: { data: LoginItem; onChange: (d: LoginItem) => void; disabled: boolean; t: (key: string) => string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const strengthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTotp, setShowTotp] = useState(!!data.totpSecret);

  useEffect(() => { initPasswordStrength(); }, []);

  useEffect(() => {
    if (strengthTimer.current) clearTimeout(strengthTimer.current);
    if (!data.password) { setStrength(null); return; }
    strengthTimer.current = setTimeout(() => { evaluateStrength(data.password).then(setStrength); }, 300);
    return () => { if (strengthTimer.current) clearTimeout(strengthTimer.current); };
  }, [data.password]);

  function handleSelectGenerated(password: string) {
    onChange({ ...data, password });
    setShowGenerator(false);
  }

  return (
    <>
      <div className="space-y-2">
        <Label>{t("form.url")}</Label>
        <Input type="url" value={data.url} onChange={(e) => onChange({ ...data, url: e.target.value })} disabled={disabled} placeholder="https://example.com" />
      </div>
      <div className="space-y-2">
        <Label>{t("form.username")}</Label>
        <Input type="text" autoComplete="off" value={data.username} onChange={(e) => onChange({ ...data, username: e.target.value })} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>{t("form.password")}</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            value={data.password}
            onChange={(e) => onChange({ ...data, password: e.target.value })}
            disabled={disabled}
            className="pr-10"
          />
          <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={showPassword ? t("detail.hide") : t("detail.reveal")}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {data.password && !showGenerator && (
          <div className="mt-2"><StrengthMeter strength={strength} /></div>
        )}

        <button type="button" onClick={() => setShowGenerator((v) => !v)} disabled={disabled} className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80 disabled:opacity-50">
          <Wand2 className="h-4 w-4" />
          {showGenerator ? t("login.hideGenerator") : t("login.generatePassword")}
        </button>

        {showGenerator && (
          <div className="mt-3"><PasswordGenerator onSelect={handleSelectGenerated} initialPassword={data.password} /></div>
        )}
      </div>

      {/* TOTP / 2FA */}
      <Card>
        <CardContent className="p-4">
          <button type="button" onClick={() => setShowTotp((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium text-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t("login.totp")}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTotp ? "rotate-180" : ""}`} />
          </button>

          {showTotp && (
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>{t("login.totpSecret")}</Label>
                <Input
                  type="text"
                  autoComplete="off"
                  value={data.totpSecret ?? ""}
                  onChange={(e) => onChange({ ...data, totpSecret: e.target.value.toUpperCase().replace(/\s/g, "") || undefined })}
                  disabled={disabled}
                  className="font-mono tracking-wider"
                  placeholder="JBSWY3DPEHPK3PXP"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("login.totpAlgorithm")}</Label>
                  <Select value={data.totpAlgorithm ?? "SHA1"} onChange={(e) => onChange({ ...data, totpAlgorithm: e.target.value as "SHA1" | "SHA256" | "SHA512" })} disabled={disabled}>
                    <option value="SHA1">SHA-1</option>
                    <option value="SHA256">SHA-256</option>
                    <option value="SHA512">SHA-512</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("login.totpDigits")}</Label>
                  <Select value={data.totpDigits ?? 6} onChange={(e) => onChange({ ...data, totpDigits: Number(e.target.value) as 6 | 8 })} disabled={disabled}>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("login.totpPeriod")}</Label>
                  <Input type="number" min={15} max={120} value={data.totpPeriod ?? 30} onChange={(e) => onChange({ ...data, totpPeriod: Number(e.target.value) || 30 })} disabled={disabled} />
                </div>
              </div>
              {data.totpSecret && <p className="text-xs text-green-400">{t("login.totpConfigured")}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function detectCardBrand(number: string): string {
  const n = number.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  if (/^35/.test(n)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(n)) return "Diners";
  if (n.length > 0) return "Card";
  return "";
}

function CardFields({ data, onChange, disabled, t }: { data: CardItem; onChange: (d: CardItem) => void; disabled: boolean; t: (key: string) => string }) {
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

  return (
    <>
      <div className="space-y-2">
        <Label>{t("card.cardholderName")}</Label>
        <Input type="text" autoComplete="off" value={data.cardholderName} onChange={(e) => onChange({ ...data, cardholderName: e.target.value })} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>{t("card.cardNumber")}</Label>
        <div className="relative">
          <Input
            type="text"
            autoComplete="off"
            inputMode="numeric"
            value={formatCardNumber(data.cardNumber)}
            onChange={(e) => onChange({ ...data, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 19) })}
            disabled={disabled}
            className="font-mono tracking-wider pr-16"
            placeholder="4111 1111 1111 1111"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{detectCardBrand(data.cardNumber)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>{t("card.expiryMonth")}</Label>
          <Input type="text" inputMode="numeric" maxLength={2} value={data.expiryMonth} onChange={(e) => onChange({ ...data, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })} disabled={disabled} placeholder="MM" />
        </div>
        <div className="space-y-2">
          <Label>{t("card.expiryYear")}</Label>
          <Input type="text" inputMode="numeric" maxLength={4} value={data.expiryYear} onChange={(e) => onChange({ ...data, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={disabled} placeholder="YYYY" />
        </div>
        <div className="space-y-2">
          <Label>{t("card.cvv")}</Label>
          <div className="relative">
            <Input type={showCvv ? "text" : "password"} autoComplete="off" inputMode="numeric" maxLength={4} value={data.cvv} onChange={(e) => onChange({ ...data, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={disabled} className="pr-10" />
            <button type="button" onClick={() => setShowCvv((p) => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("card.pin")}</Label>
        <div className="relative">
          <Input type={showPin ? "text" : "password"} autoComplete="off" inputMode="numeric" maxLength={8} value={data.pin ?? ""} onChange={(e) => onChange({ ...data, pin: e.target.value.replace(/\D/g, "").slice(0, 8) || undefined })} disabled={disabled} className="pr-10" />
          <button type="button" onClick={() => setShowPin((p) => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}

function NoteFields({ data, onChange, disabled, t }: { data: NoteItem; onChange: (d: NoteItem) => void; disabled: boolean; t: (key: string) => string }) {
  return (
    <div className="space-y-2">
      <Label>{t("note.content")}</Label>
      <textarea
        value={data.content}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        disabled={disabled}
        rows={6}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function IdentityFields({ data, onChange, disabled, t }: { data: IdentityItem; onChange: (d: IdentityItem) => void; disabled: boolean; t: (key: string) => string }) {
  function updateAddress(field: string, value: string) {
    onChange({ ...data, address: { ...data.address, [field]: value } });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("identity.firstName")}</Label>
          <Input type="text" value={data.firstName} onChange={(e) => onChange({ ...data, firstName: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label>{t("identity.lastName")}</Label>
          <Input type="text" value={data.lastName} onChange={(e) => onChange({ ...data, lastName: e.target.value })} disabled={disabled} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("identity.email")}</Label>
        <Input type="email" value={data.email} onChange={(e) => onChange({ ...data, email: e.target.value })} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>{t("identity.phone")}</Label>
        <Input type="tel" value={data.phone} onChange={(e) => onChange({ ...data, phone: e.target.value })} disabled={disabled} />
      </div>

      {/* Address */}
      <Card>
        <CardContent className="p-4">
          <span className="text-sm font-medium text-foreground">{t("identity.address")}</span>
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label>{t("identity.street")}</Label>
              <Input type="text" value={data.address.street} onChange={(e) => updateAddress("street", e.target.value)} disabled={disabled} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("identity.city")}</Label>
                <Input type="text" value={data.address.city} onChange={(e) => updateAddress("city", e.target.value)} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>{t("identity.state")}</Label>
                <Input type="text" value={data.address.state} onChange={(e) => updateAddress("state", e.target.value)} disabled={disabled} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("identity.postalCode")}</Label>
                <Input type="text" value={data.address.postalCode} onChange={(e) => updateAddress("postalCode", e.target.value)} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>{t("identity.country")}</Label>
                <Input type="text" value={data.address.country} onChange={(e) => updateAddress("country", e.target.value)} disabled={disabled} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ITEM_TYPES: ItemType[] = ["login", "card", "note", "identity"];

export function ItemFormPage({ mode, editItem, onSave, onCancel }: ItemFormPageProps) {
  const { t } = useTranslation();
  const [itemType, setItemType] = useState<ItemType>((editItem?.itemType as ItemType) ?? "login");
  const [data, setData] = useState<VaultItemData>(editItem?.data ?? defaultDataForType("login"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(newType: ItemType) {
    setItemType(newType);
    setData(defaultDataForType(newType));
  }

  function handleDataChange(updated: VaultItemData) {
    setData(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!("title" in data) || !(data as { title: string }).title.trim()) {
      setError(t("form.title") + " is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(itemType, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.unexpectedError");
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const title = "title" in data ? (data as { title: string }).title : "";
  function setTitle(newTitle: string) { setData({ ...data, title: newTitle } as VaultItemData); }
  const notes = "notes" in data ? (data as { notes: string }).notes : "";
  function setNotes(newNotes: string) { setData({ ...data, notes: newNotes } as VaultItemData); }

  const itemTypeLabels: Record<string, string> = {
    login: t("itemType.login"),
    card: t("itemType.card"),
    note: t("itemType.note"),
    identity: t("itemType.identity"),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label={t("form.goBack")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          {mode === "create" ? t("form.newItem") : t("form.editItem")}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Item type selector */}
        {mode === "create" && (
          <div className="space-y-2">
            <Label>{t("form.itemType")}</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("form.itemType")}>
              {ITEM_TYPES.map((tp) => (
                <Button
                  key={tp}
                  type="button"
                  role="radio"
                  aria-checked={itemType === tp}
                  onClick={() => handleTypeChange(tp)}
                  variant={itemType === tp ? "default" : "outline"}
                  size="sm"
                >
                  {itemTypeLabels[tp]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label>{t("form.title")}</Label>
          <Input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} autoFocus />
        </div>

        {/* Type-specific fields */}
        {data.type === "login" && <LoginFields data={data as LoginItem} onChange={handleDataChange} disabled={saving} t={t} />}
        {data.type === "card" && <CardFields data={data as CardItem} onChange={handleDataChange} disabled={saving} t={t} />}
        {data.type === "note" && <NoteFields data={data as NoteItem} onChange={handleDataChange} disabled={saving} t={t} />}
        {data.type === "identity" && <IdentityFields data={data as IdentityItem} onChange={handleDataChange} disabled={saving} t={t} />}

        {/* Notes */}
        <div className="space-y-2">
          <Label>{t("form.notes")}</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? t("form.create") : t("form.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="w-full sm:w-auto">
            {t("form.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
