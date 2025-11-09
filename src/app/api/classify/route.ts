import { NextResponse } from "next/server";
// Conditionally import pdf-parse to avoid build issues in production
let pdfParse: any = null;
if (process.env.NODE_ENV !== "production") {
    try {
        pdfParse = require('pdf-parse');
    } catch (error) {
    }
}

import ffmpeg from 'fluent-ffmpeg';
export const runtime = "nodejs";

// Enhanced category mapping based on MIME types and file extensions
const categoryMap: Record<string, { category: string; confidence: number }> = {
    // Documents
    'application/pdf': { category: 'Document', confidence: 0.95 },
    'application/msword': { category: 'Document', confidence: 0.95 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'Document', confidence: 0.95 },
    'application/vnd.ms-excel': { category: 'Spreadsheet', confidence: 0.95 },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'Spreadsheet', confidence: 0.95 },
    'application/vnd.ms-powerpoint': { category: 'Presentation', confidence: 0.95 },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'Presentation', confidence: 0.95 },
    'text/plain': { category: 'Text File', confidence: 0.95 },
    'text/csv': { category: 'Spreadsheet', confidence: 0.95 },
    'application/json': { category: 'Data File', confidence: 0.95 },
    'application/xml': { category: 'Data File', confidence: 0.95 },

    // Media
    'audio/mpeg': { category: 'Audio', confidence: 0.95 },
    'audio/wav': { category: 'Audio', confidence: 0.95 },
    'audio/mp4': { category: 'Audio', confidence: 0.95 },
    'audio/ogg': { category: 'Audio', confidence: 0.95 },
    'video/mp4': { category: 'Video', confidence: 0.95 },
    'video/avi': { category: 'Video', confidence: 0.95 },
    'video/mov': { category: 'Video', confidence: 0.95 },
    'video/wmv': { category: 'Video', confidence: 0.95 },
    'video/mkv': { category: 'Video', confidence: 0.95 },

    // Archives
    'application/zip': { category: 'Compressed File', confidence: 0.95 },
    'application/x-rar-compressed': { category: 'Compressed File', confidence: 0.95 },
    'application/x-7z-compressed': { category: 'Compressed File', confidence: 0.95 },
    'application/gzip': { category: 'Compressed File', confidence: 0.95 },

    // Code
    'application/javascript': { category: 'Code File', confidence: 0.95 },
    'application/typescript': { category: 'Code File', confidence: 0.95 },
    'text/html': { category: 'Web File', confidence: 0.95 },
    'text/css': { category: 'Web File', confidence: 0.95 },
    'text/x-python': { category: 'Code File', confidence: 0.95 },
    'text/x-java-source': { category: 'Code File', confidence: 0.95 },
};

// Document category keywords for text analysis
const documentKeywords = {
    'Invoice': ['invoice', 'bill', 'payment', 'amount due', 'total', 'tax', 'receipt'],
    'Report': ['report', 'analysis', 'summary', 'findings', 'conclusion', 'executive summary'],
    'Research Paper': ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'references', 'literature review'],
    'Contract': ['agreement', 'contract', 'terms', 'conditions', 'party', 'signatory', 'legal'],
    'Resume': ['experience', 'education', 'skills', 'resume', 'cv', 'professional background'],
    'Manual': ['guide', 'manual', 'instructions', 'tutorial', 'how to', 'user guide'],
    'Presentation': ['presentation', 'slides', 'agenda', 'objectives', 'key points'],
    'Proposal': ['proposal', 'project', 'scope', 'deliverables', 'timeline', 'budget'],
};

// Extract filename from URL for keyword-based tagging
function extractFilenameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        return pathname.split('/').pop() || '';
    } catch {
        // If URL parsing fails, try to extract from the end
        const parts = url.split('/');
        return parts[parts.length - 1] || '';
    }
}

// Get additional tags based on filename keywords
function getKeywordTags(filename: string): string[] {
    const tags: string[] = [];
    const lowerFilename = filename.toLowerCase();

    // Document keywords
    if (lowerFilename.includes('invoice')) tags.push('invoice');
    if (lowerFilename.includes('resume') || lowerFilename.includes('cv')) tags.push('resume');
    if (lowerFilename.includes('report')) tags.push('report');
    if (lowerFilename.includes('contract')) tags.push('contract');
    if (lowerFilename.includes('proposal')) tags.push('proposal');

    // Media keywords
    if (lowerFilename.includes('music') || lowerFilename.includes('song')) tags.push('music');
    if (lowerFilename.includes('video') || lowerFilename.includes('movie')) tags.push('video');
    if (lowerFilename.includes('audio') || lowerFilename.includes('sound')) tags.push('audio');

    // Code keywords
    if (lowerFilename.includes('script')) tags.push('script');
    if (lowerFilename.includes('config')) tags.push('configuration');
    if (lowerFilename.includes('readme')) tags.push('documentation');

    return tags;
}

