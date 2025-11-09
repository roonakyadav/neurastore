import { NextResponse } from "next/server";
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
            const key = process.env.NEXT_PUBLIC_HF_API_KEY;
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
                category: label || "Uncategorized",
                confidence: score || 0,
                tags: [],
                message: "AI classification completed"
            });
        }

        // For non-image files, use intelligent auto-tagging
        console.log("Auto-tagging non-image file using MIME type detection");

        // Get category from MIME type mapping
        const mapping = categoryMap[mimeType] || { category: "Other", confidence: 0.8 };
        let finalCategory = mapping.category;
        let finalConfidence = mapping.confidence;
        let documentTags: string[] = [];

        // Enhanced classification for documents with text analysis
        if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.startsWith('text/')) {
            try {
                console.log("Attempting text extraction for document classification");

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
                    console.log(`Text file content loaded: ${extractedText.length} characters`);
                } else {
                    // For binary files like PDFs, use filename-based classification only
                    console.log("Using filename-based classification for binary document");
                }

                // Analyze extracted text for document type
                if (extractedText) {
                    const textAnalysis = analyzeDocumentText(extractedText.toLowerCase());
                    if (textAnalysis.category !== 'Document') {
                        finalCategory = textAnalysis.category;
                        finalConfidence = Math.max(mapping.confidence, textAnalysis.confidence);
                        documentTags = textAnalysis.tags;
                        console.log(`Document classified as: ${finalCategory} (confidence: ${finalConfidence})`);
                    }
                }
            } catch (error) {
                console.warn("Text extraction failed, using basic MIME type classification:", error);
            }
        }

        // Extract filename and get keyword-based tags
        const filename = extractFilenameFromUrl(fileUrl);
        const keywordTags = getKeywordTags(filename);
        const allTags = [...documentTags, ...keywordTags];

        console.log(`Auto-tagged non-image file: ${finalCategory} (confidence ${finalConfidence})`);

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
