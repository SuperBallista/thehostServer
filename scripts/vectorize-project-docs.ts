import { DocumentVectorizer } from '../src/utils/vectorize-docs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:3407';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY environment variable not found');
    console.warn('Document vectorization is disabled in production without API key');
    console.warn('Exiting gracefully...');
    process.exit(0);
  }
  
  const docsPath = join(__dirname, '..', 'docs');
  
  console.log('=== Document Vectorization Script ===');
  console.log(`Redis URL: ${REDIS_URL}`);
  console.log(`Docs Path: ${docsPath}`);
  console.log('');
  
  const vectorizer = new DocumentVectorizer(REDIS_URL, OPENAI_API_KEY);
  
  try {
    // Initialize Redis vector index
    await vectorizer.initialize();
    
    // Vectorize all documents
    await vectorizer.vectorizeAllDocuments(docsPath);
    
    // Test search functionality
    console.log('\n=== Testing Search Functionality ===');
    const testQuery = '프로젝트 구조';
    console.log(`Test query: "${testQuery}"`);
    
    const results = await vectorizer.searchSimilarDocuments(testQuery, 3);
    console.log('\nSearch results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Source: ${result.source}`);
      console.log(`   Chunk: ${result.chunk_index}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Content preview: ${result.content.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('Error during vectorization:', error);
    process.exit(1);
  } finally {
    await vectorizer.close();
  }
  
  console.log('\n✅ Document vectorization completed successfully!');
}

// Run the script
main().catch(console.error);