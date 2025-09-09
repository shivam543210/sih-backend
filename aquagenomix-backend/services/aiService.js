const axios = require('axios');

const AI_MODEL_URL = 'http://localhost:8000';

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
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
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

    console.log('Batch prediction successful.');
    return response.data;

  } catch (batchError) {
    console.error('Batch prediction failed:', batchError.message);
    if (batchError.response) {
      console.error('Batch error response status:', batchError.response.status);
      console.error('Batch error response data:', batchError.response.data);
    }

    // Fallback to single predictions
    console.log('Falling back to single predictions...');
    const results = [];
    for (const seq of sequences) {
      try {
        const result = await predictSingle(seq.sequence, seq.sequence_id);
        results.push(result);
      } catch (singleError) {
        console.error(`Single prediction failed for sequence ${seq.sequence_id}:`, singleError.message);
        if (singleError.response) {
          console.error('Single error response status:', singleError.response.status);
          console.error('Single error response data:', singleError.response.data);
        }
        results.push({
          sequence_id: seq.sequence_id,
          error: 'Prediction failed: ' + singleError.message
        });
      }
    }
    return results;
  }
}

module.exports = { predictSingle, predictBatch };