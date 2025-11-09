import { fileTypeFromBuffer } from 'file-type';
import { supabase } from '@/lib/supabaseClient';

export interface FileMetadata {
    name: string;
    mime_type: string;
    size: number;
    folder_path: string;
    public_url: string;
    category?: string;
    confidence?: number;
}

export interface UploadResult {
    success: boolean;
    message: string;
    metadata?: FileMetadata;
    error?: string;
}

/**
 * Detect MIME type from file buffer
 */
export async function detectMimeType(buffer: Buffer, filename: string): Promise<string> {
    try {
        const result = await fileTypeFromBuffer(buffer);
        return result?.mime || getMimeTypeFromExtension(filename);
    } catch (error) {
        console.warn('File type detection failed, falling back to extension:', error);
        return getMimeTypeFromExtension(filename);
    }
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'py': 'text/x-python',
        'java': 'text/x-java-source',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'ogg': 'audio/ogg',
        'mp4': 'video/mp4',
        'avi': 'video/avi',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'mkv': 'video/x-matroska',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'gz': 'application/gzip',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Determine folder path based on MIME type
 */
export function getFolderPath(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
        return 'media/images/';
    } else if (mimeType.startsWith('video/')) {
        return 'media/videos/';
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.startsWith('text/')) {
        return 'media/documents/';
    } else if (mimeType === 'application/json') {
        return 'media/json/';
    } else {
        return 'media/others/';
    }
}

/**
 * Normalize filename and generate unique path
 */
export function generateFilePath(originalName: string, folderPath: string): string {
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folderPath}${timestamp}_${sanitizedName}`;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToSupabase(
    fileBuffer: Buffer,
    filePath: string,
    mimeType: string
): Promise<{ publicUrl: string } | null> {
    try {
        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: true,
            });

        if (error) {
            console.error('Supabase upload error:', error.message);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return { publicUrl: urlData.publicUrl };
    } catch (error) {
        console.error('Upload to Supabase failed:', error);
        return null;
    }
}

/**
 * Save metadata to files_metadata table
 */
export async function saveFileMetadata(metadata: FileMetadata): Promise<boolean> {
    try {
        const { error } = await supabase.from('files_metadata').insert([
            {
                name: metadata.name,
                mime_type: metadata.mime_type,
                size: metadata.size,
                uploaded_at: new Date().toISOString(),
                folder_path: metadata.folder_path,
                public_url: metadata.public_url,
                category: metadata.category || 'Unclassified',
                confidence: metadata.confidence || 0,
            },
        ]);

        if (error) {
            console.error('Metadata insert error:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Save metadata failed:', error);
        return false;
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
