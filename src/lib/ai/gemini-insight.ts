import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type DailySalesData = {
  restaurantName: string;
  date: string;
  totalRevenue: number;
  orderCount: number;
  paymentByMethod: { UPI: number; CASH: number; [key: string]: number };
  topItems: { name: string; quantity: number }[];
};

/**
 * Generates a 3-line "Smart Insight" for the restaurant owner using Gemini.
 * Example: "Your Biryani is selling fast, increase stock for tomorrow"
 */
export async function generateSmartInsight(data: DailySalesData): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Add GEMINI_API_KEY to .env to enable AI insights.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    const topItemsStr =
      data.topItems.length > 0
        ? data.topItems.map((i) => `${i.name} (${i.quantity} sold)`).join(", ")
        : "No items sold today";

    const prompt = `You are a helpful assistant for a restaurant owner. Based on today's sales data, write exactly 3 short, actionable lines of insight or advice. Be specific and practical. Use a friendly, encouraging tone.

Restaurant: ${data.restaurantName}
Date: ${data.date}
Total Revenue: ₹${data.totalRevenue.toFixed(2)}
Orders: ${data.orderCount}
Payment split: UPI ₹${data.paymentByMethod.UPI?.toFixed(2) ?? 0}, CASH ₹${data.paymentByMethod.CASH?.toFixed(2) ?? 0}
Top selling items: ${topItemsStr}

Write 3 lines only. No bullet points. Each line should be a complete sentence. Focus on: what's selling well, what to stock up, or any pattern worth noting.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text()?.trim() ?? "";

    return text || "Unable to generate insight.";
  } catch (error) {
    console.error("[Gemini] Smart insight error:", error);
    return "AI insight unavailable. Check GEMINI_API_KEY.";
  }
}
