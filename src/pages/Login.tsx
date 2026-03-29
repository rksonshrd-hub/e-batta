import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, } from 'lucide-react';
import logo from "../logo.png";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading("Signing in...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.success("Welcome back 👋", { id: toastId });
      }
    } catch {
      toast.error("Something went wrong ❌", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter email first ❌");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) toast.error(error.message);
    else toast.success("Reset link sent 📩");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-indigo-100 px-4 relative">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute w-[300px] h-[300px] bg-blue-400 opacity-20 blur-3xl rounded-full top-10 left-10"></div>
      <div className="absolute w-[300px] h-[300px] bg-indigo-400 opacity-20 blur-3xl rounded-full bottom-10 right-10"></div>

      {/* 🔷 HEADER */}
      <div className="flex flex-col items-center mb-10 z-10">

        {/* 🔷 TOP ROW → LOGO + COMPANY */}
        <div className="flex items-center gap-4">

          {/* 🔥 LOGO (ENHANCED) */}
          <img
            src={logo}
            alt="logo"
            className="h-16 md:h-20 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.2)] hover:scale-105 transition"
          />

          {/* 🔷 COMPANY TEXT */}
          <div className="text-left">

            <h1 className="text-3xl md:text-5xl font-extrabold text-blue-700 tracking-wide leading-tight font-[Playfair_Display]">
              R K & SONS
            </h1>

            <p className="text-sm md:text-base text-black font-medium">
              Civil Engineers & Contractors
            </p>

          </div>
        </div>

        {/* 🔷 MAIN BRAND */}
        <div className="text-center mt-6">

          {/* Single line */}
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-blue-700">
            E-Batta Card System
          </h2>

          {/* Subtle underline */}
          <div className="w-28 h-[2px] mx-auto mt-2 rounded bg-blue-600"></div>

        </div>

      </div>
      {/* 🔷 LOGIN CARD */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-8 z-10">

        <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              <Lock size={16} />
              Password
            </label>

            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-gray-500"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

        {/* Contact */}
        <button
          onClick={() => setShowContact(true)}
          className="mt-5 text-sm text-center w-full text-blue-600 hover:underline"
        >
          Contact Us
        </button>

      </div>

      {/* 🔷 CONTACT MODAL */}
      {showContact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">

            <h2 className="font-bold text-lg mb-3">Contact Us</h2>

            <p className="text-sm">
              <b>Head Office</b><br />
              RK Tower, Salem<br />
              Phone: +91-427-2447972
            </p>

            <hr className="my-3" />

            <p className="text-sm">
              <b>Branch Office</b><br />
              Chennai – 600095<br />
              Phone: 8056066605 / 6604
            </p>

            <button
              onClick={() => setShowContact(false)}
              className="mt-4 w-full py-2 bg-blue-600 text-white rounded"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}