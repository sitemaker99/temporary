"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import {
  loginWithEmail,
  signupWithEmail,
  loginWithGoogle,
  getUserData,
} from "@/lib/firebase";
import { Loader2, LogIn, UserPlus } from "lucide-react";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

type FormData = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

function LoginPopoverButton() {
  const authStore = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const clearForm = () =>
    setFormData({ username: "", email: "", password: "", confirm_password: "" });

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithEmail(formData.email, formData.password);
      const userData = await getUserData(result.user.uid);
      authStore.setAuth({
        id: result.user.uid,
        email: result.user.email || "",
        username: userData?.username || result.user.displayName || "Otaku",
        avatar: userData?.avatar || result.user.photoURL || "",
        autoSkip: userData?.autoSkip || false,
      });
      toast.success("Welcome back! 🎌");
      clearForm();
      setOpen(false);
    } catch (e: any) {
      const msg =
        e.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : e.message || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirm_password
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await signupWithEmail(
        formData.email,
        formData.password,
        formData.username
      );
      authStore.setAuth({
        id: result.user.uid,
        email: result.user.email || "",
        username: formData.username,
        avatar: "",
        autoSkip: false,
      });
      toast.success("Welcome to Aniflix! 🎌");
      clearForm();
      setOpen(false);
    } catch (e: any) {
      const msg =
        e.code === "auth/email-already-in-use"
          ? "Email already in use"
          : e.message || "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const userData = await getUserData(result.user.uid);
      authStore.setAuth({
        id: result.user.uid,
        email: result.user.email || "",
        username: userData?.username || result.user.displayName || "Otaku",
        avatar: result.user.photoURL || "",
        autoSkip: userData?.autoSkip || false,
      });
      setOpen(false);
      toast.success("Welcome! 🎌");
    } catch (e: any) {
      toast.error(e.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative group px-4 py-2 text-sm font-semibold text-white overflow-hidden rounded-md transition-all duration-300">
          <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="absolute inset-0 border border-red-400/50 rounded-md" />
          <span className="relative flex items-center gap-1.5">
            <LogIn size={14} />
            Login
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="relative w-[320px] mt-3 mr-3 p-0 border-0 overflow-hidden rounded-xl shadow-2xl"
        style={{ background: "transparent" }}
      >
        <div className="absolute inset-0 bg-[#0d0f1a] opacity-97 rounded-xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-pink-900/20 rounded-xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />

        <div className="relative p-5">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white tracking-wider">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">
                ANIFLIX
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Your anime journey begins here</p>
          </div>

          <Tabs
            defaultValue={tabValue}
            value={tabValue}
            onValueChange={(v) => setTabValue(v as "login" | "signup")}
          >
            <TabsList className="w-full bg-white/5 border border-white/10 p-0.5 rounded-lg mb-4">
              <TabsTrigger
                value="login"
                onClick={clearForm}
                className="w-1/2 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                onClick={clearForm}
                className="w-1/2 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3 mt-0">
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-9 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Login
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0d0f1a] px-2 text-gray-500">or</span>
                </div>
              </div>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-9 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md transition-all flex items-center justify-center disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-0">
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                className="bg-white/5 border-white/15 text-white placeholder:text-gray-500 text-sm h-9 focus:border-red-500 transition-colors"
              />
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full h-9 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Create Account
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0d0f1a] px-2 text-gray-500">or</span>
                </div>
              </div>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-9 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md transition-all flex items-center justify-center disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LoginPopoverButton;
