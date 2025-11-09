"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabaseClient";

export default function FileUpload({ onUpload }: { onUpload: (files: any[]) => void }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        setError("");
        const uploadedData: any[] = [];

        for (const file of acceptedFiles) {
            try {
                const { data, error } = await supabase.storage
                    .from("uploads")
                    .upload(`public/${file.name}`, file, { upsert: true });

                if (error) console.error("Upload Error:", error.message);
                if (error) throw error;

                // Analyze file using /api/analyze
                const formData = new FormData();
                formData.append("file", file);
                const aiRes = await fetch("/api/analyze", { method: "POST", body: formData });
                const aiData = await aiRes.json();

                uploadedData.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    tags: aiData.tags || aiData || [],
                });
            } catch (err: any) {
                setError(err.message);
            }
        }

        setUploading(false);
        onUpload(uploadedData);
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className="border-2 border-dashed p-10 text-center rounded-xl cursor-pointer hover:bg-gray-50">
            <input {...getInputProps()} />
            {isDragActive ? (
                <p className="animate-pulse text-lg text-blue-600">Drop files to upload</p>
            ) : (
                <p className="text-gray-600">Drag & drop files or click to browse</p>
            )}
            {uploading && <p className="mt-4 text-sm text-blue-600 animate-pulse">Uploading...</p>}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
    );
}
