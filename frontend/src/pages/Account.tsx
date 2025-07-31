import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { authAPI } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const Account = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await authAPI.getProfile();
      return res.data.user;
    },
  });

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  return (
    <Layout title="My Account" showSearch={false}>
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold text-center">Account Info</h1>

          {isLoading ? (
            <p className="text-center">Loading...</p>
          ) : isError ? (
            <p className="text-center text-red-500">Failed to load profile.</p>
          ) : (
            <div className="space-y-2">
              <div>
                <strong>Name:</strong> {data.name}
              </div>
              <div>
                <strong>Email:</strong> {data.email}
              </div>
              <div>
                <strong>Phone:</strong> {data.phone || "Not set"}
              </div>
            </div>
          )}

          <Button
            variant="destructive"
            className="w-full mt-4"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Account;
