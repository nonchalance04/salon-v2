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
    const body = {
      firstName: String(data.get("firstName")),
      lastName: String(data.get("lastName")),
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
      <div className="section-heading">
        <div>
          <p className="eyebrow">WORKSPACE ACCESS</p>
          <h2 id="accounts-title">People & permissions</h2>
          <p className="muted">Manage Admin and Cashier accounts.</p>
        </div>
        <Button variant="default"
          className="primary"
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
        <p role="alert" className="error">
          {error}{" "}
          {!editing && <Button variant="outline" onClick={() => void load()}>Retry</Button>}
        </p>
      )}
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      {editing && (
        <form
          className="account-form"
          onSubmit={save}
          key={selected?.id ?? "new"}
        >
          <h3>{selected ? "Edit account" : "New account"}</h3>
          <div className="form-grid">
            <label>
              First name
              <Input
                name="firstName"
                required
                maxLength={100}
                defaultValue={selected?.firstName}
              />
            </label>
            <label>
              Last name
              <Input
                name="lastName"
                required
                maxLength={100}
                defaultValue={selected?.lastName}
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
            <label className="checkbox">
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
          <div className="actions">
            <Button variant="default" className="primary" disabled={busy}>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
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
                      <small className="you">You</small>
                    )}
                  </td>
                  <td>{account.username}</td>
                  <td>{account.email}</td>
                  <td>{account.role === "ADMIN" ? "Admin" : "Cashier"}</td>
                  <td>
                    <Badge variant="secondary"
                      className={`badge ${account.isActive ? "active" : ""}`}
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
