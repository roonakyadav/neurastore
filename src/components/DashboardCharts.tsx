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

    // Prevent crashes
    const categories = files.map(f => f.category || 'Uncategorized');
    const chartData = Array.isArray(categories) ? categories : [];

    // AI Category distribution data (using the actual AI classification categories)
    const categoryCounts: { [key: string]: number } = {};
    files.forEach(file => {
        const category = file.category || 'Uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const fileTypeData = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value,
    }));

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
    files.forEach(file => {
        const category = file.category || 'Uncategorized';
        tagCounts[category] = (tagCounts[category] || 0) + 1;
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
