import { useEffect, useState } from "react";
import API from "../api";

export default function Profile() {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    API.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <p className="p-6">Please login to see your profile.</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Profile</h2>
      <p><b>Username:</b> {user.username}</p>
      <p><b>Email:</b> {user.email}</p>
    </div>
  );
}
