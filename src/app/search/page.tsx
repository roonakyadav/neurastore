"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import SearchBar from "@/components/SearchBar";
import FileCard from "@/components/FileCard";
import { motion } from "framer-motion";

interface FileMetadata {
    id: number;
    name: string;
    mime_type: string;
    size: number;
    category: string;
    confidence: number;
    folder_path: string;
    public_url: string;
    uploaded_at: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState<string>("All");
    const [results, setResults] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [allCategories, setAllCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchCategories();
        performSearch();
    }, [query, selectedFilter]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('files_metadata')
                .select('category')
                .not('category', 'is', null);

            if (error) throw error;

            const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
            setAllCategories(uniqueCategories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const performSearch = async () => {
        setLoading(true);
        try {
            let queryBuilder = supabase
                .from('files_metadata')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (query.trim()) {
                queryBuilder = queryBuilder.or(`name.ilike.%${query}%,category.ilike.%${query}%`);
            }

            if (selectedFilter !== "All") {
                if (selectedFilter === "Images") {
                    queryBuilder = queryBuilder.ilike('mime_type', 'image/%');
                } else if (selectedFilter === "Documents") {
                    queryBuilder = queryBuilder.or('mime_type.ilike.%text/%,mime_type.ilike.%document%,mime_type.ilike.%application/pdf%');
                } else if (selectedFilter === "Videos") {
                    queryBuilder = queryBuilder.ilike('mime_type', 'video/%');
                } else if (selectedFilter === "JSON") {
                    queryBuilder = queryBuilder.ilike('mime_type', 'application/json');
                } else if (selectedFilter === "Text Files") {
                    queryBuilder = queryBuilder.ilike('mime_type', 'text/%');
                } else if (selectedFilter === "Others") {
                    // Filter for files that don't match common categories
                    queryBuilder = queryBuilder.not('mime_type', 'ilike', 'image/%')
                        .not('mime_type', 'ilike', 'video/%')
                        .not('mime_type', 'ilike', 'text/%')
                        .not('mime_type', 'ilike', 'application/json')
                        .not('mime_type', 'ilike', 'application/pdf')
                        .not('mime_type', 'ilike', 'application/msword')
                        .not('mime_type', 'ilike', 'application/vnd%');
                } else {
                    // Fallback for any other filters
                    queryBuilder = queryBuilder.ilike('category', `%${selectedFilter.toLowerCase()}%`);
                }
            }

            const { data, error } = await queryBuilder.limit(100);

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error('Error performing search:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getFilterChips = () => {
        const baseFilters = ["All", "Images", "Documents", "Videos"];
        const staticFilters = ["JSON", "Text Files", "Others"];
        return [...baseFilters, ...staticFilters];
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Smart Search</h1>
                <p className="text-muted-foreground">
                    Search through your files using AI-powered filtering
                </p>
            </div>

            {/* Search Bar */}
            <Card>
                <CardContent className="p-6">
                    <SearchBar
                        onSearch={setQuery}
                        placeholder="Search files or tags..."
                    />
                </CardContent>
            </Card>

            {/* Filter Chips */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {getFilterChips().map((filter) => (
                            <Button
                                key={filter}
                                variant={selectedFilter === filter ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedFilter(filter)}
                                className={selectedFilter === filter ? "bg-teal-600 hover:bg-teal-700" : ""}
                            >
                                {filter}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Search Results ({results.length} files)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : results.length > 0 ? (
                        <motion.div
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {results.map((file) => (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <FileCard
                                        name={file.name}
                                        size={file.size}
                                        type={file.mime_type}
                                        url={file.public_url}
                                    />
                                    <div className="mt-2 flex items-center gap-2">
                                        <Badge variant="secondary">
                                            Tag: {file.category}
                                        </Badge>
                                        <Badge variant="outline">
                                            {(file.confidence * 100).toFixed(0)}%
                                        </Badge>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg font-medium mb-2">No files found</p>
                            <p>Try adjusting your search query or filter</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
