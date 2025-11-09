"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, HardDrive, TrendingUp, Image, Video, Music, File, Search, Download, Eye, Calendar, FileJson } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import StatsCard from "@/components/StatsCard";
import DashboardCharts from "@/components/DashboardCharts";
import SchemaView from "@/components/SchemaView";

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

interface DashboardStats {
    totalFiles: number;
    totalSize: number;
    recentUploads: number;
    analyzedFiles: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const getFileTypeCategory = (type: string) => {
    if (type.startsWith('image/')) return 'Images';
    if (type.startsWith('video/')) return 'Videos';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.startsWith('text/') || type.includes('document')) return 'Documents';
    return 'Other';
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    return FileText;
};

const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
        'person': 'bg-blue-500',
        'car': 'bg-red-500',
        'animal': 'bg-green-500',
        'food': 'bg-yellow-500',
        'landscape': 'bg-purple-500',
        'building': 'bg-indigo-500',
        'technology': 'bg-pink-500',
        'sports': 'bg-orange-500',
    };
    return colors[category.toLowerCase()] || 'bg-gray-500';
};

type TimeFilter = 'today' | '7days' | '30days' | 'all';

// Helper function to calculate dashboard stats
function getStats(data: FileMetadata[]) {
    const totalFiles = data.length;
    const totalSize = data.reduce((sum, f) => sum + (f.size || 0), 0);
    const recentUploads = data.filter(file => {
        const uploadDate = new Date(file.uploaded_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return uploadDate > weekAgo;
    }).length;
    const analyzedFiles = totalFiles; // All files are analyzed

    return {
        totalFiles,
        totalSize,
        recentUploads,
        analyzedFiles,
    };
}

export default function Dashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalFiles: 0,
        totalSize: 0,
        recentUploads: 0,
        analyzedFiles: 0,
    });
    const [allFiles, setAllFiles] = useState<FileMetadata[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
    const [fileTypeData, setFileTypeData] = useState<any[]>([]);
    const [uploadTrendData, setUploadTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'uploaded_at'>('uploaded_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [schemaViewFile, setSchemaViewFile] = useState<FileMetadata | null>(null);
    const [isSchemaViewOpen, setIsSchemaViewOpen] = useState(false);

    useEffect(() => {
        fetchAllFiles();
        // Load saved filter from localStorage
        const savedFilter = localStorage.getItem('dashboard-time-filter') as TimeFilter;
        if (savedFilter) {
            setTimeFilter(savedFilter);
        }
    }, []);

    useEffect(() => {
        applyFilters();
        localStorage.setItem('dashboard-time-filter', timeFilter);
    }, [timeFilter, categoryFilter, allFiles, sortBy, sortOrder]);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const timeout = setTimeout(() => {
            performSearch();
        }, 300); // 300ms debounce

        setSearchTimeout(timeout);

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [searchQuery]);

    const fetchAllFiles = async () => {
        try {
            const { data, error } = await supabase
                .from('files_metadata')
                .select('id, name, size, mime_type, category, confidence, folder_path, public_url, uploaded_at')
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Filter out malformed records
            const validData = (data || []).filter(file =>
                file &&
                file.name &&
                file.mime_type &&
                file.uploaded_at &&
                file.size !== null
            );

            // Add fallback values for any remaining null/undefined fields
            const sanitizedData = validData.map(file => ({
                ...file,
                category: file.category || 'Unclassified',
                size: file.size || 0,
                confidence: file.confidence || 0,
            }));

            setAllFiles(sanitizedData);

            // Calculate initial stats
            const initialStats = getStats(sanitizedData);
            setStats(initialStats);

            // Immediately apply filters and update stats after data is loaded
            if (sanitizedData.length > 0) {
                applyFilters();
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            setAllFiles([]); // Ensure we set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const getDateRange = (filter: TimeFilter) => {
        const now = new Date();
        switch (filter) {
            case 'today':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return today.toISOString();
            case '7days':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return weekAgo.toISOString();
            case '30days':
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                return monthAgo.toISOString();
            case 'all':
            default:
                return null;
        }
    };

    const performSearch = async () => {
        if (!searchQuery.trim()) {
            // If no search query, use client-side filtering
            applyFilters();
            return;
        }

        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                q: searchQuery.trim(),
                limit: '1000' // Large limit for dashboard
            });

            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            // Apply client-side filters to search results
            let filtered = data.results;

            // Apply time filter
            const dateRange = getDateRange(timeFilter);
            if (dateRange) {
                filtered = filtered.filter((file: FileMetadata) => file.uploaded_at >= dateRange);
            }

            // Apply category filter
            if (categoryFilter !== 'all') {
                filtered = filtered.filter((file: FileMetadata) => file.category === categoryFilter);
            }

            // Apply sorting
            filtered.sort((a: FileMetadata, b: FileMetadata) => {
                let aValue: any, bValue: any;
                switch (sortBy) {
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'size':
                        aValue = a.size;
                        bValue = b.size;
                        break;
                    case 'uploaded_at':
                        aValue = new Date(a.uploaded_at);
                        bValue = new Date(b.uploaded_at);
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            setFilteredFiles(filtered);
            updateStatsAndCharts(filtered);
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to client-side filtering on error
            applyFilters();
        } finally {
            setIsSearching(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...allFiles];

        // Apply time filter
        const dateRange = getDateRange(timeFilter);
        if (dateRange) {
            filtered = filtered.filter(file => file.uploaded_at >= dateRange);
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(file => file.category === categoryFilter);
        }

        // Apply search filter (client-side fallback)
        if (searchQuery) {
            filtered = filtered.filter(file =>
                file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                file.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'size':
                    aValue = a.size;
                    bValue = b.size;
                    break;
                case 'uploaded_at':
                    aValue = new Date(a.uploaded_at);
                    bValue = new Date(b.uploaded_at);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredFiles(filtered);
        updateStatsAndCharts(filtered);
    };

    const updateStatsAndCharts = (filesData: FileMetadata[]) => {
        // Use the helper function to calculate stats
        const calculatedStats = getStats(filesData);
        setStats(calculatedStats);

        // File type distribution
        const typeCounts: { [key: string]: number } = {};
        filesData.forEach(file => {
            const category = getFileTypeCategory(file.mime_type);
            typeCounts[category] = (typeCounts[category] || 0) + 1;
        });

        const fileTypeChartData = Object.entries(typeCounts).map(([name, value]) => ({
            name,
            value,
        }));
        setFileTypeData(fileTypeChartData);

        // Upload trend based on filter
        const trendData = [];
        const days = timeFilter === 'today' ? 1 : timeFilter === '7days' ? 7 : timeFilter === '30days' ? 30 : 7;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = filesData.filter(file =>
                file.uploaded_at.startsWith(dateStr)
            ).length;
            trendData.push({
                date: days === 1 ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                uploads: count,
            });
        }
        setUploadTrendData(trendData);
    };

    const handleFileSelect = (file: FileMetadata) => {
        setSelectedFile(file);
        setFilePreview(file.public_url); // Use public URL for preview
    };

    const handleDownload = (file: FileMetadata) => {
        const a = document.createElement('a');
        a.href = file.public_url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const exportData = () => {
        const csvContent = [
            ['File Name', 'Type', 'Size (bytes)', 'Category', 'Confidence', 'Uploaded At', 'Folder Path'],
            ...filteredFiles.map(file => [
                file.name,
                file.mime_type,
                file.size.toString(),
                file.category,
                (file.confidence * 100).toFixed(1) + '%',
                file.uploaded_at,
                file.folder_path
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `files_export_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Show message when no data is available
    if (allFiles.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your file uploads and analysis activity
                    </p>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No files uploaded yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Start by uploading some files to see your dashboard analytics and insights.
                        </p>
                        <Button onClick={() => router.push('/upload')}>
                            Upload Files
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error boundary check
    if (!Array.isArray(allFiles)) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your file uploads and analysis activity
                    </p>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Invalid data format</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Unable to load dashboard data. Please refresh the page.
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Refresh Page
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your file uploads and analysis activity
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Files"
                    value={stats.totalFiles}
                    icon={FileText}
                    description="Files uploaded"
                />
                <StatsCard
                    title="Storage Used"
                    value={formatFileSize(stats.totalSize)}
                    icon={HardDrive}
                    description="Total file size"
                />
                <StatsCard
                    title="Recent Uploads"
                    value={stats.recentUploads}
                    icon={Upload}
                    description="Last 7 days"
                />
                <StatsCard
                    title="Analyzed Files"
                    value={stats.analyzedFiles}
                    icon={TrendingUp}
                    description={`${stats.totalFiles > 0 ? Math.round((stats.analyzedFiles / stats.totalFiles) * 100) : 0}% completion`}
                />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">Time Period:</span>
                        </div>
                        <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Category:</span>
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {Array.from(new Set(allFiles.map(f => f.category || 'Uncategorized'))).map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Charts */}
            <DashboardCharts files={filteredFiles} />

            {/* File Inspection Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>File Inspection</CardTitle>
                            <CardDescription>
                                Search, sort, and inspect your uploaded files ({filteredFiles.length} files)
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportData}>
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search and Sort Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search files by name or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(value: 'name' | 'size' | 'uploaded_at') => setSortBy(value)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="size">Size</SelectItem>
                                    <SelectItem value="uploaded_at">Date</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </Button>
                        </div>
                    </div>

                    {/* Files Table */}
                    {filteredFiles.length > 0 ? (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>File Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFiles.map((file) => {
                                        const FileIconComponent = getFileIcon(file.mime_type);
                                        return (
                                            <TableRow key={file.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <FileIconComponent className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium truncate max-w-xs">{file.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{file.mime_type}</Badge>
                                                </TableCell>
                                                <TableCell>{formatFileSize(file.size)}</TableCell>
                                                <TableCell>{new Date(file.uploaded_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${getCategoryColor(file.category || 'Uncategorized')} text-white`}>
                                                        {file.category || 'Uncategorized'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleFileSelect(file)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="flex items-center gap-2">
                                                                        <FileIconComponent className="h-5 w-5" />
                                                                        {selectedFile?.name}
                                                                    </DialogTitle>
                                                                    <DialogDescription>
                                                                        File details and preview
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                {selectedFile && (
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                                            <div>
                                                                                <strong>Type:</strong> {selectedFile.mime_type}
                                                                            </div>
                                                                            <div>
                                                                                <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                                                                            </div>
                                                                            <div>
                                                                                <strong>Category:</strong> {selectedFile.category}
                                                                            </div>
                                                                            <div>
                                                                                <strong>Confidence:</strong> {(selectedFile.confidence * 100).toFixed(1)}%
                                                                            </div>
                                                                            <div>
                                                                                <strong>Uploaded:</strong> {new Date(selectedFile.uploaded_at).toLocaleString()}
                                                                            </div>
                                                                            <div>
                                                                                <strong>Folder:</strong> {selectedFile.folder_path}
                                                                            </div>
                                                                        </div>

                                                                        {/* File Preview */}
                                                                        {filePreview && (
                                                                            <div className="border rounded-lg p-4 bg-muted/50">
                                                                                <h4 className="font-medium mb-2">Preview</h4>
                                                                                {selectedFile.mime_type.startsWith('image/') ? (
                                                                                    <img
                                                                                        src={filePreview}
                                                                                        alt={selectedFile.name}
                                                                                        className="max-w-full max-h-64 object-contain rounded"
                                                                                    />
                                                                                ) : (
                                                                                    <p className="text-muted-foreground">Preview not available for this file type</p>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        <div className="flex justify-end gap-2">
                                                                            <Button variant="outline" onClick={() => handleDownload(selectedFile)}>
                                                                                <Download className="h-4 w-4 mr-2" />
                                                                                Download
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </DialogContent>
                                                        </Dialog>
                                                        {file.mime_type === 'application/json' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSchemaViewFile(file);
                                                                    setIsSchemaViewOpen(true);
                                                                }}
                                                                title="View JSON Schema"
                                                            >
                                                                <FileJson className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDownload(file)}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No files found</p>
                            <p>Try adjusting your search or time filter</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Schema View Modal */}
            {schemaViewFile && (
                <SchemaView
                    isOpen={isSchemaViewOpen}
                    onClose={() => {
                        setIsSchemaViewOpen(false);
                        setSchemaViewFile(null);
                    }}
                    fileUrl={schemaViewFile.public_url}
                    fileName={schemaViewFile.name}
                    fileId={schemaViewFile.id.toString()}
                />
            )}
        </div>
    );
}
