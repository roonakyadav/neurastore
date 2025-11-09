import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt, candidateLabels } = await req.json();

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            const response = await fetch(
                'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: { candidate_labels: candidateLabels },
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeout);

            if (!response.ok) {
                console.error('HuggingFace API error:', response.status, await response.text());
                // Return fallback response instead of error
                return NextResponse.json({
                    labels: ['General'],
                    fallback: true,
                    reason: `API returned ${response.status}`
                });
            }

            const data = await response.json();

            // Handle different response formats
            let labels: string[] = [];
            if (Array.isArray(data)) {
                labels = data.map((item: any) => item.label || item.labels || 'General').filter(Boolean);
            } else if (data.labels) {
                labels = Array.isArray(data.labels) ? data.labels : [data.labels];
            }

            // Ensure we have at least one label
            if (labels.length === 0) {
                labels = ['General'];
            }

            return NextResponse.json({ labels });

        } catch (fetchError: any) {
            clearTimeout(timeout);
            console.error('HuggingFace API fetch error:', fetchError.message);

            // Return fallback response for any fetch errors (timeout, network, etc.)
            return NextResponse.json({
                labels: ['General'],
                fallback: true,
                reason: fetchError.name === 'AbortError' ? 'Request timeout' : 'Network error'
            });
        }

    } catch (error) {
        console.error('Server error:', error);
        // Return fallback response for server errors
        return NextResponse.json({
            labels: ['General'],
            fallback: true,
            reason: 'Server error'
        });
    }
}
