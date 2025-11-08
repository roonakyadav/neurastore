import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const type = file.type.split('/')[0];
        if (type !== 'image') {
            return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 });
        }

        const response = await fetch(
            'https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_API_KEY}`,
                },
                body: file,
            }
        );

        if (!response.ok) {
            console.error('HuggingFace API error:', response.status, await response.text());
            return NextResponse.json({ error: 'Classification failed' }, { status: response.status });
        }

        const result = await response.json();

        // Assuming result is an array of {label, score}, pick the top one
        if (Array.isArray(result) && result.length > 0) {
            const top = result[0];
            return NextResponse.json({
                category: top.label,
                confidence: top.score,
            });
        } else {
            return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
        }
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
