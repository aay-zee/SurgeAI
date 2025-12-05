'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Brain, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/login">
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

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Card className="bg-card/70 backdrop-blur-xl border-2 border-primary/20 shadow-2xl shadow-primary/10">
            <CardHeader className="text-center pb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                      <motion.div
                        key="mail"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Mail className="w-8 h-8 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                      >
                        <CheckCircle className="w-8 h-8 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <CardTitle className="text-2xl font-bold mb-2">
                  {!isSubmitted ? 'Forgot Password?' : 'Check Your Email'}
                </CardTitle>
                <p className="text-muted-foreground">
                  {!isSubmitted 
                    ? 'No worries! Enter your email and we\'ll send you a reset link.'
                    : `We've sent a password reset link to ${email}`
                  }
                </p>
              </motion.div>
            </CardHeader>
            
            <CardContent>
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="bg-input-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                        required
                        disabled={isLoading}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                        disabled={isLoading}
                      >
                        <motion.div
                          className="flex items-center justify-center"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isLoading ? (
                            <>
                              <motion.div
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Sending...
                            </>
                          ) : (
                            'Send Reset Link'
                          )}
                        </motion.div>
                      </Button>
                    </motion.div>

                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <p className="text-muted-foreground">
                        Remember your password?{' '}
                        <Link href="/login">
                          <Button
                            variant="link"
                            className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                          >
                            Sign in
                          </Button>
                        </Link>
                      </p>
                    </motion.div>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    className="space-y-6 text-center"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-muted-foreground">
                        If an account with that email exists, you'll receive a password reset link shortly.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Didn't receive the email? Check your spam folder or try again.
                      </p>
                    </motion.div>

                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={() => setIsSubmitted(false)}
                        variant="outline"
                        className="w-full py-3 rounded-xl border-2 hover:bg-accent/10"
                      >
                        Try Another Email
                      </Button>
                      <Link href="/login">
                        <Button
                          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-3 rounded-xl transition-all duration-300"
                        >
                          Back to Sign In
                        </Button>
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          className="absolute top-1/3 -left-16 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/3 -right-16 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-2xl -z-10"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Animated Paper Plane (when email is sent) */}
        <AnimatePresence>
          {isSubmitted && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10"
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: [-45, 0, 15],
                opacity: [0, 1, 0.3],
                x: [0, 200, 400],
                y: [0, -50, -100]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 3,
                times: [0, 0.3, 1],
                ease: "easeOut"
              }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-sm transform rotate-45">
                <div className="absolute inset-1 bg-white/20 rounded-sm" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}