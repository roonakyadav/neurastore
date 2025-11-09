"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardCharts from "@/components/DashboardCharts";

export default function DashboardPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchDashboardData() {
            try {
                console.log("Fetching from Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

                const { data, error } = await supabase
                    .from("files_metadata")
                    .select("*")
                    .order("uploaded_at", { ascending: false });

                if (error) throw error;
                if (!Array.isArray(data)) throw new Error("Invalid data format from Supabase");

                if (isMounted) {
                    setFiles(data);
                    setError(null);
                    console.log("Dashboard data received:", data);
                }
            } catch (err: any) {
                console.error("Dashboard fetch error:", err.message);
                if (isMounted) setError(err.message || "Failed to load dashboard data.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDashboardData();
        return () => {
            isMounted = false;
        };
    }, []);

    if (loading)
        return <p className="text-gray-400 text-center mt-10">Loading dashboard data…</p>;

    if (error)
        return (
            <div className="text-center text-red-400 mt-10">
                <p>Error loading data: {error}</p>
                <button
                    className="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                    onClick={() => location.reload()}
                >
                    Retry
                </button>
            </div>
        );

    if (!files.length)
        return (
            <div className="text-gray-400 text-center mt-10">
                <p>No files found in Supabase.</p>
            </div>
        );

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-semibold text-white mb-4">Dashboard</h1>
            <DashboardCharts files={files} />
        </div>
    );
}
