"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";

import { Brain, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { StatusPopup } from "./ui/StatusPopup";

export function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    onClose: () => void;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    onClose: () => {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await authService.login({ email, password });
      
      setPopup({
        isOpen: true,
        type: "success",
        title: "Welcome Back!",
        message: "You have successfully logged in.",
        onClose: () => {
          setPopup((prev) => ({ ...prev, isOpen: false }));
          router.push("/client");
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      
      setPopup({
        isOpen: true,
        type: "error",
        title: "Login Failed",
        message: error.response?.data?.detail || "Invalid email or password",
        onClose: () => setPopup((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="mr-4 hover:bg-accent/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SurgeAI
            </span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Card className="bg-card/80 backdrop-blur-md border border-border shadow-xl">
            <CardHeader className="text-center pb-8 pt-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <CardTitle className="text-3xl font-bold mb-3 tracking-tight text-foreground">
                  Welcome Back
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Sign in to continue your AI journey
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Label htmlFor="email" className="text-muted-foreground ml-1">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 rounded-xl bg-background text-foreground border-input focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 placeholder:text-muted-foreground"
                    required
                  />
                </motion.div>



                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Label htmlFor="password" className="text-foreground ml-1">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl bg-background text-foreground border-input focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 placeholder:text-muted-foreground"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-muted text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-center justify-between pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        setRememberMe(checked === true)
                      }
                      className="border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm cursor-pointer text-muted-foreground font-normal"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-full shadow-lg shadow-primary/20 transition-all duration-300"
                    disabled={isLoading}
                  >
                    <motion.span
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </motion.span>
                  </Button>
                </motion.div>

                <motion.div
                  className="text-center pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <p className="text-muted-foreground text-sm">
                    Don't have an account?{" "}
                    <Link
                      href="/signup"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          className="absolute top-1/4 -left-16 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-16 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-2xl -z-10"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
      
      <StatusPopup
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={popup.onClose}
        actionLabel={popup.type === "success" ? "Go to Dashboard" : "Try Again"}
      />
    </div>
  );
}
