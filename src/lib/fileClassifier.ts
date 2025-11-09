export function detectFileCategory(name: string, mime: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'Image';
    if (mime.startsWith('video/') || ['mp4', 'mkv', 'mov', 'avi'].includes(ext)) return 'Video';
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'Audio';
    if (['pdf'].includes(ext)) return 'Document';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive';
    if (['txt', 'md', 'csv', 'log'].includes(ext)) return 'Text';
    if (['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'sql'].includes(ext)) {
        if (ext === 'json') return 'JSON';
        if (ext === 'sql') return 'SQL';
        return 'Code';
    }
    return 'General';
}

export function classifyJSON(content: string): string {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.every(obj => typeof obj === 'object')) {
            const keys = Object.keys(parsed[0] || {});
            if (keys.includes('collection') || keys.includes('document')) return 'NoSQL JSON';
            if (keys.includes('table') || keys.includes('rows')) return 'SQL JSON';
        }
        if (parsed?.tables || parsed?.schema) return 'SQL JSON';
        return 'NoSQL JSON';
    } catch {
        return 'Corrupted JSON';
    }
}
