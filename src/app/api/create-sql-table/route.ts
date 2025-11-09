import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface CreateTableResult {
    ok: boolean;
    file_id: string;
    table_name?: string;
    inserted_rows?: number;
    reason?: string;
}

// Map JSON schema types to SQL types
function mapTypeToSQL(type: string): string {
    switch (type) {
        case 'string':
            return 'TEXT';
        case 'number':
            return 'NUMERIC';
        case 'boolean':
            return 'BOOLEAN';
        case 'object':
            return 'JSONB'; // Store nested objects as JSONB
        case 'array':
            return 'JSONB'; // Store arrays as JSONB
        case 'null':
            return 'TEXT'; // Allow null values
        default:
            return 'TEXT';
    }
}

// Generate CREATE TABLE SQL from schema
function generateCreateTableSQL(tableName: string, schema: any): string {
    const columns: string[] = [];

    // Add an auto-incrementing ID column
    columns.push('id SERIAL PRIMARY KEY');

    // Add columns based on schema properties
    if (schema.properties) {
        for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
            const schemaField = fieldSchema as any;
            const sqlType = mapTypeToSQL(schemaField.type);
            const nullable = schemaField.required ? 'NOT NULL' : '';
            columns.push(`${fieldName} ${sqlType} ${nullable}`.trim());
        }
    }

    // Add timestamps
    columns.push('created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    columns.push('updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columns.join(',\n            ')}
        );
    `;

    return createTableSQL;
}

// Generate INSERT SQL from data and schema
function generateInsertSQL(tableName: string, data: any, schema: any): { sql: string; values: any[] } {
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    // Skip the id column (auto-generated)
    let paramIndex = 1;

    if (schema.properties) {
        for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
            if (data.hasOwnProperty(fieldName)) {
                columns.push(fieldName);
                placeholders.push(`$${paramIndex}`);
                values.push(data[fieldName]);
                paramIndex++;
            }
        }
    }

    // Add timestamps
    columns.push('created_at', 'updated_at');
    placeholders.push(`$${paramIndex}`, `$${paramIndex + 1}`);
    values.push(new Date().toISOString(), new Date().toISOString());

    const insertSQL = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id;
    `;

    return { sql: insertSQL, values };
}

export async function POST(req: NextRequest) {
    try {
        const { file_id } = await req.json();

        if (!file_id) {
            return NextResponse.json(
                { error: 'Missing file_id' },
                { status: 400 }
            );
        }

        // Fetch schema and storage type from json_schemas table
        const { data: schemaRecord, error: schemaError } = await supabase
            .from('json_schemas')
            .select('schema, storage_type')
            .eq('file_id', file_id)
            .single();

        if (schemaError) {
            return NextResponse.json({
                ok: false,
                file_id,
                reason: 'Schema not found for this file'
            } as CreateTableResult);
        }

        // Check if it's SQL type
        if (schemaRecord.storage_type !== 'SQL') {
            return NextResponse.json({
                ok: false,
                file_id,
                reason: 'File is not classified as SQL type'
            } as CreateTableResult);
        }

        // Generate table name
        const tableName = `data_${file_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}`;

        // Generate CREATE TABLE SQL
        const createTableSQL = generateCreateTableSQL(tableName, schemaRecord.schema);


        // Execute CREATE TABLE using Supabase's SQL API
        // Note: This requires the sql function to be available in Supabase
        try {
            const { error: createError } = await supabase.rpc('exec_sql', {
                sql: createTableSQL
            });

            if (createError) {

                // Try alternative approach using direct table creation
                // This is a fallback for when rpc is not available
                try {
                    // Check if table exists by trying to select from it
                    const { error: checkError } = await supabase
                        .from(tableName)
                        .select('id')
                        .limit(1);

                    if (checkError && !checkError.message.includes('relation') && !checkError.message.includes('does not exist')) {
                        throw createError; // Re-throw if it's a different error
                    }
                } catch (checkError) {
                }
            }
        } catch (createError: any) {
            // Continue anyway - table might already exist
        }

        // Fetch the original JSON data from Supabase storage
        const { data: fileRecord, error: fileError } = await supabase
            .from('files_metadata')
            .select('public_url')
            .eq('id', file_id)
            .single();

        if (fileError) {
            console.error('File record not found:', fileError);
            return NextResponse.json({
                ok: false,
                file_id,
                reason: 'File record not found'
            } as CreateTableResult);
        }

        // Download and parse the JSON data
        let jsonData: any;
        try {
            if (fileRecord.public_url.includes('supabase')) {
                const urlParts = fileRecord.public_url.split('/storage/v1/object/public/');
                if (urlParts.length > 1) {
                    const path = urlParts[1].split('/').slice(1).join('/');
                    const { data: fileData, error: downloadError } = await supabase.storage
                        .from('media')
                        .download(path);

                    if (downloadError) throw downloadError;

                    const text = await fileData.text();
                    jsonData = JSON.parse(text);
                }
            } else {
                const response = await fetch(fileRecord.public_url);
                if (!response.ok) throw new Error('Failed to fetch file');
                const text = await response.text();
                jsonData = JSON.parse(text);
            }
        } catch (parseError) {
            console.error('Failed to parse JSON data:', parseError);
            return NextResponse.json({
                ok: false,
                file_id,
                reason: 'Failed to parse JSON data'
            } as CreateTableResult);
        }

        // Generate INSERT SQL
        const { sql: insertSQL, values } = generateInsertSQL(tableName, jsonData, schemaRecord.schema);


        // Execute INSERT using Supabase client
        // Since we can't use raw SQL easily, we'll try to insert using the client
        try {
            const insertData: any = {};

            // Map JSON data to table columns
            if (schemaRecord.schema.properties) {
                for (const [fieldName, fieldSchema] of Object.entries(schemaRecord.schema.properties)) {
                    if (jsonData.hasOwnProperty(fieldName)) {
                        insertData[fieldName] = jsonData[fieldName];
                    }
                }
            }

            // Add timestamps
            insertData.created_at = new Date().toISOString();
            insertData.updated_at = new Date().toISOString();

            const { data: insertResult, error: insertError } = await supabase
                .from(tableName)
                .insert(insertData)
                .select('id')
                .single();

            if (insertError) {
                console.error('Data insertion failed:', insertError);
                return NextResponse.json({
                    ok: false,
                    file_id,
                    table_name: tableName,
                    reason: `Data insertion failed: ${insertError.message}`
                } as CreateTableResult);
            }


        } catch (insertError: any) {
            console.error('Data insertion failed:', insertError.message);
            return NextResponse.json({
                ok: false,
                file_id,
                table_name: tableName,
                reason: `Data insertion failed: ${insertError.message}`
            } as CreateTableResult);
        }

        // Update files_metadata with table info
        try {
            const { error: updateError } = await supabase
                .from('files_metadata')
                .update({
                    table_name: tableName,
                    record_count: 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', file_id);

            if (updateError) {
            }
        } catch (updateError: any) {
        }

        const result: CreateTableResult = {
            ok: true,
            file_id,
            table_name: tableName,
            inserted_rows: 1
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Create table error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
