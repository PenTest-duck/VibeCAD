"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sandbox from "@/components/Sandbox";

function SandboxPageInner() {
    const searchParams = useSearchParams();
    const modelId = searchParams.get('modelId');
    return (
        <div className="w-screen h-screen overflow-hidden">
            <Sandbox modelId={modelId} />
        </div>
    );
}

export default function SandboxPage() {
    return (
        <Suspense fallback={<div className="w-screen h-screen flex items-center justify-center">Loading…</div>}>
            <SandboxPageInner />
        </Suspense>
    );
}