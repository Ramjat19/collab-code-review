import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAuthToken } from "../api";

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/signup", form);
      const { token, expiresIn } = res.data;
      if (token) {
        setAuthToken(token, expiresIn); // Store token and schedule proactive refresh
        setMessage("Signup successful! Redirecting...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        setMessage("Signup successful! You can login now.");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setMessage(error.response?.data?.message || "Error signing up");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Signup</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input name="username" placeholder="Username" onChange={handleChange} className="border p-2" />
        <input name="email" placeholder="Email" onChange={handleChange} className="border p-2" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} className="border p-2" />
        <button type="submit" className="bg-blue-500 text-white p-2">Signup</button>
      </form>
      <p className="mt-2 text-green-600">{message}</p>
    </div>
  );
}
