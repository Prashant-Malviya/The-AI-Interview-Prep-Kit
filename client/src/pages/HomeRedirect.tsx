import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function HomeRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate(user ? "/dashboard" : "/login", { replace: true });
  }, [user, loading, navigate]);

  return <div className="flex h-screen items-center justify-center font-display text-ink/60 text-lg">Prep Kit</div>;
}
