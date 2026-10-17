import { useAuth } from "../../contexts/AuthProvider";
import { WorkspaceLayout } from "../../layouts/WorkspaceLayout";
import { Login } from "../Login";
import { Accounts } from "../../components/Accounts";

export function StaffApp() {
  const { user, loading, error, refresh } = useAuth();
  if (loading)
    return (
      <main className="loading" role="status">
        Opening your workspace…
      </main>
    );
  if (error)
    return (
      <main className="loading">
        <h1>Unable to connect</h1>
        <p role="alert">{error}</p>
        <button onClick={() => void refresh()}>Try again</button>
      </main>
    );
  return user ? <WorkspaceLayout key={user.role} accounts={<Accounts />} /> : <Login />;
}
