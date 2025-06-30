import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

async function readVectorData() {
  const redisUrl = process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`;
  console.log('Connecting to Redis at:', redisUrl);
  const redis = new Redis(redisUrl);
  
  try {
    // Get all document keys
    const keys = await redis.keys('doc:*');
    console.log(`Found ${keys.length} vector documents in Redis\n`);
    
    if (keys.length === 0) {
      console.log('No vector data found in Redis');
      return;
    }
    
    // Read each document
    for (const key of keys) {
      console.log(`\n=== Document: ${key} ===`);
      
      // Get all fields for this document
      const fields = await redis.hgetall(key);
      
      // Display metadata
      console.log('Source:', fields.source);
      console.log('Chunk Index:', fields.chunk_index);
      console.log('Total Chunks:', fields.total_chunks);
      console.log('Timestamp:', new Date(parseInt(fields.timestamp)).toISOString());
      console.log('Content Preview:', fields.content.substring(0, 200) + '...');
      
      // Check if embedding exists
      if (fields.embedding) {
        try {
          // Redis stores the embedding as a binary string
          const embeddingBuffer = Buffer.from(fields.embedding, 'binary');
          const embeddingArray = new Float32Array(
            embeddingBuffer.buffer.slice(
              embeddingBuffer.byteOffset,
              embeddingBuffer.byteOffset + embeddingBuffer.byteLength
            )
          );
          console.log('Embedding dimensions:', embeddingArray.length);
          console.log('First 5 embedding values:', Array.from(embeddingArray.slice(0, 5)));
        } catch (err) {
          console.log('Embedding exists but could not parse:', err.message);
        }
      }
    }
    
    // Check if search index exists
    try {
      const indexInfo = await redis.call('FT.INFO', 'idx:docs');
      console.log('\n=== Search Index Info ===');
      console.log('Index exists: Yes');
      console.log('Index details:', indexInfo);
    } catch (error) {
      console.log('\n=== Search Index Info ===');
      console.log('Index exists: No');
    }
    
  } catch (error) {
    console.error('Error reading vector data:', error);
  } finally {
    await redis.quit();
  }
}

// Run the script
readVectorData().catch(console.error);