import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/services/auth-context";
import { SMSStoreProvider } from "@/context/sms-store";

export const metadata: Metadata = {
  title: "EduPulse SMS - Karnataka School Management System",
  description: "Next-generation School Management System with persistent state and dynamic timetables",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SMSStoreProvider>
          <AuthProvider>{children}</AuthProvider>
        </SMSStoreProvider>
      </body>
    </html>
  );
}
