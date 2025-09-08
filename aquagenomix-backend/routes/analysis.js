const express = require('express');
const router = express.Router();
const Analysis = require('../models/Analysis');
const upload = require('../middleware/upload');
const { parseFasta, parseFastq } = require('../utils/fileParser');
const { predictBatch } = require('../services/aiService');

// Upload and process file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Parse sequences based on file type
    let sequences;
    if (fileName.toLowerCase().includes('.fastq') || fileName.toLowerCase().includes('.fq')) {
      sequences = parseFastq(fileContent);
    } else {
      sequences = parseFasta(fileContent);
    }

    if (sequences.length === 0) {
      return res.status(400).json({ error: 'No valid sequences found in file' });
    }

    // Create analysis record
    const analysis = new Analysis({
      fileName,
      fileSize,
      sequences: sequences.map(seq => ({
        sequence_id: seq.sequence_id,
        sequence: seq.sequence,
        length: seq.length
      })),
      summary: {
        totalSequences: sequences.length
      }
    });

    await analysis.save();

    // Start processing (blocking)
    try {
      const startTime = Date.now();
      
      // Call AI model
      const predictions = await predictBatch(sequences);
      
      // Update sequences with results
      const updatedSequences = analysis.sequences.map((seq, index) => {
        const prediction = predictions[index];
        if (prediction && !prediction.error) {
          return {
            ...seq.toObject(),
            result: {
              species: prediction.species,
              confidence: prediction.confidence,
              probabilities: prediction.probabilities,
              processing_time: prediction.processing_time
            }
          };
        }
        return seq;
      });

      // Calculate summary
      const validResults = updatedSequences.filter(seq => seq.result);
      const speciesFound = [...new Set(validResults.map(seq => seq.result.species))];
      const avgConfidence = validResults.length > 0 
        ? validResults.reduce((sum, seq) => sum + seq.result.confidence, 0) / validResults.length 
        : 0;

      // Update analysis
      analysis.sequences = updatedSequences;
      analysis.status = 'completed';
      analysis.summary = {
        totalSequences: sequences.length,
        speciesFound,
        averageConfidence: avgConfidence,
        processingTime: (Date.now() - startTime) / 1000
      };

      await analysis.save();

      res.json({
        analysis_id: analysis._id,
        status: 'completed',
        message: 'Analysis completed successfully',
        summary: analysis.summary
      });

    } catch (error) {
      // Update analysis with error
      analysis.status = 'failed';
      analysis.error = error.message;
      await analysis.save();

      res.status(500).json({
        analysis_id: analysis._id,
        status: 'failed',
        error: error.message
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Get analysis results
router.get('/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analysis status
router.get('/:id/status', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id, 'status summary error');
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      status: analysis.status,
      summary: analysis.summary,
      error: analysis.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all analyses
router.get('/', async (req, res) => {
  try {
    const analyses = await Analysis.find(
      {}, 
      'fileName uploadDate status summary'
    ).sort({ uploadDate: -1 });
    
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
