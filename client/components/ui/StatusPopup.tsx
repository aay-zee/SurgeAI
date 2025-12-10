"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X } from "lucide-react";
import { Button } from "./button";

interface StatusPopupProps {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
}

export function StatusPopup({
  isOpen,
  type,
  title,
  message,
  onClose,
  actionLabel = "Continue",
}: StatusPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden"
          >
            {/* Background Decoration */}
            <div
              className={`absolute top-0 left-0 w-full h-1.5 ${
                type === "success"
                  ? "bg-gradient-to-r from-emerald-500 to-green-500"
                  : "bg-gradient-to-r from-red-500 to-rose-500"
              }`}
            />
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    type === "success"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {type === "success" ? (
                    <Check className="w-8 h-8" strokeWidth={3} />
                  ) : (
                    <X className="w-8 h-8" strokeWidth={3} />
                  )}
                </motion.div>
              </div>

              <h3 className="text-xl font-bold mb-2 text-foreground">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {message}
              </p>

              <Button
                onClick={onClose}
                className={`w-full font-semibold ${
                  type === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {actionLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
