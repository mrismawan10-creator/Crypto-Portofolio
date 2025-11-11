import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <Button asChild>
        <Link href="/portofolio-crypto">Go to Portfolio</Link>
      </Button>
    </div>
  );
}
