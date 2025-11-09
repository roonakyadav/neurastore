"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardCharts from "@/components/DashboardCharts";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortBy, setSortBy] = useState("recent");

    useEffect(() => {
        let isMounted = true;
        async function fetchDashboardData() {
            try {
                const { data, error } = await supabase
                    .from("files_metadata")
                    .select("*")
                    .order("uploaded_at", { ascending: false });
                if (error) throw error;
                if (!Array.isArray(data)) throw new Error("Invalid data format");
                if (isMounted) {
                    setFiles(data);
                    setFilteredFiles(data);
                }
            } catch (err: any) {
                console.error("Dashboard fetch error:", err);
                setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchDashboardData();
        return () => { isMounted = false };
    }, []);

    // Handle filter
    function applyFilters(category: string, sort: string) {
        let result = [...files];
        if (category !== "All") {
            result = result.filter(f => f.category === category);
        }
        if (sort === "recent") {
            result.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        } else if (sort === "oldest") {
            result.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
        } else if (sort === "size") {
            result.sort((a, b) => (b.size || 0) - (a.size || 0));
        }
        setFilteredFiles(result);
    }

    useEffect(() => {
        applyFilters(selectedCategory, sortBy);
    }, [selectedCategory, sortBy, files]);

    if (loading) return <p className="text-gray-400 text-center mt-10">Loading dashboard data...</p>;
    if (error) return <p className="text-red-400 text-center mt-10">Error: {error}</p>;
    if (!files.length) return <p className="text-gray-400 text-center mt-10">No files found in Supabase.</p>;

    const categories = Array.from(new Set(files.map(f => f.category))).filter(Boolean);

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-semibold text-white mb-4">Dashboard</h1>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-600"
                >
                    <option value="All">All Categories</option>
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-600"
                >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                    <option value="size">Largest</option>
                </select>
            </div>

            {/* Charts */}
            <DashboardCharts files={filteredFiles} />

            {/* Files List */}
            <div className="bg-gray-900 p-4 rounded-lg">
                <h2 className="text-lg font-medium mb-3">Uploaded Files ({filteredFiles.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredFiles.map((file) => (
                        <div key={file.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{file.category || "Uncategorized"} • {(file.size / 1024).toFixed(2)} KB</p>
                            <p className="text-xs text-gray-500">Uploaded {formatDistanceToNow(new Date(file.uploaded_at))} ago</p>
                            {file.ai_tags && file.ai_tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {file.ai_tags.map((tag: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
