"use client";

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop sidebar */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
                    <Sidebar />
                </div>
            </div>

            {/* Mobile sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="pr-0">
                    <Sidebar />
                </SheetContent>
            </Sheet>

            <div className="md:pl-64">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="py-6">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
