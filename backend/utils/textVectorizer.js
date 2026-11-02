export function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

export function buildVocabulary(docs) {
  const vocab = new Set();
  docs.forEach(doc =>
    tokenize(doc).forEach(word => vocab.add(word))
  );
  return [...vocab];
}

export function tfidfVector(doc, vocab, docs) {
  const words = tokenize(doc);
  return vocab.map(term => {
    const tf = words.filter(w => w === term).length / words.length;
    const df = docs.filter(d => tokenize(d).includes(term)).length;
    const idf = Math.log(docs.length / (1 + df));
    return tf * idf;
  });
}

export function cosineSimilarity(v1, v2) {
  const dot = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  const mag1 = Math.sqrt(v1.reduce((s, v) => s + v*v, 0));
  const mag2 = Math.sqrt(v2.reduce((s, v) => s + v*v, 0));
  return dot / (mag1 * mag2);
}