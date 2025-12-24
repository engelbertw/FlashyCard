import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

export async function PlanBadge() {
  const { has } = await auth();
  
  const isPremium = has({ plan: 'premium' });
  
  return (
    <Badge 
      variant={isPremium ? "default" : "secondary"}
      className="flex items-center gap-1.5"
    >
      {isPremium && <Crown className="h-3 w-3" />}
      {isPremium ? "Premium" : "Free"}
    </Badge>
  );
}

