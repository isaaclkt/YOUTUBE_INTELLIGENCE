import { NextResponse } from "next/server";
import { ERROR_INVALID_BODY } from "@/lib/constants";
import { saveAnalysis } from "@/lib/repository";
import { parseAnalyzeRequest } from "@/lib/validation";
import { runAnalysisPipeline } from "@/services/pipeline";

/**
 * POST /api/analyses
 * Recebe { query, language, country }, roda o pipeline completo,
 * persiste e devolve { id } para a navegação até /analysis/[id].
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ERROR_INVALID_BODY }, { status: 400 });
  }

  const parsed = parseAnalyzeRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await runAnalysisPipeline(parsed.topic);
    const id = await saveAnalysis(parsed.topic, result);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[api/analyses] pipeline falhou:", error);
    return NextResponse.json(
      { error: "Falha ao executar a análise. Tente novamente." },
      { status: 500 }
    );
  }
}
