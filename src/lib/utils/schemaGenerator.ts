import { supabase } from '@/lib/supabaseClient';

export interface JSONSchema {
    id?: string;
    file_id: string;
    schema_json: any;
    storage_type: 'SQL' | 'NoSQL';
}

export interface SchemaAnalysis {
    schema: any;
    storageType: 'SQL' | 'NoSQL';
    tableName?: string;
    columns?: Array<{
        name: string;
        type: string;
        nullable: boolean;
        isPrimaryKey?: boolean;
    }>;
    relationships?: Array<{
        table: string;
        type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    }>;
}

/**
 * Analyze JSON structure and determine optimal storage strategy
 */
export function analyzeJSONSchema(jsonData: any): SchemaAnalysis {
    const schema = generateSchema(jsonData);

    // Determine if data is tabular (SQL) or nested (NoSQL)
    const storageType = determineStorageType(jsonData, schema);

    const analysis: SchemaAnalysis = {
        schema,
        storageType,
    };

    if (storageType === 'SQL') {
        analysis.tableName = inferTableName(jsonData);
        analysis.columns = generateSQLColumns(schema);
    }

    return analysis;
}

/**
 * Generate JSON schema from data
 */
function generateSchema(data: any, maxDepth: number = 3, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) {
        return { type: typeof data };
    }

    if (data === null) {
        return { type: 'null' };
    }

    const type = typeof data;

    switch (type) {
        case 'boolean':
        case 'number':
        case 'string':
            return { type };

        case 'object':
            if (Array.isArray(data)) {
                if (data.length === 0) {
                    return { type: 'array', items: { type: 'unknown' } };
                }

                // Analyze first few items to determine item type
                const itemSchemas = data.slice(0, 5).map(item =>
                    generateSchema(item, maxDepth, currentDepth + 1)
                );

                // Find common schema among items
                const commonSchema = mergeSchemas(itemSchemas);
                return {
                    type: 'array',
                    items: commonSchema,
                    minItems: 0,
                    maxItems: data.length
                };
            } else {
                // Object schema
                const properties: Record<string, any> = {};
                const required: string[] = [];

                for (const [key, value] of Object.entries(data)) {
                    properties[key] = generateSchema(value, maxDepth, currentDepth + 1);
                    required.push(key);
                }

                return {
                    type: 'object',
                    properties,
                    required
                };
            }

        default:
            return { type: 'unknown' };
    }
}

/**
 * Merge multiple schemas into one common schema
 */
function mergeSchemas(schemas: any[]): any {
    if (schemas.length === 0) return { type: 'unknown' };
    if (schemas.length === 1) return schemas[0];

    // For simplicity, return the first schema
    // In a more advanced implementation, we could merge compatible schemas
    return schemas[0];
}

/**
 * Determine if data should be stored in SQL or NoSQL
 */
function determineStorageType(data: any, schema: any): 'SQL' | 'NoSQL' {
    // Check if it's an array of similar objects (tabular data)
    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
            // Check if all items have similar structure
            const hasConsistentStructure = data.every(item =>
                typeof item === 'object' &&
                item !== null &&
                !Array.isArray(item) &&
                Object.keys(item).length > 0
            );

            if (hasConsistentStructure) {
                // Check if structure is not too deeply nested
                const maxDepth = getMaxDepth(firstItem);
                if (maxDepth <= 2) {
                    return 'SQL';
                }
            }
        }
    }

    // Check if it's a single object with reasonable structure
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const maxDepth = getMaxDepth(data);
        if (maxDepth <= 3 && Object.keys(data).length <= 20) {
            return 'SQL';
        }
    }

    // Default to NoSQL for complex structures
    return 'NoSQL';
}

/**
 * Get maximum nesting depth of an object
 */
function getMaxDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth >= 10) return currentDepth; // Prevent infinite recursion

    if (typeof obj !== 'object' || obj === null) {
        return currentDepth;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) return currentDepth + 1;
        return Math.max(...obj.map(item => getMaxDepth(item, currentDepth + 1)));
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
        maxDepth = Math.max(maxDepth, getMaxDepth(value, currentDepth + 1));
    }

    return maxDepth;
}

/**
 * Infer table name from data structure
 */
function inferTableName(data: any): string {
    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
            // Try to find a name-like field
            const nameFields = ['name', 'title', 'id', 'key'];
            for (const field of nameFields) {
                if (firstItem.hasOwnProperty(field) && typeof firstItem[field] === 'string') {
                    return pluralize(firstItem[field].toLowerCase().replace(/[^a-zA-Z]/g, '_'));
                }
            }
        }
    }

    // Default table name
    return 'data_records';
}

/**
 * Generate SQL column definitions from schema
 */
function generateSQLColumns(schema: any): Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey?: boolean;
}> {
    const columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        isPrimaryKey?: boolean;
    }> = [];

    if (schema.type === 'object' && schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties) as [string, any][]) {
            const column = {
                name: key,
                type: mapToSQLType(propSchema),
                nullable: !schema.required?.includes(key),
                isPrimaryKey: key === 'id' || key === '_id'
            };
            columns.push(column);
        }
    }

    return columns;
}

/**
 * Map JSON schema types to SQL types
 */
function mapToSQLType(schema: any): string {
    switch (schema.type) {
        case 'string':
            return 'TEXT';
        case 'number':
            return 'NUMERIC';
        case 'integer':
            return 'INTEGER';
        case 'boolean':
            return 'BOOLEAN';
        case 'array':
            return 'JSONB'; // Store arrays as JSON
        case 'object':
            return 'JSONB'; // Store objects as JSON
        default:
            return 'TEXT';
    }
}

/**
 * Simple pluralization
 */
function pluralize(word: string): string {
    if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
        return word + 'es';
    } else {
        return word + 's';
    }
}

/**
 * Save JSON schema to database
 */
export async function saveJSONSchema(schemaData: JSONSchema): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('json_schemas')
            .insert([schemaData])
            .select('id')
            .single();

        if (error) {
            console.error('Schema insert error:', error.message);
            return null;
        }

        return data.id;
    } catch (error) {
        console.error('Save schema failed:', error);
        return null;
    }
}

/**
 * Analyze JSON content and generate schema
 */
export async function processJSONFile(jsonContent: string, fileId: string): Promise<SchemaAnalysis | null> {
    try {
        const jsonData = JSON.parse(jsonContent);
        return analyzeJSONSchema(jsonData);
    } catch (error) {
        console.error('JSON parsing failed:', error);
        return null;
    }
}
