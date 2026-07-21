import { geminiJSON } from "@/lib/gemini";

const SYSTEM = `คุณเขียนสรุปรายสัปดาห์ของกลุ่มแฟชั่นให้สนุก เป็นกันเอง กระชับ
ใช้ข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขเพิ่ม ตอบภาษาไทย 2-4 ประโยค`;

export async function writeDigest(data: {
  groupName: string;
  stats: { posts: number; votes: number; activeMembers: number };
  topOutfits: { caption: string; votes: number }[];
  colorTrends: { label: string; count: number }[];
}): Promise<{ summary: string }> {
  return geminiJSON<{ summary: string }>({
    system: SYSTEM,
    prompt: JSON.stringify(data),
    responseSchema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  });
}
