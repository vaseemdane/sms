"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#F7F3EC] via-[#FBF9F5] to-[#F1EBF7]">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-purple-primary text-white mx-auto flex items-center justify-center shadow-md">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Password Recovery</h1>
        </div>

        <Card className="border-border shadow-xl bg-surface">
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Reset Your Password</CardTitle>
                <CardDescription className="text-xs">
                  Enter your registered institutional email address. We will send password reset instructions.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Registered Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="name@edupulse.edu.in"
                      className="pl-9 h-10 text-xs"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-primary text-white hover:bg-purple-primary/90 h-10 text-xs font-semibold"
                >
                  Send Recovery Link
                </Button>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/80 p-4">
                <Link
                  href="/login"
                  className="text-xs text-text-secondary hover:text-foreground flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </CardFooter>
            </form>
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                Recovery Link Dispatched
              </h3>
              <p className="text-xs text-text-secondary">
                We have sent an authentication reset link to <strong>{email}</strong>. Check your inbox and follow instructions.
              </p>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/login">Return to Sign In</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
