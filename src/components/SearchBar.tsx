"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Search files..." }: SearchBarProps) {
    const [query, setQuery] = useState("");

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            onSearch(query);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, onSearch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4"
            />
        </form>
    );
}
