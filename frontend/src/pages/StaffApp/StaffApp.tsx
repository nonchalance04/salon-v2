// Bring in the tools for the staff app view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { useAuth } from "../../contexts/AuthProvider";
import { WorkspaceLayout } from "../../layouts/WorkspaceLayout";
import { Login } from "../Login";
import { Accounts } from "../../components/Accounts";

// Show the signed-in staff workspace so daily salon actions are available in one place.
export function StaffApp() {
  const { user, loading, error, refresh } = useAuth();
  if (loading)
    return (
      <main className="loading tw:min-h-screen tw:flex tw:flex-col tw:items-center tw:justify-center tw:p-7.5" role="status">
        Opening your workspace…
      </main>
    );
  if (error)
    return (
      <main className="loading tw:min-h-screen tw:flex tw:flex-col tw:items-center tw:justify-center tw:p-7.5">
        <h1>Unable to connect</h1>
        <p role="alert">{error}</p>
        <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
      </main>
    );
  return user ? <WorkspaceLayout key={user.role} accounts={<Accounts />} /> : <Login />;
}
