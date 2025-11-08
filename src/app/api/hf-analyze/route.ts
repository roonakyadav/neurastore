import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt, candidateLabels } = await req.json();

        const response = await fetch(
            'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_HF_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: { candidate_labels: candidateLabels },
                }),
            }
        );

        if (!response.ok) {
            console.error('HuggingFace API error:', response.status, await response.text());
            return NextResponse.json({ error: 'API request failed' }, { status: response.status });
        }

        const data = await response.json();
        // Assuming data is an array of {label, score}, return labels array
        const labels = data.map((item: any) => item.label);
        return NextResponse.json({ labels });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
