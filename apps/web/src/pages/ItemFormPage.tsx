import { useState } from "react";
import type { ItemType, VaultItemData, LoginItem, CardItem, NoteItem, IdentityItem } from "@my-one-password/shared";
import { ITEM_TYPE_LABELS } from "@my-one-password/shared";
import type { DecryptedVaultItem } from "@my-one-password/shared";

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
  return {
    type: "login",
    title: "",
    url: "",
    urls: [],
    username: "",
    password: "",
    notes: "",
    customFields: [],
  };
}

function defaultCard(): CardItem {
  return {
    type: "card",
    title: "",
    cardholderName: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    notes: "",
  };
}

function defaultNote(): NoteItem {
  return { type: "note", title: "", content: "", notes: "" };
}

function defaultIdentity(): IdentityItem {
  return {
    type: "identity",
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
    notes: "",
  };
}

function defaultDataForType(itemType: ItemType): VaultItemData {
  switch (itemType) {
    case "login":
      return defaultLogin();
    case "card":
      return defaultCard();
    case "note":
      return defaultNote();
    case "identity":
      return defaultIdentity();
  }
}

// ---------------------------------------------------------------------------
// Shared form styles
// ---------------------------------------------------------------------------

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50";
const labelClass = "block text-sm font-medium text-slate-300";

// ---------------------------------------------------------------------------
// Sub-forms
// ---------------------------------------------------------------------------

function LoginFields({
  data,
  onChange,
  disabled,
}: {
  data: LoginItem;
  onChange: (d: LoginItem) => void;
  disabled: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <Field label="URL">
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="https://example.com"
        />
      </Field>
      <Field label="Username">
        <input
          type="text"
          autoComplete="off"
          value={data.username}
          onChange={(e) => onChange({ ...data, username: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="username or email"
        />
      </Field>
      <Field label="Password">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            value={data.password}
            onChange={(e) => onChange({ ...data, password: e.target.value })}
            disabled={disabled}
            className={`${inputClass} pr-10`}
            placeholder="password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
      </Field>
    </>
  );
}

function CardFields({
  data,
  onChange,
  disabled,
}: {
  data: CardItem;
  onChange: (d: CardItem) => void;
  disabled: boolean;
}) {
  const [showCvv, setShowCvv] = useState(false);

  return (
    <>
      <Field label="Cardholder Name">
        <input
          type="text"
          autoComplete="off"
          value={data.cardholderName}
          onChange={(e) => onChange({ ...data, cardholderName: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="John Doe"
        />
      </Field>
      <Field label="Card Number">
        <input
          type="text"
          autoComplete="off"
          inputMode="numeric"
          value={data.cardNumber}
          onChange={(e) => onChange({ ...data, cardNumber: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="4111 1111 1111 1111"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Month">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={data.expiryMonth}
            onChange={(e) => onChange({ ...data, expiryMonth: e.target.value })}
            disabled={disabled}
            className={inputClass}
            placeholder="MM"
          />
        </Field>
        <Field label="Year">
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={data.expiryYear}
            onChange={(e) => onChange({ ...data, expiryYear: e.target.value })}
            disabled={disabled}
            className={inputClass}
            placeholder="YYYY"
          />
        </Field>
        <Field label="CVV">
          <div className="relative">
            <input
              type={showCvv ? "text" : "password"}
              autoComplete="off"
              inputMode="numeric"
              maxLength={4}
              value={data.cvv}
              onChange={(e) => onChange({ ...data, cvv: e.target.value })}
              disabled={disabled}
              className={`${inputClass} pr-10`}
              placeholder="123"
            />
            <button
              type="button"
              onClick={() => setShowCvv((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              aria-label={showCvv ? "Hide CVV" : "Show CVV"}
            >
              {showCvv ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>
      </div>
    </>
  );
}

function NoteFields({
  data,
  onChange,
  disabled,
}: {
  data: NoteItem;
  onChange: (d: NoteItem) => void;
  disabled: boolean;
}) {
  return (
    <Field label="Content">
      <textarea
        value={data.content}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        disabled={disabled}
        rows={6}
        className={inputClass}
        placeholder="Your secure note..."
      />
    </Field>
  );
}

function IdentityFields({
  data,
  onChange,
  disabled,
}: {
  data: IdentityItem;
  onChange: (d: IdentityItem) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name">
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onChange({ ...data, firstName: e.target.value })}
            disabled={disabled}
            className={inputClass}
            placeholder="John"
          />
        </Field>
        <Field label="Last Name">
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange({ ...data, lastName: e.target.value })}
            disabled={disabled}
            className={inputClass}
            placeholder="Doe"
          />
        </Field>
      </div>
      <Field label="Email">
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="john@example.com"
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="+1 555-0100"
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

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

function Spinner() {
  return (
    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ITEM_TYPES: ItemType[] = ["login", "card", "note", "identity"];

export function ItemFormPage({ mode, editItem, onSave, onCancel }: ItemFormPageProps) {
  const [itemType, setItemType] = useState<ItemType>(
    (editItem?.itemType as ItemType) ?? "login",
  );
  const [data, setData] = useState<VaultItemData>(
    editItem?.data ?? defaultDataForType("login"),
  );
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

    // Title is always required.
    if (!("title" in data) || !(data as { title: string }).title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    try {
      await onSave(itemType, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save item.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // Update the data's title field generically.
  const title = "title" in data ? (data as { title: string }).title : "";

  function setTitle(newTitle: string) {
    setData({ ...data, title: newTitle } as VaultItemData);
  }

  // Notes field (present on all types).
  const notes = "notes" in data ? (data as { notes: string }).notes : "";

  function setNotes(newNotes: string) {
    setData({ ...data, notes: newNotes } as VaultItemData);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-100">
          {mode === "create" ? "New Item" : "Edit Item"}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Item type selector (create mode only) */}
        {mode === "create" && (
          <div>
            <span className={labelClass}>Item Type</span>
            <div className="mt-1 flex gap-2" role="radiogroup" aria-label="Item type">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={itemType === t}
                  onClick={() => handleTypeChange(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    itemType === t
                      ? "bg-blue-600 text-white"
                      : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ITEM_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title (all types) */}
        <Field label="Title">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            className={inputClass}
            placeholder="Item title"
            autoFocus
          />
        </Field>

        {/* Type-specific fields */}
        {data.type === "login" && (
          <LoginFields
            data={data as LoginItem}
            onChange={(d) => handleDataChange(d)}
            disabled={saving}
          />
        )}
        {data.type === "card" && (
          <CardFields
            data={data as CardItem}
            onChange={(d) => handleDataChange(d)}
            disabled={saving}
          />
        )}
        {data.type === "note" && (
          <NoteFields
            data={data as NoteItem}
            onChange={(d) => handleDataChange(d)}
            disabled={saving}
          />
        )}
        {data.type === "identity" && (
          <IdentityFields
            data={data as IdentityItem}
            onChange={(d) => handleDataChange(d)}
            disabled={saving}
          />
        )}

        {/* Notes (all types) */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            rows={3}
            className={inputClass}
            placeholder="Additional notes..."
          />
        </Field>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
          >
            {saving && <Spinner />}
            {saving ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
