import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          404 - Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page you are looking for does not exist, has been removed, or is temporarily unavailable.
        </p>
      </div>

      <Button asChild className="gap-2">
        <Link href="/">
          <Home className="w-4 h-4" />
          Go Back to Home
        </Link>
      </Button>
    </div>
  );
}