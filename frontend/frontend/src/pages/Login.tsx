import { useState } from "react";
import API from "../api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      setMessage("Login successful!");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Error logging in");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input name="email" placeholder="Email" onChange={handleChange} className="border p-2" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} className="border p-2" />
        <button type="submit" className="bg-green-500 text-white p-2">Login</button>
      </form>
      <p className="mt-2 text-green-600">{message}</p>
    </div>
  );
}
