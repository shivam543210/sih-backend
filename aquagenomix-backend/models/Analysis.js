const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  sequence_id: String,
  sequence: String,
  length: Number,
  result: {
    species: String,
    confidence: Number,
    probabilities: Object,
    processing_time: Number
  }
});

const analysisSchema = new mongoose.Schema({
  fileName: String,
  fileSize: Number,
  uploadDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['processing', 'completed', 'failed'], 
    default: 'processing' 
  },
  sequences: [sequenceSchema],
  summary: {
    totalSequences: Number,
    speciesFound: [String],
    averageConfidence: Number,
    processingTime: Number
  },
  error: String
});

module.exports = mongoose.model('Analysis', analysisSchema);
