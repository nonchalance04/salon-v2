import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Badge } from "@/components/ui/Badge";
import { useEffect, useState, type FormEvent } from "react";
import { api, type User } from "../../lib/api";
import { useAuth } from "../../contexts/AuthProvider";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function Accounts() {
  const { user, refresh } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers((await api<{ users: User[] }>("/users")).users);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password && new TextEncoder().encode(password).length > 72) {
      setError("Password must fit within 72 UTF-8 bytes.");
      return;
    }
    const target = editing;
    const fullName = String(data.get("fullName") ?? "").trim();
    const existing = target && target !== "new" ? target : null;
    const parts = fullName.match(/^(\S+)\s+(.+)$/);
    // Preserve existing name boundaries when only other account details change.
    const name = existing && fullName === `${existing.firstName} ${existing.lastName}`.trim()
      ? { firstName: existing.firstName, lastName: existing.lastName }
      : parts ? { firstName: parts[1], lastName: parts[2].trim() } : { firstName: fullName, lastName: "" };
    if (!fullName) {
      setError("Enter a full name.");
      return;
    }
    if (name.firstName.length > 100 || name.lastName.length > 100) {
      setError("This name is too long. Use no more than 100 characters for each name part.");
      return;
    }
    const body = {
      ...name,
      username: String(data.get("username")).trim().toLowerCase(),
      email: String(data.get("email")).trim().toLowerCase(),
      role: String(data.get("role")),
      isActive: data.get("isActive") === "on",
      ...(password ? { password } : {}),
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(target === "new" ? "/users" : `/users/${(target as User).id}`, {
        method: target === "new" ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      setEditing(null);
      setNotice("Account saved.");
      if (target !== "new" && target?.id === user?.id) {
        await refresh();
        if (body.role === "ADMIN" && body.isActive) await load();
      } else await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const selected = editing && editing !== "new" ? editing : null;
  return (
    <section aria-labelledby="accounts-title">
      <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
        <div>
          <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">WORKSPACE ACCESS</p>
          <h2 id="accounts-title">People & permissions</h2>
          <p className="muted">Manage Admin and Cashier accounts.</p>
        </div>
        <Button variant="default"
          className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
          onClick={() => {
            setEditing("new");
            setError("");
            setNotice("");
          }}
        >
          + Add account
        </Button>
      </div>
      {error && (
        <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
          {error}{" "}
          {!editing && <Button variant="outline" onClick={() => void load()}>Retry</Button>}
        </p>
      )}
      {notice && (
        <p role="status" className="success tw:[.admin-settlement_>_&]:[grid-column:2] tw:[.admin-settlement_>_&]:m-0 tw:[background:#eaf2e9]
          tw:py-3 tw:px-4 tw:rounded-[6px] tw:[.clique-login-form_&]:text-[#203c34]">
          {notice}
        </p>
      )}
      {editing && (
        <form
          className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5"
          onSubmit={save}
          key={selected?.id ?? "new"}
        >
          <h3>{selected ? "Edit account" : "New account"}</h3>
          <div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">
            <label>
              Full name
              <Input
                name="fullName"
                required
                maxLength={201}
                autoComplete="name"
                defaultValue={selected ? `${selected.firstName} ${selected.lastName}`.trim() : ""}
              />
            </label>
            <label>
              Username
              <Input name="username" required maxLength={254} pattern="[^@\s]+"
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                defaultValue={selected?.username} />
              <small>Used to sign in. No spaces or @.</small>
            </label>
            <label>
              Email address
              <Input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={selected?.email}
              />
            </label>
            <label>
              Role
              <NativeSelect name="role" defaultValue={selected?.role ?? "CASHIER"}>
                <NativeSelectOption value="CASHIER">Cashier</NativeSelectOption>
                <NativeSelectOption value="ADMIN">Admin</NativeSelectOption>
              </NativeSelect>
            </label>
            <label>
              {selected ? "New password (optional)" : "Password"}
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required={!selected}
              />
              <small>
                At least 12 characters; no more than 72 UTF-8 bytes.
              </small>
            </label>
            <label className="checkbox tw:flex-row tw:items-center tw:[&_input]:w-4.5 tw:[&_input]:h-4.5 tw:[&_input]:[accent-color:#203c34]">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={selected?.isActive ?? true}
              />{" "}
              Active account
            </label>
          </div>
          {selected?.id === user?.id && (
            <p className="muted">
              Changing your own role or active status changes your workspace
              access immediately.
            </p>
          )}
          <div className="actions tw:flex tw:gap-3">
            <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy}>
              {busy ? "Saving…" : "Save account"}
            </Button>
            <Button variant="outline"
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {loading ? (
        <p role="status">Loading accounts…</p>
      ) : (
        <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem]">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>
                  <span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>
                      {account.firstName} {account.lastName}
                    </strong>
                    {account.id === user?.id && (
                      <small className="you tw:ml-2.5 tw:text-[10px]">You</small>
                    )}
                  </td>
                  <td>{account.username}</td>
                  <td>{account.email}</td>
                  <td>{account.role === "ADMIN" ? "Admin" : "Cashier"}</td>
                  <td>
                    <Badge variant="secondary"
                      className={`badge tw:inline-block tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#eeece8] tw:text-[12px] tw:text-[#65675f] tw:[&.active]:[background:#e6efe4] tw:[&.active]:text-[#365c3c]  ${account.isActive ? "active" : ""}`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline"
                      aria-label={`Edit ${account.firstName} ${account.lastName}`}
                      onClick={() => {
                        setEditing(account);
                        setError("");
                        setNotice("");
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
