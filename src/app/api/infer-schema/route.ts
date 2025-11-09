import { NextRequest, NextResponse } from 'next/server';
import { analyzeBatchSchema, saveBatchSchemaAnalysis } from '@/lib/utils/schemaGenerator';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
    try {
        const { jsonObjects, fileId } = await request.json();

        if (!Array.isArray(jsonObjects)) {
            return NextResponse.json(
                { error: 'jsonObjects must be an array' },
                { status: 400 }
            );
        }

        if (!fileId || typeof fileId !== 'string') {
            return NextResponse.json(
                { error: 'fileId is required and must be a string' },
                { status: 400 }
            );
        }

        // Analyze the batch schema
        const batchAnalysis = analyzeBatchSchema(jsonObjects);

        // Save to database if fileId is provided
        let savedSchemaId = null;
        if (fileId) {
            // Check if file exists
            const { data: fileData, error: fileError } = await supabase
                .from('files_metadata')
                .select('id')
                .eq('id', fileId)
                .single();

            if (fileError || !fileData) {
                return NextResponse.json(
                    { error: 'File not found' },
                    { status: 404 }
                );
            }

            // Save the schema analysis
            savedSchemaId = await saveBatchSchemaAnalysis(fileId, batchAnalysis);
        }

        return NextResponse.json({
            success: true,
            analysis: batchAnalysis,
            savedSchemaId,
            message: 'Schema analysis completed successfully'
        });

    } catch (error: any) {
        console.error('Schema inference error:', error);
        return NextResponse.json(
            { error: `Schema inference failed: ${error.message}` },
            { status: 500 }
        );
    }
}
