import * as fsOld from 'node:fs';
import * as fs from 'node:fs/promises';
import { MetricType, Table, VectorIndexParams, connect } from 'vectordb';
import similarity from 'compute-cosine-similarity';

import { BaseDb  } from '@llm-tools/embedjs';
import { ExtractChunkData, InsertChunkData } from './types.js';
import { BaseDbExt } from './base-db-ext.js';


export class LanceDbCustom implements BaseDbExt {
    private static readonly STATIC_DB_NAME = 'vectors';
    private readonly isTemp: boolean = true;
    private readonly path: string;
    private table: Table<number[]>;
    private dimensions: number;

    constructor({ path, isTemp, dimensions }: { path: string; isTemp?: boolean, dimensions: number }) {
        this.isTemp = isTemp !== undefined ? isTemp : false;
        this.path = path;
        this.dimensions = dimensions;
    }
    async indexinVectors(): Promise<void> {
        await this.createIndex(this.table);
        
    }

    async init({ dimensions }: { dimensions: number }) {
        // this.dimensions = dimensions;
        if (!this.isTemp && !fsOld.existsSync(this.path)) {
            await fs.mkdir(this.path);
        }

        const dir = await (this.isTemp ? fs.mkdtemp(this.path) : this.path);
        const client = await connect(dir);

        const list = await client.tableNames();
        if (list.indexOf(LanceDbCustom.STATIC_DB_NAME) > -1) {
            this.table = await client.openTable(LanceDbCustom.STATIC_DB_NAME);
        } else {
            this.table = await client.createTable(LanceDbCustom.STATIC_DB_NAME, [
                {
                    id: 'string',
                    pageContent: 'string',
                    vector: new Array(this.dimensions),
                    uniqueLoaderId: 'string',
                    vectorString: 'string',
                    metadata: 'string',
                },
            ]);
            const r = await this.table.countRows();
            console.log(r);
            // this.createIndex(this.table);
        }
    }

    private async createIndex(table: Table<number[]>): Promise<void> {
        console.log(table);
        console.log(await table.countRows());
        await this.table.delete('id = "string"');
        const rows = await table.countRows();
        // Crear el índice IVF-PQ
        const indexParams: VectorIndexParams = {
            column: 'vector',
            // index_name: 'ivf_pq_index',
            metric_type: MetricType.L2,
            num_partitions: Math.sqrt(rows),  // Ajustar según el tamaño de tus datos
            num_sub_vectors: 96,  // Ajustar según la dimensionalidad y precisión deseada
            max_iters: 50,
            use_opq: true,
            num_bits: 8,
            max_opq_iters: 50,
            replace: true,
            index_cache_size: 1024,
            type: 'ivf_pq',
        };
        const schema = (await table.schema).fields;
        console.log(schema);

        return await table.createIndex(indexParams);        
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const mapped = chunks.map((chunk) => {
            const uniqueLoaderId = chunk.metadata.uniqueLoaderId;
            delete chunk.metadata.uniqueLoaderId;

            return {
                id: chunk.metadata.id,
                pageContent: chunk.pageContent,
                vector: chunk.vector,
                uniqueLoaderId,
                metadata: JSON.stringify(chunk.metadata),
                vectorString: JSON.stringify(chunk.vector),
            };
        });

        await this.table.add(mapped);
        return mapped.length;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const schema = await this.table.schema;
        let results = await this.table.search(query).metricType(MetricType.Cosine)
        .limit(7).execute();

        const fullResults = await this.table.search(undefined).where('id NOT LIKE "%YoutubeLoader_%"').limit(1000).execute();
        results = results.concat(fullResults);

        return results
            .filter((entry) => entry.id !== 'md5')
            .map((result) => {
                const metadata = JSON.parse(<string>result.metadata);
                const vector = JSON.parse(<string>result.vectorString);
                metadata.uniqueLoaderId = result.uniqueLoaderId;

                return {
                    score: similarity(query, vector),
                    pageContent: <string>result.pageContent,
                    metadata,
                };
            });
    }

    async getVectorCount(): Promise<number> {
        return this.table.countRows();
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        await this.table.delete(`\`uniqueLoaderId\` = "${uniqueLoaderId}"`);
        return true;
    }

    async reset(): Promise<void> {
        await this.table.delete('id IS NOT NULL');
    }
}
