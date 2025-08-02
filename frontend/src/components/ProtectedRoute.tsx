// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  allowedRoles = ["ADMIN", "SALES"], // default: allow all
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const token = localStorage.getItem("auth_token");
  const role = localStorage.getItem("user_role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (role && !allowedRoles.includes(role)) {
  return <Navigate to="/unauthorized" />;
}

  return <>{children}</>;
};

export default ProtectedRoute;
