/**
 * Fuzzy matching engine using Levenshtein distance and token-based similarity.
 */
const FuzzyMatcher = (() => {
    function levenshteinDistance(a, b) {
        const matrix = [];
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i-1] === a[j-1]) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function levenshteinSimilarity(a, b) {
        if (a === b) return 100;
        if (!a.length || !b.length) return 0;
        const dist = levenshteinDistance(a, b);
        return Math.round((1 - dist / Math.max(a.length, b.length)) * 100);
    }

    function tokenize(str) {
        return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
    }

    function jaccardSimilarity(tokensA, tokensB) {
        if (!tokensA.length && !tokensB.length) return 100;
        if (!tokensA.length || !tokensB.length) return 0;
        const setA = new Set(tokensA);
        const setB = new Set(tokensB);
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return Math.round((intersection.size / union.size) * 100);
    }

    function containsSimilarity(a, b) {
        const la = a.toLowerCase(), lb = b.toLowerCase();
        if (la.includes(lb) || lb.includes(la)) {
            return Math.round((Math.min(a.length, b.length) / Math.max(a.length, b.length)) * 100);
        }
        return 0;
    }

    function bigramSimilarity(a, b) {
        if (a.length < 2 || b.length < 2) return levenshteinSimilarity(a, b);
        const getBigrams = (str) => {
            const bigrams = new Set();
            const s = str.toLowerCase();
            for (let i = 0; i < s.length - 1; i++) bigrams.add(s.substring(i, i + 2));
            return bigrams;
        };
        const ba = getBigrams(a), bb = getBigrams(b);
        const intersection = new Set([...ba].filter(x => bb.has(x)));
        if (ba.size + bb.size === 0) return 0;
        return Math.round((2 * intersection.size) / (ba.size + bb.size) * 100);
    }

    function combinedSimilarity(a, b) {
        if (!a || !b) return 0;
        const na = a.trim(), nb = b.trim();
        if (na.toLowerCase() === nb.toLowerCase()) return 100;
        const lev = levenshteinSimilarity(na.toLowerCase(), nb.toLowerCase());
        const big = bigramSimilarity(na, nb);
        const con = containsSimilarity(na, nb);
        const jac = jaccardSimilarity(tokenize(na), tokenize(nb));
        return Math.min(100, Math.max(lev, big, con, jac,
            Math.round(lev * 0.4 + big * 0.3 + jac * 0.3)));
    }

    function findMatches(listA, listB, threshold = 60, maxResults = 3) {
        const results = [];
        for (const itemA of listA) {
            if (!itemA.trim()) continue;
            const matches = [];
            for (const itemB of listB) {
                if (!itemB.trim()) continue;
                const score = combinedSimilarity(itemA, itemB);
                if (score >= threshold) matches.push({ target: itemB, score });
            }
            matches.sort((a, b) => b.score - a.score);
            results.push({
                source: itemA,
                matches: maxResults > 0 ? matches.slice(0, maxResults) : matches
            });
        }
        return results;
    }

    return { findMatches, combinedSimilarity, levenshteinSimilarity, bigramSimilarity };
})();
