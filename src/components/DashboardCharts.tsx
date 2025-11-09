"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
    ai_tags?: string[];
}

interface DashboardChartsProps {
    files: FileMetadata[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const getFileTypeCategory = (type: string) => {
    if (type.startsWith('image/')) return 'Images';
    if (type.startsWith('video/')) return 'Videos';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.startsWith('text/') || type.includes('document')) return 'Documents';
    return 'Other';
};

export default function DashboardCharts({ files }: DashboardChartsProps) {
    if (!files || !Array.isArray(files)) return <p>No data to visualize.</p>;
    // Add validation
    if (!files || files.length === 0) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No data to display</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Before mapping data:
    const safeFiles = files.filter(f => !!f.category);

    // Protect all chart mappings with safe data handling
    const dataByCategory = safeFiles?.reduce((acc: Record<string, number>, file) => {
        const cat = file.category;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>) || {};

    const fileTypeData = Object.entries(dataByCategory).map(([name, value]) => ({ name, value }));

    // Validate before render
    if (!fileTypeData || fileTypeData.length === 0) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No data available for charts</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Upload trend data (last 7 days)
    const uploadTrendData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = files.filter(file =>
            file.uploaded_at.startsWith(dateStr)
        ).length;
        uploadTrendData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            uploads: count,
        });
    }

    // Top AI tags data
    const tagCounts: { [key: string]: number } = {};
    safeFiles.forEach(file => {
        if (file.ai_tags && Array.isArray(file.ai_tags)) {
            file.ai_tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    {uploadTrendData.some(d => d.uploads > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={uploadTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="uploads" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No upload data available
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AI Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    {fileTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={fileTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {fileTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Top AI Tags</CardTitle>
                </CardHeader>
                <CardContent>
                    {topTags.length > 0 ? (
                        <div className="space-y-2">
                            {topTags.map(({ tag, count }) => (
                                <div key={tag} className="flex items-center justify-between">
                                    <span className="font-medium">{tag}</span>
                                    <span className="text-muted-foreground">{count} files</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                            No tag data available
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
