import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { Button } from "@/components/ui/button";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FlashyCards",
  description: "Your flashcard learning app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProviderWrapper>
            <header className="border-b border-border bg-card">
              <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <h1 className="text-xl font-semibold text-foreground">FlashyCards</h1>
                <div className="flex items-center gap-4">
                  <ModeToggle />
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button>Sign In</Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button variant="outline">Sign Up</Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                </div>
              </div>
            </header>
            {children}
          </ClerkProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
