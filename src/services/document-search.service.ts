import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentVectorizer } from '../utils/vectorize-docs';

@Injectable()
export class DocumentSearchService implements OnModuleInit {
  private vectorizer: DocumentVectorizer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:3407');
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (openaiApiKey) {
      this.vectorizer = new DocumentVectorizer(redisUrl, openaiApiKey);
      await this.vectorizer.initialize();
      console.log('Document search service initialized');
    } else {
      console.warn('OPENAI_API_KEY not found. Document search service disabled.');
    }
  }

  async searchProjectDocs(query: string, topK: number = 5): Promise<any[]> {
    if (!this.vectorizer) {
      throw new Error('Document search service is not initialized. Please provide OPENAI_API_KEY.');
    }
    
    return await this.vectorizer.searchSimilarDocuments(query, topK);
  }

  async getProjectStructureInfo(query: string): Promise<string> {
    const results = await this.searchProjectDocs(query, 3);
    
    if (results.length === 0) {
      return 'No relevant information found in project documentation.';
    }
    
    // Combine relevant chunks
    const relevantInfo = results
      .map((result, index) => {
        return `[${index + 1}] From ${result.source}:\n${result.content}`;
      })
      .join('\n\n---\n\n');
    
    return relevantInfo;
  }
}