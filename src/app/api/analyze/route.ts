import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileId = formData.get("fileId") as string;
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

        // Save tags as array in ai_tags JSONB field
        if (fileId && result.tags) {
            await supabase.from("files_metadata")
                .update({ ai_tags: result.tags })
                .eq("id", fileId);
        }

        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ tags: ["analysis_failed"] });
    }
}
