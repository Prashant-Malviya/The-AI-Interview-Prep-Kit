import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl font-semibold tracking-tight text-ink">
          Prep Kit
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-ink/70 hover:text-ink">
              My kits
            </Link>
            <Link
              to="/kits/new"
              className="rounded-md bg-accent px-3 py-1.5 text-paper font-medium hover:bg-accent/90"
            >
              New kit
            </Link>
            <button onClick={logout} className="text-ink/50 hover:text-ink" aria-label="Log out">
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
