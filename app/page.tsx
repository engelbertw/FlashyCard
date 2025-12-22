import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-foreground">
            FlashyCardy
          </h1>
          <p className="text-xl text-muted-foreground">
            Your personal flashcard platform
          </p>
        </div>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <Button size="lg" variant="default">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}
