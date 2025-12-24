import { PricingTable } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Choose Your Plan</CardTitle>
            <CardDescription className="text-lg">
              Select the plan that best fits your learning needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

