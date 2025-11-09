import { NextResponse } from "next/server";
import { detectMimeType, getFolderPath, generateFilePath, uploadToSupabase, saveFileMetadata } from "@/lib/utils/fileHandler";
import { processJSONFile, saveJSONSchema } from "@/lib/utils/schemaGenerator";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        console.log(`Processing upload: ${file.name} (${file.size} bytes)`);

        // Step 1: Detect MIME type
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = await detectMimeType(buffer, file.name);
        console.log(`Detected MIME type: ${mimeType}`);

        // Step 2: Determine folder path
        const folderPath = getFolderPath(mimeType);
        console.log(`Assigned folder: ${folderPath}`);

        // Step 3: Generate unique file path
        const filePath = generateFilePath(file.name, folderPath);

        // Step 4: Upload to Supabase Storage
        console.log(`Uploading to Supabase: ${filePath}`);
        const uploadResult = await uploadToSupabase(buffer, filePath, mimeType);

        if (!uploadResult) {
            return NextResponse.json(
                { error: "Failed to upload file to storage" },
                { status: 500 }
            );
        }

        const { publicUrl } = uploadResult;
        console.log(`File uploaded successfully: ${publicUrl}`);

        // Step 5: Classify the file
        console.log(`Starting classification for: ${mimeType}`);

        let category = "Unclassified";
        let confidence = 0;

        if (mimeType === "application/json") {
            // Special handling for JSON files
            try {
                const jsonContent = buffer.toString('utf-8');
                const schemaAnalysis = await processJSONFile(jsonContent, "temp");

                if (schemaAnalysis) {
                    category = `JSON (${schemaAnalysis.storageType})`;
                    confidence = 0.95;
                    console.log(`JSON schema analyzed: ${schemaAnalysis.storageType} storage recommended`);
                }
            } catch (error) {
                console.error("JSON processing failed:", error);
                category = "JSON (Parse Error)";
                confidence = 0.5;
            }
        } else {
            // Use classification API for other file types
            try {
                const classifyResponse = await fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/classify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileUrl: publicUrl,
                        mimeType: mimeType
                    }),
                });

                if (classifyResponse.ok) {
                    const classifyData = await classifyResponse.json();
                    category = classifyData.category || "Unclassified";
                    confidence = classifyData.confidence || 0;
                } else {
                    console.warn("Classification failed, using fallback category");
                }
            } catch (error) {
                console.error("Classification request failed:", error);
            }
        }

        // Step 6: Save metadata to database
        console.log(`Saving metadata: category=${category}, confidence=${confidence}`);

        const metadata = {
            name: file.name,
            mime_type: mimeType,
            size: file.size,
            folder_path: folderPath,
            public_url: publicUrl,
            category,
            confidence,
        };

        const metadataSaved = await saveFileMetadata(metadata);

        if (!metadataSaved) {
            return NextResponse.json(
                { error: "Failed to save file metadata" },
                { status: 500 }
            );
        }

        console.log(`✅ Upload completed successfully: ${file.name}`);

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
        return NextResponse.json(
            { error: `Upload failed: ${error.message}` },
            { status: 500 }
        );
    }
}
