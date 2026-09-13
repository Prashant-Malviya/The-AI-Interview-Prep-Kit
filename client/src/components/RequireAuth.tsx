import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-ink/50">Checking your session…</div>;
  }
  if (!user) return null;

  return <>{children}</>;
}
