import { Button } from "@/components/ui/button";
import GlitchText from "@/components/ui/shadcn-io/glitch-text";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
            >
                <source src="/waves.mp4" type="video/mp4" />
            </video>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                <h1 className="text-white text-[clamp(2rem,10vw,8rem)] font-black drop-shadow-lg">VibeCAD</h1>
                {/* <GlitchText
                    speed={1}
                    enableShadows={false}
                    enableOnHover={false}
                    className="text-center"
                >
                    VibeCAD
                </GlitchText> */}
                <Link href="/create">
                    <Button className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105 cursor-pointer">
                        Begin vibing
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}