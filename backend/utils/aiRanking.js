import { buildVocabulary, tfidfVector, cosineSimilarity } from "./textVectorizer.js";

export function rankCandidates(jobDescription, resumes) {

  const docs = [jobDescription, ...resumes.map(r => r.summary)];
  const vocab = buildVocabulary(docs);

  const jobVector = tfidfVector(jobDescription, vocab, docs);

  return resumes.map(resume => {
    const resumeVector = tfidfVector(resume.summary, vocab, docs);
    const score = cosineSimilarity(jobVector, resumeVector);
    return { ...resume._doc, aiScore: score };
  }).sort((a, b) => b.aiScore - a.aiScore);
}