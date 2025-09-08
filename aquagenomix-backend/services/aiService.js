const axios = require('axios');

const AI_MODEL_URL = 'https://sih-yvgi.onrender.com';

async function predictSingle(sequence, sequenceId) {
  try {
    const response = await axios.post(`${AI_MODEL_URL}/predict`, {
      sequence: sequence,
      sequence_id: sequenceId
    }, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Prediction failed for ${sequenceId}:`, error.message);
    throw error;
  }
}

async function predictBatch(sequences) {
  try {
    const response = await axios.post(`${AI_MODEL_URL}/predict/batch`, {
      sequences: sequences.map(seq => ({
        sequence: seq.sequence,
        sequence_id: seq.sequence_id
      }))
    }, {
      timeout: 300000, // 5 minute timeout for batch
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Batch prediction failed:', error.message);
    // Fallback to single predictions
    const results = [];
    for (const seq of sequences) {
      try {
        const result = await predictSingle(seq.sequence, seq.sequence_id);
        results.push(result);
      } catch (err) {
        results.push({
          sequence_id: seq.sequence_id,
          error: err.message
        });
      }
    }
    return results;
  }
}

module.exports = { predictSingle, predictBatch };
