import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SchemaField {
    type: string;
    required: boolean;
    description?: string;
    properties?: Record<string, SchemaField>;
    items?: SchemaField;
}

interface AnalysisResult {
    ok: boolean;
    file_id: string;
    storage_type: 'SQL' | 'NoSQL';
    schema_id: string;
    schema: Record<string, SchemaField>;
    reasoning: string;
}

// Determine if JSON structure should use SQL or NoSQL storage
function determineStorageType(data: any): { type: 'SQL' | 'NoSQL'; reasoning: string } {
    // Check if data is an array
    if (Array.isArray(data)) {
        // Arrays of primitives can be SQL, but arrays of objects are NoSQL
        if (data.length === 0) {
            return { type: 'SQL', reasoning: 'Empty array, defaulting to SQL' };
        }

        const firstItem = data[0];
        if (typeof firstItem !== 'object' || firstItem === null) {
            return { type: 'SQL', reasoning: 'Array of primitive values, suitable for SQL' };
        }

        // Check if all items have the same structure (tabular data)
        const hasConsistentStructure = data.every(item =>
            typeof item === 'object' &&
            item !== null &&
            Object.keys(item).length === Object.keys(firstItem).length &&
            Object.keys(item).every(key => key in firstItem)
        );

        if (hasConsistentStructure) {
            return { type: 'SQL', reasoning: 'Array with consistent object structure, suitable for SQL table' };
        }

        return { type: 'NoSQL', reasoning: 'Array with varying object structures, requires NoSQL flexibility' };
    }

    // Check if data is a primitive
    if (typeof data !== 'object' || data === null) {
        return { type: 'SQL', reasoning: 'Primitive value, suitable for SQL' };
    }

    // Check if object has nested structures
    const hasNestedObjects = Object.values(data).some(value =>
        typeof value === 'object' && value !== null && !Array.isArray(value)
    );

    const hasNestedArrays = Object.values(data).some(value => Array.isArray(value));

    if (hasNestedObjects || hasNestedArrays) {
        return { type: 'NoSQL', reasoning: 'Contains nested objects or arrays, requires NoSQL document structure' };
    }

    // Check if all values are primitives (flat structure)
    const allPrimitives = Object.values(data).every(value =>
        typeof value !== 'object' || value === null
    );

    if (allPrimitives) {
        return { type: 'SQL', reasoning: 'Flat object with primitive values, suitable for SQL row' };
    }

    return { type: 'NoSQL', reasoning: 'Complex nested structure, requires NoSQL flexibility' };
}

// Recursively infer schema from JSON data
function inferSchema(data: any, path: string[] = []): SchemaField {
    if (data === null) {
        return { type: 'null', required: true };
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return {
                type: 'array',
                required: true,
                items: { type: 'any', required: true }
            };
        }

        // Analyze first few items to determine item type
        const sampleItems = data.slice(0, 3);
        const itemSchemas = sampleItems.map(item => inferSchema(item, [...path, 'items']));

        // Check if all items have the same type
        const allSameType = itemSchemas.every(schema => schema.type === itemSchemas[0]?.type);

        return {
            type: 'array',
            required: true,
            items: allSameType ? itemSchemas[0] : { type: 'mixed', required: true }
        };
    }

    if (typeof data === 'object') {
        const properties: Record<string, SchemaField> = {};
        const requiredFields = new Set(Object.keys(data));

        for (const [key, value] of Object.entries(data)) {
            properties[key] = inferSchema(value, [...path, key]);
        }

        return {
            type: 'object',
            required: true,
            properties
        };
    }

    // Primitive types
    return {
        type: typeof data,
        required: true
    };
}

export async function POST(req: NextRequest) {
    try {
        const { file_id, content } = await req.json();

        if (!file_id || !content) {
            return NextResponse.json(
                { error: 'Missing file_id or content' },
                { status: 400 }
            );
        }

        // Parse JSON content
        let jsonData: any;
        try {
            jsonData = JSON.parse(content);
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON content' },
                { status: 400 }
            );
        }

        // Determine storage type
        const { type: storageType, reasoning } = determineStorageType(jsonData);

        // Infer schema
        const schema = inferSchema(jsonData);

        // Validate that files_metadata record exists
        const { data: fileRecord, error: fileError } = await supabase
            .from('files_metadata')
            .select('id')
            .eq('id', file_id)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json(
                { error: 'File record not found' },
                { status: 404 }
            );
        }

        // Check if json_schemas already has an entry for this file_id
        const { data: existingSchema, error: existingError } = await supabase
            .from('json_schemas')
            .select('id, schema, storage_type')
            .eq('file_id', file_id)
            .single();

        if (!existingError && existingSchema) {
            // Return existing schema
            const result: AnalysisResult = {
                ok: true,
                file_id,
                storage_type: existingSchema.storage_type,
                schema_id: existingSchema.id,
                schema: existingSchema.schema.properties || {},
                reasoning: 'Schema already exists'
            };
            return NextResponse.json(result);
        }

        // Insert new schema using upsert for idempotency
        const { data: schemaRecord, error: schemaError } = await supabase
            .from('json_schemas')
            .upsert({
                file_id,
                schema,
                storage_type: storageType
            }, {
                onConflict: 'file_id'
            })
            .select('id')
            .single();

        if (schemaError) {
            return NextResponse.json(
                { error: 'Failed to save schema' },
                { status: 500 }
            );
        }

        // Try to update files_metadata table (columns may not exist yet)
        try {
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Only add these columns if they exist in the table
            try {
                await supabase.from('files_metadata').select('storage_type').limit(1);
                updateData.storage_type = storageType;
            } catch {
            }

            if (schemaRecord) {
                try {
                    await supabase.from('files_metadata').select('schema_id').limit(1);
                    updateData.schema_id = schemaRecord.id;
                } catch {
                }
            }

            const { error: updateError } = await supabase
                .from('files_metadata')
                .update(updateData)
                .eq('id', file_id);

            if (updateError) {
            }
        } catch (updateError: any) {
        }

        const result: AnalysisResult = {
            ok: true,
            file_id,
            storage_type: storageType,
            schema_id: schemaRecord?.id || null,
            schema: schema.properties || {},
            reasoning
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
