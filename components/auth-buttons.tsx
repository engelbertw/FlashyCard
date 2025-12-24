"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // User is signed in, redirect to home page (which now shows decks)
      router.push("/");
    }
  }, [isSignedIn, isLoaded, router]);

  // Don't render auth buttons if still loading
  if (!isLoaded) {
    return null;
  }

  // Don't render auth buttons if user is already signed in
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="flex gap-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg" variant="default">
            Sign In
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="sr-only">Sign In to FlashyCards</DialogTitle>
          <SignIn 
            routing="hash"
            signUpUrl="#"
          />
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline">
            Sign Up
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="sr-only">Sign Up for FlashyCards</DialogTitle>
          <SignUp 
            routing="hash"
            signInUrl="#"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

