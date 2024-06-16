import path from 'path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AdaEmbeddings, Ollama, RAGApplication, RAGApplicationBuilder, WebLoader, YoutubeLoader } from '@llm-tools/embedjs';
import { LanceDb } from '@llm-tools/embedjs/vectorDb/lance';
import { OllamaEmbedding } from './OllamaEmbedding.js';
import { LanceDbCustom } from '../persistence/lance-db-custom.js';

@Injectable()
export class EmbedService implements OnModuleDestroy, OnModuleInit {
    private llmApplication: RAGApplication;

    public async query(query: string) {
        return this.llmApplication.query(query);
    }

    async onModuleInit() {
        const solarModel = new Ollama({
            modelName: "solar",
            baseUrl: 'http://192.168.1.139:8080'
        });

        const nomicModel = new OllamaEmbedding({
            modelName: "nomic-embed-text",
            baseUrl: 'http://192.168.1.139:8080',
            dimenssions: 512
        });
        // const vectorDB = new LanceDb({ path: path.resolve('./db') });
        const vectorDB = new LanceDbCustom({ path: path.resolve('./db'), dimensions: 768 });
        // vectorDB.init({dimensions: 768});
        this.llmApplication = await new RAGApplicationBuilder()
        .setModel(solarModel)
        .setEmbeddingModel(nomicModel)
            .setTemperature(0.1)
            .addLoader(new YoutubeLoader({ videoIdOrUrl: 'https://www.youtube.com/watch?v=w2KbwC-s7pY' }))
            .addLoader(new WebLoader({ url: 'https://adhityan.com/' }))
            .setVectorDb(vectorDB)
            .build();
            console.log(this.llmApplication);
            await vectorDB.indexinVectors();
            console.log('indexing completed');
    }

    onModuleDestroy() {}
}
