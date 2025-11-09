"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import SchemaGraph from './SchemaGraph';

interface SchemaViewProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
    fileId?: string;
}

export default function SchemaView({
    isOpen,
    onClose,
    fileUrl,
    fileName,
    fileId
}: SchemaViewProps) {
    const [jsonData, setJsonData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && fileUrl) {
            fetchJSONData();
        }
    }, [isOpen, fileUrl]);

    const fetchJSONData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Try to fetch from Supabase storage
            if (fileUrl.includes('supabase')) {
                const urlParts = fileUrl.split('/storage/v1/object/public/');
                if (urlParts.length > 1) {
                    const path = urlParts[1].split('/').slice(1).join('/');
                    const { data, error } = await supabase.storage
                        .from('media')
                        .download(path);

                    if (error) throw error;

                    const text = await data.text();
                    const parsed = JSON.parse(text);
                    setJsonData(parsed);
                }
            } else {
                // Fallback to direct fetch
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error('Failed to fetch file');

                const text = await response.text();
                const parsed = JSON.parse(text);
                setJsonData(parsed);
            }
        } catch (err: any) {
            console.error('Error loading JSON:', err);
            setError(err.message || 'Failed to load JSON data');
        } finally {
            setLoading(false);
        }
    };

    const downloadSchema = () => {
        if (!jsonData) return;

        const dataStr = JSON.stringify(jsonData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName.replace('.json', '')}_schema.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-[80vw] min-h-[80vh] w-full h-full max-w-none max-h-none overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl">
                            Schema Graph - {fileName}
                        </DialogTitle>
                        <Button variant="outline" size="sm" onClick={downloadSchema} disabled={!jsonData}>
                            <Download className="h-4 w-4 mr-2" />
                            Download JSON
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 h-full min-h-[70vh]">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">Loading JSON schema...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <p className="text-destructive mb-2">Failed to load JSON schema</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && jsonData && (
                        <SchemaGraph data={jsonData} />
                    )}

                    {!loading && !error && !jsonData && (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <p className="text-muted-foreground mb-2">No JSON data available</p>
                                <p className="text-sm text-muted-foreground">
                                    Schema visualization requires valid JSON content
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
