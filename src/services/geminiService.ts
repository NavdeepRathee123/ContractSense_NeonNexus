import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key || (import.meta as any).env?.VITE_gemini_api_key || "";
const ai = new GoogleGenAI({ apiKey });

async function safeGenerateContent(params: any) {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. Please try again later or update your API key in the AI Studio settings.");
    }
    throw error;
  }
}

export async function analyzeContract(contractContent: string | { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze the following contract EXHAUSTIVELY and ACCURATELY. 
  
  CRITICAL INSTRUCTIONS:
  1. FULL TEXT EXTRACTION: You MUST extract the ENTIRE text of the contract from the provided input (whether it's text, PDF, or image). Do not skip any sections.
  2. SEGREGATE RELEVANT CONTENT: Identify what is legally relevant and what is noise/irrelevant to the core agreement.
  3. CROSS-CLAUSE CONTEXT: If clauses are related or dependent on each other, explain that relationship in the reasoning.
  4. OUTCOME SIMULATOR: For EACH clause, generate a possible court reasoning or future trouble that could arise from it.
  
  Tasks:
  1. Detect the contract type.
  2. Summarize the contract.
  3. Grade the overall contract risk from A to F (A = very dangerous, F = very safe/good).
  4. Identify EVERY single clause in the document and segregate them into risk levels: green (safe), yellow (caution), red (threat).
  5. For EACH AND EVERY clause identified, provide:
     - Crux: A short, punchy heading summarizing the clause (e.g., "Termination Rights", "Liability Cap").
     - Original text (the exact wording from the contract)
     - Plain English translation (explain it to a non-lawyer)
     - Risk level (green, yellow, or red)
     - Reasoning for the risk (including cross-clause context if applicable)
     - Counter points for negotiation (how to push back)
     - Suggested replacement wording (better version for the user)
     - Outcome Simulator: A detailed scenario of how this clause might play out in court or cause trouble.
  6. Provide "Party Intelligence": based on the tone, complexity, and specific terms, analyze the likely reputation and sophistication of the drafting party.
  7. Return the FULL extracted text of the contract in the "fullText" field.
  
  Return the result in JSON format. Ensure the JSON is valid and complete.`;

  const contentPart = typeof contractContent === 'string' 
    ? { text: contractContent } 
    : { inlineData: contractContent };

  const response = await safeGenerateContent({
    model,
    contents: [{ parts: [{ text: prompt }, contentPart] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 16384,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          summary: { type: Type.STRING },
          grade: { type: Type.STRING, enum: ["A", "B", "C", "D", "E", "F"] },
          fullText: { type: Type.STRING, description: "The full extracted text of the contract" },
          clauses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                crux: { type: Type.STRING },
                original: { type: Type.STRING },
                plainEnglish: { type: Type.STRING },
                riskLevel: { type: Type.STRING, enum: ["green", "yellow", "red"] },
                reasoning: { type: Type.STRING },
                counterPoint: { type: Type.STRING },
                suggestedWording: { type: Type.STRING },
                outcomeSimulator: { type: Type.STRING }
              },
              required: ["crux", "original", "plainEnglish", "riskLevel", "reasoning", "outcomeSimulator"]
            }
          },
          partyIntelligence: {
            type: Type.OBJECT,
            properties: {
              reputation: { type: Type.STRING },
              summary: { type: Type.STRING }
            }
          }
        },
        required: ["type", "summary", "grade", "clauses", "partyIntelligence", "fullText"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini", response.text);
    // Fallback if JSON is slightly malformed but text is there
    throw new Error("The AI response was not in a valid format. Please try again with a smaller section or a clearer document.");
  }
}

export async function calculateInitialRating(lawyerData: { qualifications: string, casesWon: number, casesLost: number, history: string }) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Based on the following lawyer credentials, provide an initial rating from 1.0 to 5.0 and a suggested price limit (min and max fee per review).
  
  Credentials:
  - Qualifications: ${lawyerData.qualifications}
  - Cases Won: ${lawyerData.casesWon}
  - Cases Lost: ${lawyerData.casesLost}
  - History: ${lawyerData.history}
  
  Consider the win/loss ratio, the prestige of qualifications, and experience.
  Return JSON format with "rating" (number) and "priceLimit" (object with min and max numbers).`;

  const response = await safeGenerateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rating: { type: Type.NUMBER },
          priceLimit: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER }
            },
            required: ["min", "max"]
          }
        },
        required: ["rating", "priceLimit"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function updateLawyerRating(currentRating: number, reviewedCases: any[]) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Analyze the performance of a lawyer based on their current rating and the cases they have reviewed on our platform.
  
  Current Rating: ${currentRating}
  Reviewed Cases Summary: ${JSON.stringify(reviewedCases)}
  
  Determine if the rating should increase or decrease based on the complexity and quality of their reviews.
  Return JSON format with "newRating" (number) and "newPriceLimit" (object with min and max numbers). The min limit should generally remain stable or increase slightly, while the max limit should reflect the new rating.`;

  const response = await safeGenerateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          newRating: { type: Type.NUMBER },
          newPriceLimit: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER }
            },
            required: ["min", "max"]
          }
        },
        required: ["newRating", "newPriceLimit"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatWithContract(contractContent: string, analysis: any, message: string, history: { role: 'user' | 'model', text: string }[]) {
  const model = "gemini-3.1-pro-preview";
  const systemInstruction = `You are an expert legal assistant. You are currently analyzing a specific contract.
  
  Contract Content:
  ${contractContent}
  
  AI Analysis:
  ${JSON.stringify(analysis)}
  
  Your goal is to answer questions about THIS contract specifically. Do not get confused with other contracts. Use the provided analysis to give deep insights. Be professional, clear, and helpful.`;

  const contents = [
    ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const response = await safeGenerateContent({
    model,
    contents: contents as any,
    config: {
      systemInstruction,
      maxOutputTokens: 1024
    }
  });

  return response.text;
}

export async function findClosestDomain(contractType: string, availableDomains: string[]) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Given the contract type "${contractType}" and the following available lawyer expertise domains:
  ${availableDomains.join(", ")}
  
  Which of these domains is the most relevant or closest match for reviewing this contract? 
  If multiple are relevant, pick the best one. 
  If none are even remotely relevant, return "None".
  
  Return ONLY the domain name from the list provided, or "None".`;

  const response = await safeGenerateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: 50
    }
  });

  const result = response.text?.trim() || "None";
  return availableDomains.includes(result) ? result : "None";
}

export async function simulateOutcome(contractText: string, question: string) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Based on this contract:
  ${contractText}
  
  Answer the following question or simulate an outcome:
  ${question}`;

  const response = await safeGenerateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: 2048
    }
  });

  return response.text;
}
