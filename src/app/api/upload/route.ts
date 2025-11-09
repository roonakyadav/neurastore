import { NextResponse } from "next/server";
import { detectMimeType, getFolderPath, generateFilePath, uploadToSupabase, saveFileMetadata } from "@/lib/utils/fileHandler";
import { processJSONFile, saveJSONSchema } from "@/lib/utils/schemaGenerator";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
    let file: File | null = null;
    let buffer: Buffer | null = null;

    try {
        // Parse form data
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (error) {
            console.error("Form data parsing failed:", error);
            return NextResponse.json(
                { error: "Invalid form data", code: "INVALID_FORM_DATA" },
                { status: 400 }
            );
        }

        file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded", code: "NO_FILE" },
                { status: 400 }
            );
        }

        // Validate file size (50MB limit)
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 50MB", code: "FILE_TOO_LARGE" },
                { status: 413 }
            );
        }



        // Step 1: Read file buffer
        try {
            buffer = Buffer.from(await file.arrayBuffer());
        } catch (error) {
            console.error("File buffer reading failed:", error);
            return NextResponse.json(
                { error: "Failed to read file data", code: "FILE_READ_ERROR" },
                { status: 400 }
            );
        }

        // Step 1.5: Calculate file checksum for deduplication
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

        // Check for duplicate files
        const { data: existingFile, error: dupError } = await supabase
            .from('files_metadata')
            .select('id, name, public_url, category, confidence, storage_type, schema_id, table_name, folder_path, mime_type, size')
            .eq('name', file.name)
            .eq('size', file.size)
            .single();

        if (!dupError && existingFile) {
            return NextResponse.json({
                success: true,
                message: "File already exists",
                category: existingFile.category,
                confidence: existingFile.confidence,
                publicUrl: existingFile.public_url,
                folderPath: existingFile.folder_path,
                mimeType: existingFile.mime_type,
                size: existingFile.size,
                duplicate: true,
                file_id: existingFile.id
            });
        }

        // Step 2: Detect MIME type
        let mimeType: string;
        try {
            mimeType = await detectMimeType(buffer, file.name);
        } catch (error) {
            console.error("MIME type detection failed:", error);
            return NextResponse.json(
                { error: "Failed to detect file type", code: "MIME_DETECTION_FAILED" },
                { status: 400 }
            );
        }

        // Step 3: Determine folder path
        const folderPath = getFolderPath(mimeType);

        // Step 4: Generate unique file path
        const filePath = generateFilePath(file.name, folderPath);

        // Step 5: Upload to Supabase Storage
        let uploadResult;
        try {
            uploadResult = await uploadToSupabase(buffer, filePath, mimeType);
            if (!uploadResult) {
                throw new Error("Upload returned null result");
            }
        } catch (error) {
            console.error("Supabase storage upload failed:", error);
            return NextResponse.json(
                { error: "Failed to upload file to storage. Please check your connection and try again.", code: "STORAGE_UPLOAD_FAILED" },
                { status: 500 }
            );
        }

        const { publicUrl } = uploadResult;

        // Step 6: Classify the file with robust category detection
        function detectFileCategory(mime: string, name: string): string {
            if (mime.startsWith("image/")) return "Image";
            if (mime.startsWith("video/")) return "Video";
            if (mime.startsWith("audio/")) return "Audio";
            if (mime === "application/pdf") return "PDF";
            if (mime === "text/plain") return "Text";
            if (mime.includes("json") || name.endsWith(".json")) return "JSON";
            if (mime.includes("zip")) return "Archive";
            return "Other";
        }

        let category = detectFileCategory(mimeType, file.name);
        let confidence = 1;

        // If JSON file: parse safely
        if (category === "JSON") {
            try {
                const content = buffer.toString('utf-8');
                const parsed = JSON.parse(content);
                const jsonType = parsed.sql ? "SQL JSON" :
                    parsed.collections || parsed.documents ? "NoSQL JSON" :
                        "Generic JSON";
                category = jsonType;
            } catch {
                category = "Malformed JSON";
            }
        }

        // Step 7: Normalize data before database insertion
        const cleanData = {
            name: file.name || 'Untitled',
            size: file.size || 0,
            mime_type: mimeType || 'application/octet-stream',
            category: category,
            confidence: confidence,
            ai_tags: [],
            uploaded_at: new Date().toISOString(),
            public_url: publicUrl,
            folder_path: folderPath,
        };

        console.log('Inserting cleaned record:', cleanData);

        // Step 8: Save metadata to database
        let metadataSaved;
        try {
            const { error } = await supabase.from('files_metadata').insert([cleanData]);

            if (error) {
                console.error('Database metadata save failed:', error);
                throw new Error(`Database insert failed: ${error.message}`);
            }

            console.log('Metadata saved successfully');
            metadataSaved = true;
        } catch (error) {
            console.error("Database metadata save failed:", error);
            return NextResponse.json(
                {
                    error: "Failed to save file information. The file was uploaded but metadata could not be saved.",
                    code: "METADATA_SAVE_FAILED",
                    publicUrl // Include public URL so user can still access the file
                },
                { status: 500 }
            );
        }


        return NextResponse.json({
            success: true,
            message: "File uploaded and categorized successfully",
            category,
            confidence,
            publicUrl,
            folderPath,
            mimeType,
            size: file.size,
        });

    } catch (error: any) {
        console.error("Upload processing failed:", error);

        // Determine error type and provide appropriate response
        let statusCode = 500;
        let errorCode = "UNKNOWN_ERROR";
        let errorMessage = "An unexpected error occurred during upload";

        if (error.message?.includes("network") || error.message?.includes("fetch")) {
            statusCode = 503;
            errorCode = "NETWORK_ERROR";
            errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message?.includes("timeout")) {
            statusCode = 408;
            errorCode = "TIMEOUT_ERROR";
            errorMessage = "Upload timed out. Please try again.";
        } else if (error.message?.includes("quota") || error.message?.includes("limit")) {
            statusCode = 413;
            errorCode = "QUOTA_EXCEEDED";
            errorMessage = "Storage quota exceeded. Please contact support.";
        }

        return NextResponse.json(
            {
                error: errorMessage,
                code: errorCode,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: statusCode }
        );
    }
}
