// src/pages/UnauthorizedRedirect.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UnauthorizedRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/sales");
    }, 2000); // wait 2 seconds then redirect

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="bg-white border border-red-400 text-red-600 px-6 py-4 rounded shadow-md text-center text-lg font-semibold">
        🚫 Unauthorized Access – Redirecting to Inventory...
      </div>
    </div>
  );
};

export default UnauthorizedRedirect;
