"use client";

import { useSearchParams } from "next/navigation";
import Sandbox from "@/components/Sandbox";

export default function SandboxPage() {
    const searchParams = useSearchParams();
    const modelId = searchParams.get('modelId');

    return (
        <div className="w-screen h-screen overflow-hidden">
            <Sandbox modelId={modelId} />
        </div>
    );
}