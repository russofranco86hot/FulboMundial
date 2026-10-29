import { NextResponse } from "next/server";
import { generateMatchChronicle, type ChronicleInput } from "@/lib/ai-chronicle";

export async function POST(req: Request) {
  try {
    const body: ChronicleInput = await req.json();
    const result = await generateMatchChronicle(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating match chronicle:", error);
    return NextResponse.json(
      { error: "No se pudo generar la crónica del partido." },
      { status: 500 }
    );
  }
}
