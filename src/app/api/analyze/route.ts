import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const type = file.type.split("/")[0];
    let modelUrl = "";

    if (type === "image")
        modelUrl = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";
    else if (type === "text" || type === "json")
        modelUrl = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";
    else
        return NextResponse.json({ tags: ["unknown"] });

    const response = await fetch(modelUrl, {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        method: "POST",
        body: file,
    });

    try {
        const result = await response.json();
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ tags: ["analysis_failed"] });
    }
}
