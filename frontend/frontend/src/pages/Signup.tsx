import { useState } from "react";
import API from "../api";

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post("/auth/signup", form);
      setMessage("Signup successful! You can login now.");
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
