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
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { PlanBadge } from "@/components/plan-badge";
import Link from "next/link";
import { Library, Trophy, CreditCard } from "lucide-react";

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
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="dark"
        >
          <ClerkProviderWrapper>
            <header className="border-b border-border bg-card sticky top-0 z-50">
              <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                  <SignedIn>
                    <MobileNav />
                  </SignedIn>
                  
                  <Link href="/" className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
                    FlashyCards
                  </Link>
                  
                  <nav className="hidden md:flex items-center gap-6">
                    <SignedIn>
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Library className="h-4 w-4" />
                        My Decks
                      </Link>
                    </SignedIn>
                    <Link 
                      href="/pricing" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pricing
                    </Link>
                    <SignedIn>
                      <Link 
                        href="/leaderboards" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Trophy className="h-4 w-4" />
                        Leaderboards
                      </Link>
                    </SignedIn>
                  </nav>
                </div>
                
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <SignInButton 
                      mode="modal"
                      forceRedirectUrl="/"
                    >
                      <Button>Sign In</Button>
                    </SignInButton>
                    <SignUpButton 
                      mode="modal"
                      forceRedirectUrl="/"
                    >
                      <Button variant="outline">Sign Up</Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center gap-3">
                      <PlanBadge />
                      <UserButton afterSignOutUrl="/" />
                    </div>
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
