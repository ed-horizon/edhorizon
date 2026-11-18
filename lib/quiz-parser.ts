export interface ParsedOption {
    id: string;
    text: string;
}

export interface ParsedQuestion {
    id: string;
    text: string;
    options: ParsedOption[];
    correctOptionId: string;
    explanation?: string;
    imageUrl?: string;
}

function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 10);
}

/**
 * Parses raw text containing one or more quiz questions and options into structured MCQ questions.
 * Handles diverse formats:
 * - Numbered questions: 1. Question? / Q1: Question? / Question 1: Question?
 * - Options: A. / B. / a) / b) / (A) / (B) / 1. / 2. / * (asterisk marked)
 * - Answers: Answer: B / Ans: C / Correct: A / Key: D
 */
export function parseQuizText(rawText: string): {
    success: boolean;
    questions: ParsedQuestion[];
    error?: string;
} {
    if (!rawText || !rawText.trim()) {
        return { success: false, questions: [], error: "No text provided to parse." };
    }

    const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) {
        return { success: false, questions: [], error: "Provided text is empty." };
    }

    interface TempQuestion {
        promptLines: string[];
        options: { key?: string; text: string; isCorrectMarker?: boolean }[];
        answerKey?: string;
        explanation?: string;
    }

    const tempQuestions: TempQuestion[] = [];
    let currentQ: TempQuestion | null = null;

    // Regex helpers
    const questionHeaderRegex =
        /^(?:question\s*\d+\s*[:.]?|q\s*\d+\s*[:.]?|\d+[\.\)]\s+)(.+)/i;
    const optionRegex =
        /^(?:(?:\(([a-zA-Z0-9]+)\)|([a-zA-Z0-9]+)[\.\)]|([•\-\*]))\s*)(.+)/;
    const answerRegex =
        /^(?:ans(?:wer)?|correct(?:\s*answer)?|key)\s*[:=-]?\s*(.+)/i;
    const explanationRegex =
        /^(?:exp(?:lanation)?|notes?)\s*[:=-]?\s*(.+)/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check for Question start
        const qMatch = line.match(questionHeaderRegex);
        if (qMatch) {
            // Push previous question
            if (currentQ && currentQ.promptLines.length > 0) {
                tempQuestions.push(currentQ);
            }
            currentQ = {
                promptLines: [qMatch[1].trim()],
                options: [],
            };
            continue;
        }

        // 2. Check for Answer line
        const ansMatch = line.match(answerRegex);
        if (ansMatch && currentQ) {
            currentQ.answerKey = ansMatch[1].trim();
            continue;
        }

        // 3. Check for Explanation line
        const expMatch = line.match(explanationRegex);
        if (expMatch && currentQ) {
            currentQ.explanation = expMatch[1].trim();
            continue;
        }

        // 4. Check for Option line
        let cleanOptLine = line;
        let isCorrectMarker = false;

        // Check for leading asterisk or marker (*A., *(B), * B.)
        if (/^[\*✓✔\+]\s*/.test(cleanOptLine)) {
            isCorrectMarker = true;
            cleanOptLine = cleanOptLine.replace(/^[\*✓✔\+]\s*/, "");
        }
        if (/^\[[xX]\]\s*/.test(cleanOptLine)) {
            isCorrectMarker = true;
            cleanOptLine = cleanOptLine.replace(/^\[[xX]\]\s*/, "");
        }

        const optMatch = cleanOptLine.match(optionRegex);
        // Ensure it's an option only if we already have a question prompt
        if (optMatch && currentQ && currentQ.promptLines.length > 0) {
            const rawKey = (optMatch[1] || optMatch[2] || "").trim().toUpperCase();
            let optText = optMatch[4].trim();

            if (/\(correct\)/i.test(optText)) {
                isCorrectMarker = true;
                optText = optText.replace(/\(correct\)/i, "").trim();
            }

            currentQ.options.push({
                key: rawKey,
                text: optText,
                isCorrectMarker,
            });
            continue;
        }

        // 5. Continuation lines
        if (currentQ) {
            if (currentQ.options.length === 0) {
                // Continuation of question prompt
                currentQ.promptLines.push(line);
            } else {
                // Continuation of last option
                const lastOpt = currentQ.options[currentQ.options.length - 1];
                lastOpt.text += " " + line;
            }
        } else {
            // Text before any "1." header - treat as the first question prompt
            currentQ = {
                promptLines: [line],
                options: [],
            };
        }
    }

    if (currentQ && currentQ.promptLines.length > 0) {
        tempQuestions.push(currentQ);
    }

    // Convert tempQuestions into ParsedQuestion[]
    const parsedQuestions: ParsedQuestion[] = [];

    for (const tq of tempQuestions) {
        const prompt = tq.promptLines.join(" ").trim();
        if (!prompt || tq.options.length < 2) {
            // Need at least a prompt and 2 options
            continue;
        }

        const options: ParsedOption[] = tq.options.map((opt, idx) => ({
            id: String(idx + 1),
            text: opt.text,
        }));

        // Determine correct answer
        let correctOptionId = options[0].id; // default

        // Check if any option had an explicit marker (* or (correct))
        const markedIdx = tq.options.findIndex((o) => o.isCorrectMarker);
        if (markedIdx !== -1) {
            correctOptionId = options[markedIdx].id;
        } else if (tq.answerKey) {
            const rawAns = tq.answerKey.trim().toUpperCase();

            // Check if answerKey is a single letter (A, B, C, D)
            const letterMatch = rawAns.match(/^[A-Z]\b/);
            if (letterMatch) {
                const charCode = letterMatch[0].charCodeAt(0) - 65; // A=0, B=1, C=2...
                if (charCode >= 0 && charCode < options.length) {
                    correctOptionId = options[charCode].id;
                }
            } else if (/^\d+\b/.test(rawAns)) {
                // Number (1, 2, 3...)
                const num = parseInt(rawAns, 10);
                if (num >= 1 && num <= options.length) {
                    correctOptionId = options[num - 1].id;
                }
            } else {
                // Match by exact or partial option text
                const matchByText = options.find((o) =>
                    o.text.toLowerCase().includes(tq.answerKey!.toLowerCase())
                );
                if (matchByText) {
                    correctOptionId = matchByText.id;
                }
            }
        }

        parsedQuestions.push({
            id: generateId(),
            text: prompt,
            options,
            correctOptionId,
            explanation: tq.explanation || "",
        });
    }

    if (parsedQuestions.length === 0) {
        return {
            success: false,
            questions: [],
            error: "Could not parse any valid questions. Please ensure each question has a prompt and at least 2 options (e.g. A. option, B. option).",
        };
    }

    return {
        success: true,
        questions: parsedQuestions,
    };
}
