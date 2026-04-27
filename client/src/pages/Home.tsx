import { useEffect } from "react";
import { useLocation } from "wouter";

// Home redirects to the main dashboard
export default function Home() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, []);
  return null;
}