// Analyze document text to determine specific document type
function analyzeDocumentText(text: string): { category: string; confidence: number; tags: string[] } {
    let bestMatch = { category: 'Document', confidence: 0.5, tags: [] as string[] };

    for (const [docType, keywords] of Object.entries(documentKeywords)) {
        let matchCount = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                matchCount++;
                matchedKeywords.push(keyword);
            }
        }

        // Calculate confidence based on keyword matches
        const confidence = Math.min(matchCount / keywords.length, 0.95);

        if (confidence > bestMatch.confidence) {
            bestMatch = {
                category: docType,
                confidence,
                tags: matchedKeywords.slice(0, 3) // Limit to top 3 tags
            };
        }
    }

    return bestMatch;
}

export async function POST(req: Request) {
    try {
        const { fileUrl, mimeType } = await req.json();

        if (!fileUrl || !mimeType) {
            return NextResponse.json(
                { error: "Missing fileUrl or mimeType" },
                { status: 400 }
            );
        }

        // Check if file is an image - use Hugging Face for images
        if (mimeType.startsWith("image/")) {
            const key = process.env.HUGGINGFACE_API_KEY;
            if (!key)
                return NextResponse.json(
                    { error: "Missing Hugging Face key" },
                    { status: 500 }
                );

            // Fetch the file from the URL
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
                return NextResponse.json(
                    { error: "Failed to fetch file from URL" },
                    { status: 400 }
                );
            }

            const buffer = Buffer.from(await fileResponse.arrayBuffer());

            const res = await fetch(
                "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/octet-stream",
                    },
                    body: buffer,
                }
            );

            if (!res.ok) {
                const text = await res.text();
                console.error("HF API error:", text);
                return NextResponse.json({ error: text }, { status: res.status });
            }

            const result = await res.json();
            if (!Array.isArray(result) || result.length === 0)
                return NextResponse.json(
                    { error: "Invalid model output" },
                    { status: 500 }
                );

            const { label, score } = result[0];
            return NextResponse.json({
                category: "Image",
                confidence: score || 0,
                tags: [label || "image"],
                message: "AI classification completed"
            });
        }

        // Handle PDFs - extract text and classify using sentiment analysis
        if (mimeType === "application/pdf") {
            if (process.env.NODE_ENV === "production") {
                return NextResponse.json({
                    category: "Document",
                    confidence: 0.9,
                    tags: ["pdf"],
                    message: "PDF classified as document (production mode)"
                });
            }
            try {

                const fileResponse = await fetch(fileUrl);
                if (!fileResponse.ok) {
                    throw new Error("Failed to fetch PDF file");
                }

                const buffer = Buffer.from(await fileResponse.arrayBuffer());

                // Add timeout and error handling for PDF parsing
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                try {
                    const pdfData = await pdfParse(buffer);
                    clearTimeout(timeout);

                    const extractedText = pdfData.text;

                    if (extractedText && extractedText.length > 10) {
                        // Use Hugging Face sentiment analysis for document classification
                        const key = process.env.HUGGINGFACE_API_KEY;
                        if (key) {
                            const sentimentController = new AbortController();
                            const sentimentTimeout = setTimeout(() => sentimentController.abort(), 15000);

                            try {
                                const sentimentRes = await fetch(
                                    "https://router.huggingface.co/hf-inference/models/distilbert-base-uncased-finetuned-sst-2-english",
                                    {
                                        method: "POST",
                                        headers: {
                                            Authorization: `Bearer ${key}`,
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            inputs: extractedText.substring(0, 512), // Limit text length
                                        }),
                                        signal: sentimentController.signal,
                                    }
                                );

                                clearTimeout(sentimentTimeout);

                                if (sentimentRes.ok) {
                                    const sentimentResult = await sentimentRes.json();
                                    if (Array.isArray(sentimentResult) && sentimentResult.length > 0) {
                                        const result = sentimentResult[0];
                                        if (Array.isArray(result)) {
                                            // Find the label with highest score
                                            const bestLabel = result.reduce((best, current) =>
                                                current.score > best.score ? current : best
                                            );
                                            return NextResponse.json({
                                                category: bestLabel.label === "POSITIVE" ? "Positive Document" : "Document",
                                                confidence: bestLabel.score,
                                                tags: ["pdf", "document"],
                                                message: "PDF text analyzed and classified"
                                            });
                                        }
                                    }
                                }
                            } catch (sentimentError: any) {
                                clearTimeout(sentimentTimeout);
                            }
                        }
                    }
                } catch (pdfError: any) {
                    clearTimeout(timeout);
                }

                // Fallback to basic PDF classification
                return NextResponse.json({
                    category: "Document",
                    confidence: 0.9,
                    tags: ["pdf"],
                    message: "PDF classified as document"
                });
            } catch (error) {
                console.error("PDF processing failed:", error);
                return NextResponse.json({
                    category: "Document",
                    confidence: 0.7,
                    tags: ["pdf"],
                    message: "PDF classification fallback"
                });
            }
        }

        // Handle Videos - extract metadata using ffmpeg
        if (mimeType.startsWith("video/")) {
            try {

                // For video classification, we'll use basic MIME type detection
                // since ffmpeg requires file system access which we don't have with URLs
                return NextResponse.json({
                    category: "Video",
                    confidence: 0.95,
                    tags: ["video", mimeType.split('/')[1]],
                    message: "Video classified by MIME type"
                });
            } catch (error) {
                console.error("Video processing failed:", error);
                return NextResponse.json({
                    category: "Video",
                    confidence: 0.8,
                    tags: ["video"],
                    message: "Video classification fallback"
                });
            }
        }

        // Handle JSON files - detect structure and analyze schema
        if (mimeType === "application/json") {
            try {

                const fileResponse = await fetch(fileUrl);
                if (!fileResponse.ok) {
                    throw new Error("Failed to fetch JSON file");
                }

                const jsonText = await fileResponse.text();
                const jsonData = JSON.parse(jsonText);

                // Determine if it's an object or array
                const isArray = Array.isArray(jsonData);
                const category = isArray ? "JSON Array" : "JSON Object";

                // Use schema inference to analyze structure
                try {
                    // Import the schema generator dynamically to avoid circular imports
                    const { processJSONFile } = await import('@/lib/utils/schemaGenerator');
                    const schemaAnalysis = await processJSONFile(jsonText, "temp");

                    if (schemaAnalysis) {
                        return NextResponse.json({
                            category: `JSON (${schemaAnalysis.storageType})`,
                            confidence: 0.95,
                            tags: ["json", isArray ? "array" : "object", schemaAnalysis.storageType.toLowerCase()],
                            schema: schemaAnalysis,
                            message: "JSON structure and schema analyzed"
                        });
                    }
                } catch (schemaError) {
                }

                // Fallback classification
                return NextResponse.json({
                    category: category,
                    confidence: 0.9,
                    tags: ["json", isArray ? "array" : "object"],
                    message: "JSON classified by structure"
                });
            } catch (error) {
                console.error("JSON processing failed:", error);
                return NextResponse.json({
                    category: "JSON",
                    confidence: 0.6,
                    tags: ["json"],
                    message: "JSON classification fallback"
                });
            }
        }

        // For non-image files, use intelligent auto-tagging

        // Get category from MIME type mapping
        const mapping = categoryMap[mimeType] || { category: "Other", confidence: 0.8 };
        let finalCategory = mapping.category;
        let finalConfidence = mapping.confidence;
        let documentTags: string[] = [];

        // Enhanced classification for documents with text analysis
        if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.startsWith('text/')) {
            try {

                // Fetch the file content
                const fileResponse = await fetch(fileUrl);
                if (!fileResponse.ok) {
                    throw new Error("Failed to fetch file for text analysis");
                }

                const buffer = Buffer.from(await fileResponse.arrayBuffer());
                let extractedText = '';

                // Extract text based on file type
                if (mimeType.startsWith('text/')) {
                    extractedText = buffer.toString('utf-8');
                } else {
                    // For binary files like PDFs, use filename-based classification only
                }

                // Analyze extracted text for document type
                if (extractedText) {
                    const textAnalysis = analyzeDocumentText(extractedText.toLowerCase());
                    if (textAnalysis.category !== 'Document') {
                        finalCategory = textAnalysis.category;
                        finalConfidence = Math.max(mapping.confidence, textAnalysis.confidence);
                        documentTags = textAnalysis.tags;
                    }
                }
            } catch (error) {
            }
        }

        // Extract filename and get keyword-based tags
        const filename = extractFilenameFromUrl(fileUrl);
        const keywordTags = getKeywordTags(filename);
        const allTags = [...documentTags, ...keywordTags];


        return NextResponse.json({
            category: finalCategory,
            confidence: finalConfidence,
            tags: allTags,
            message: "Auto-tagged using file type detection"
        });
    } catch (e: any) {
        console.error("Classification route crash:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
