import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export type DailySalesData = {
  restaurantName: string;
  date: string;
  totalRevenue: number;
  orderCount: number;
  paymentByMethod: { UPI: number; CASH: number; [key: string]: number };
  topItems: { name: string; quantity: number }[];
};

export async function generateSmartInsight(data: DailySalesData): Promise<string> {
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing in environment variables");
    return "AI insight unavailable. Please check API Key configuration.";
  }

  try {
    // Using the latest stable model for 2026
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
  You are a restaurant analytics expert. Analyze this daily sales data for a restaurant owner.
  Data: ${JSON.stringify(data)}
  Provide a short, motivating insight (under 40 words) in Hinglish (Hindi+English mix) suitable for a WhatsApp message.
  Focus on: Top selling item, Total Revenue, and one actionable tip for tomorrow.
  Do not use bold markdown (*), just plain text with emojis.
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() ?? "Unable to generate insight.";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Gemini API Error:", msg);

    // Fallback if AI fails so the user still sees something useful
    const totalSales = data.totalRevenue ?? 0;
    return `🚀 Great job today! You made ₹${totalSales}. Keep pushing for more tomorrow! (AI is taking a quick nap)`;
  }
}
