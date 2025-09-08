function parseFasta(content) {
  const sequences = [];
  const lines = content.split('\n');
  let currentSeq = null;
  let currentSequence = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('>')) {
      // Save previous sequence
      if (currentSeq) {
        sequences.push({
          sequence_id: currentSeq,
          sequence: currentSequence,
          length: currentSequence.length
        });
      }
      
      // Start new sequence
      currentSeq = trimmedLine.substring(1);
      currentSequence = '';
    } else if (trimmedLine && currentSeq) {
      currentSequence += trimmedLine;
    }
  }
  
  // Save last sequence
  if (currentSeq && currentSequence) {
    sequences.push({
      sequence_id: currentSeq,
      sequence: currentSequence,
      length: currentSequence.length
    });
  }
  
  return sequences;
}

function parseFastq(content) {
  const sequences = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i += 4) {
    if (i + 3 < lines.length) {
      const header = lines[i].trim();
      const sequence = lines[i + 1].trim();
      
      if (header.startsWith('@') && sequence) {
        sequences.push({
          sequence_id: header.substring(1),
          sequence: sequence,
          length: sequence.length
        });
      }
    }
  }
  
  return sequences;
}

module.exports = { parseFasta, parseFastq };
