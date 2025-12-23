"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function AuthButtons() {
  return (
    <div className="flex gap-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg" variant="default">
            Sign In
          </Button>
        </DialogTrigger>
        <DialogContent>
          <SignIn 
            forceRedirectUrl="/dashboard"
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
          <SignUp 
            forceRedirectUrl="/dashboard"
            signInUrl="#"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

