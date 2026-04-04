import React from "react";
import { useLocation } from "react-router-dom";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

const ComingSoonPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const featureName = searchParams.get("feature");

  return (
    <div className="container mx-auto py-24 min-h-screen flex items-center justify-center">
      <ComingSoon featureName={featureName || undefined} />
    </div>
  );
};

export default ComingSoonPage;
