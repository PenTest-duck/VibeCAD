import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center">
            <h1 className="text-white text-6xl font-bold mb-8">VibeCAD</h1>
            <Link href="/">
                <Button className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105 cursor-pointer">
                    Begin vibing
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
            </Link>
        </div>
    );
}