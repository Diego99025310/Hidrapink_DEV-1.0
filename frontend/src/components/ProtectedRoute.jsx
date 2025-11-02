import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api.js";

const ACCEPTANCE_ROUTE = "/aceite-termos";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const [acceptance, setAcceptance] = useState({ checking: false, accepted: true });

  useEffect(() => {
    let active = true;

    if (!token || !user || user.role !== "influencer") {
      setAcceptance({ checking: false, accepted: true });
      return () => {
        active = false;
      };
    }

    if (location.pathname === ACCEPTANCE_ROUTE) {
      setAcceptance({ checking: false, accepted: true });
      return () => {
        active = false;
      };
    }

    setAcceptance({ checking: true, accepted: false });

    api
      .get("/api/aceite/status")
      .then(({ data }) => {
        if (!active) return;
        const accepted = Boolean(data?.waived || data?.accepted);
        setAcceptance({ checking: false, accepted });
        if (!accepted && typeof window !== "undefined") {
          const redirect = ACCEPTANCE_ROUTE;
          if (window.location.pathname !== redirect) {
            window.location.href = redirect;
          }
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 428) {
          setAcceptance({ checking: false, accepted: false });
        } else {
          setAcceptance({ checking: false, accepted: true });
        }
      });

    return () => {
      active = false;
    };
  }, [token, user?.role, location.pathname]);

  if (loading || acceptance.checking) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    user?.role === "influencer" &&
    location.pathname !== ACCEPTANCE_ROUTE &&
    !acceptance.accepted
  ) {
    return <Navigate to={ACCEPTANCE_ROUTE} replace />;
  }

  return <Outlet />;
}

