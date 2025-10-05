import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Sandbox from "@/components/Sandbox";

export default function LandingPage() {
    return (
        <div className="relative flex flex-col items-center justify-center overflow-hidden">
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                <Sandbox />
            </div>
        </div>
    );
}