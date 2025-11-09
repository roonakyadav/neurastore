"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "completed" | "error";
    error?: string;
}

interface UploadAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    uploadedFiles: UploadFile[];
}

const COLORS = ["#00C49F", "#0088FE", "#FFBB28", "#FF8042", "#845EC2", "#E8618C", "#6EE7B7"];

export default function UploadAnalysisModal({
    isOpen,
    onClose,
    uploadedFiles,
}: UploadAnalysisModalProps) {
    const [tags, setTags] = useState<Record<string, string>>({});

    useEffect(() => {
    }, []);

    // ✅ Proper AI tagging using zero-shot-classification
    useEffect(() => {
        const fetchTags = async () => {
            const newTags: Record<string, string> = {};

            for (const file of uploadedFiles) {
                const name = file.file.name;
                const type = file.file.type || "unknown";
                const candidateLabels = [
                    "Image",
                    "Document",
                    "Video",
                    "Audio",
                    "Code",
                    "Data",
                    "Presentation",
                    "Other",
                ];

                try {
                    const response = await fetch('/api/hf-analyze', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            prompt: `This file is named "${name}" and its MIME type is "${type}".`,
                            candidateLabels,
                        }),
                    });

                    if (!response.ok) {
                        console.error('API error:', response.status, await response.text());
                        newTags[name] = 'General';
                        continue;
                    }

                    const result = await response.json();
                    let tagText = 'General';

                    // Handle both successful responses and fallback responses
                    if (result?.labels && Array.isArray(result.labels) && result.labels.length > 0) {
                        tagText = result.labels[0];
                    } else if (result?.fallback) {
                        // This is a fallback response due to API failure
                        tagText = 'General';
                    }

                    newTags[name] = tagText;
                } catch (err) {
                    console.error('Tagging error:', err);
                    newTags[name] = 'General';
                }
            }

            setTags(newTags);
        };

        if (isOpen && uploadedFiles.length > 0) fetchTags();
    }, [isOpen, uploadedFiles]);

    if (!uploadedFiles?.length) return null;

    const totalBytes = uploadedFiles.reduce((a, f) => a + f.file.size, 0);
    const totalKB = (totalBytes / 1024).toFixed(2);
    const avgKB = (totalBytes / uploadedFiles.length / 1024).toFixed(2);

    const typeCounts: Record<string, number> = {};
    uploadedFiles.forEach((f) => {
        const key = f.file.type.split("/")[0] || "Other";
        typeCounts[key] = (typeCounts[key] || 0) + 1;
    });

    const chartData = Object.entries(typeCounts).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] md:max-w-[1600px] w-full bg-background border border-muted rounded-2xl shadow-2xl p-10">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold text-center">
                        Upload Analysis Summary
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start mt-8">
                    {/* Pie Chart Section */}
                    <div className="flex justify-center items-center w-full h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={180}
                                    label
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats + File Details */}
                    <Card className="p-8 bg-card border border-muted overflow-y-auto max-h-[600px]">
                        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
                        <div className="space-y-2 text-sm">
                            <p>
                                <strong>Total Files:</strong> {uploadedFiles.length}
                            </p>
                            <p>
                                <strong>Total Storage:</strong> {totalKB} KB
                            </p>
                            <p>
                                <strong>Average File Size:</strong> {avgKB} KB
                            </p>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-md font-semibold mb-3">Files & AI Tags</h3>
                            <ul className="space-y-3">
                                {uploadedFiles.map((f, idx) => (
                                    <motion.li
                                        key={idx}
                                        className="p-4 rounded-lg border border-muted bg-muted/10 hover:bg-muted/20 transition-all"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex justify-between items-center flex-wrap gap-2">
                                            <div>
                                                <div className="font-medium text-base">
                                                    {f.file.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {f.file.type || "Unknown"} —{" "}
                                                    {(f.file.size / 1024).toFixed(2)} KB
                                                </div>
                                            </div>
                                            <Badge className="bg-green-700 text-white px-3 py-1 text-xs font-semibold">
                                                {tags[f.file.name] || "Analyzing..."}
                                            </Badge>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end mt-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all"
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
