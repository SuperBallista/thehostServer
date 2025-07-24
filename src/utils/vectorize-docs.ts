import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { createHash } from 'crypto';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunk_index: number;
    total_chunks: number;
    timestamp: number;
  };
}

interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: DocumentChunk['metadata'];
  content: string;
}

interface SearchResult {
  content: string;
  source: string;
  score: string;
  chunk_index: string;
}

export class DocumentVectorizer {
  private redis: Redis;
  private openai: OpenAI;
  private readonly VECTOR_DIM = 1536; // OpenAI embeddings dimension
  private readonly CHUNK_SIZE = 1000; // characters per chunk
  private readonly CHUNK_OVERLAP = 200; // overlap between chunks

  constructor(redisUrl: string, openaiApiKey: string) {
    this.redis = new Redis(redisUrl);
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  async initialize() {
    try {
      // Create Redis search index for vector similarity
      await this.redis.call(
        'FT.CREATE',
        'idx:docs',
        'ON',
        'HASH',
        'PREFIX',
        '1',
        'doc:',
        'SCHEMA',
        'content',
        'TEXT',
        'source',
        'TAG',
        'embedding',
        'VECTOR',
        'FLAT',
        '6',
        'TYPE',
        'FLOAT32',
        'DIM',
        this.VECTOR_DIM.toString(),
        'DISTANCE_METRIC',
        'COSINE',
      );
      console.log('Redis vector index created successfully');
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes('Index already exists')
      ) {
        console.log('Redis vector index already exists');
      } else {
        throw error;
      }
    }
  }

  private async readDocumentFiles(
    docsPath: string,
  ): Promise<{ path: string; content: string }[]> {
    const documents: { path: string; content: string }[] = [];

    async function scanDir(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (ext === '.md' || ext === '.txt') {
            const content = await readFile(fullPath, 'utf-8');
            documents.push({ path: fullPath, content });
          }
        }
      }
    }

    await scanDir(docsPath);
    return documents;
  }

  private chunkDocument(content: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + this.CHUNK_SIZE, content.length);
      const chunk = content.slice(start, end);
      chunks.push(chunk);
      start += this.CHUNK_SIZE - this.CHUNK_OVERLAP;
    }

    return chunks;
  }

  private generateChunkId(source: string, chunkIndex: number): string {
    const hash = createHash('md5')
      .update(`${source}:${chunkIndex}`)
      .digest('hex');
    return `chunk:${hash}`;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  async vectorizeDocument(
    filePath: string,
    content: string,
  ): Promise<VectorDocument[]> {
    const chunks = this.chunkDocument(content);
    const vectorDocs: VectorDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = this.generateChunkId(filePath, i);

      const embedding = await this.createEmbedding(chunk);

      const vectorDoc: VectorDocument = {
        id: chunkId,
        embedding,
        content: chunk,
        metadata: {
          source: filePath,
          chunk_index: i,
          total_chunks: chunks.length,
          timestamp: Date.now(),
        },
      };

      vectorDocs.push(vectorDoc);
    }

    return vectorDocs;
  }

  async storeVectorDocument(doc: VectorDocument) {
    const key = `doc:${doc.id}`;

    // Convert embedding array to buffer for Redis
    const embeddingBuffer = Buffer.from(new Float32Array(doc.embedding).buffer);

    await this.redis.hset(
      key,
      'content',
      doc.content,
      'source',
      doc.metadata.source,
      'chunk_index',
      doc.metadata.chunk_index.toString(),
      'total_chunks',
      doc.metadata.total_chunks.toString(),
      'timestamp',
      doc.metadata.timestamp.toString(),
      'embedding',
      embeddingBuffer,
    );
  }

  async vectorizeAllDocuments(docsPath: string) {
    console.log('Starting document vectorization...');
    const documents = await this.readDocumentFiles(docsPath);
    console.log(`Found ${documents.length} documents to process`);

    let totalChunks = 0;

    for (const doc of documents) {
      console.log(`Processing: ${doc.path}`);
      const vectorDocs = await this.vectorizeDocument(doc.path, doc.content);

      for (const vectorDoc of vectorDocs) {
        await this.storeVectorDocument(vectorDoc);
        totalChunks++;
      }

      console.log(`  - Created ${vectorDocs.length} chunks`);
    }

    console.log(
      `\nVectorization complete! Processed ${totalChunks} total chunks`,
    );
  }

  async searchSimilarDocuments(
    query: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    // Create embedding for the query
    const queryEmbedding = await this.createEmbedding(query);
    const embeddingBuffer = Buffer.from(
      new Float32Array(queryEmbedding).buffer,
    );

    // Perform vector similarity search
    const results = (await this.redis.call(
      'FT.SEARCH',
      'idx:docs',
      `*=>[KNN ${topK} @embedding $BLOB AS score]`,
      'PARAMS',
      '2',
      'BLOB',
      embeddingBuffer,
      'RETURN',
      '4',
      'content',
      'source',
      'score',
      'chunk_index',
      'SORTBY',
      'score',
      'DIALECT',
      '2',
    )) as any[];

    // Parse results
    const documents: SearchResult[] = [];

    // Check if results exist and have proper format
    if (!results || results.length < 2) {
      return documents;
    }

    // First element is total count, skip it and parse actual results
    for (let i = 2; i < results.length; i += 2) {
      const fields = results[i + 1];
      if (!fields || !Array.isArray(fields)) {
        continue;
      }

      const doc: SearchResult = {} as SearchResult;

      for (let j = 0; j < fields.length; j += 2) {
        if (fields[j] && fields[j + 1] !== undefined) {
          doc[fields[j] as keyof SearchResult] = fields[j + 1];
        }
      }

      documents.push(doc);
    }

    return documents;
  }

  async close() {
    await this.redis.quit();
  }
}
