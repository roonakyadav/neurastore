"use client";

import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";

export function ClientToastProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>{children}</>;
    }

    return <ToastProvider>{children}</ToastProvider>;
}
