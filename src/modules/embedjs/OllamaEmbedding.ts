import { BaseEmbeddings } from '@llm-tools/embedjs';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

export class OllamaEmbedding implements BaseEmbeddings {
  private apiUrl = 'http://192.168.1.142:8080/api/embeddings';
  private model = 'nomic-embed-text';
  private dimensions = 1536; // Assuming 1536 dimensions for this model

  constructor({ baseUrl, dimenssions, modelName }: {
    baseUrl?: string;
    dimenssions?: number;
    modelName?: string;
}) {
    this.apiUrl = baseUrl;
    this.model = modelName;
    this.dimensions = dimenssions;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const batches = texts; // this.chunkArray(texts, 512); // Assume 512 is the batch size
    // const batches = this.mergeInChunks(texts, 512);
    const embeddings: number[][] = [];
    const endpoint = `${this.apiUrl}/api/embeddings`;
 

    let batchPosition = 0;
    for (const batch of batches) {
        const body = {
            model: this.model,
            prompt: batch,
            dimensionality: 255
          };
          try {
            const response = await axios.post(endpoint,
                JSON.stringify(body),
              {
                headers: { 'Content-Type': 'application/json' }
                }
            );
              // embeddings.push(...response.data.embedding);
              // embeddings.push(response.data.embedding);
              embeddings.push(response.data.embedding)
              batchPosition++;
          } catch(ex) {
            console.log(ex);
          }
      
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const endpoint = `${this.apiUrl}/api/embeddings`;
    const body = {
        model: this.model,
        prompt: text,
        dimensionality: 255
      };
    const response = await axios.post(endpoint,
        JSON.stringify(body),
      {
        headers: { 'Content-Type': 'application/json' }
        }
    );

    return response.data.embedding;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  private chunkArray(array: string[], size: number): string[][] {
    const result: string[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  private mergeInChunks(texts: string[], chunkSize: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < texts.length; i += chunkSize) {
        const chunk = texts.slice(i, i + chunkSize).join(' ');
        result.push(chunk);
    }
    return result;
}
}
