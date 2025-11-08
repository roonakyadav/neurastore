import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

        const key = process.env.NEXT_PUBLIC_HF_API_KEY;
        if (!key) return NextResponse.json({ error: "Missing HF key" }, { status: 500 });

        const res = await fetch(
            "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32",
            { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: file }
        );

        if (!res.ok) {
            console.error("HF API error", await res.text());
            return NextResponse.json({ error: "HF API failed" }, { status: res.status });
        }

        const result = await res.json();
        const label = Array.isArray(result) ? result[0].label || "Uncategorized" : "Uncategorized";
        const score = Array.isArray(result) ? result[0].score || 0 : 0;

        return NextResponse.json({ category: label, confidence: score });
    } catch (e) {
        console.error("Classification route error:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
