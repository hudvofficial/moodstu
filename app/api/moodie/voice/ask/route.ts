import { sendMoodieMessage } from "@/app/actions/moodie-mutations";
import { createClient } from "@/lib/supabase/server";
import type { MoodieMessage } from "@/types/moodie";

interface AskMoodieBody {
  question?: string;
  conversation_id?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n" },
      { status: 401 },
    );
  }

  let body: AskMoodieBody;
  try {
    body = await request.json() as AskMoodieBody;
  } catch {
    return Response.json({ error: "D\u1eef li\u1ec7u JSON kh\u00f4ng h\u1ee3p l\u1ec7." }, { status: 400 });
  }

  const question = body.question?.trim() || "";
  if (!question) {
    return Response.json({ error: "Thi\u1ebfu c\u00e2u h\u1ecfi cho Moodie." }, { status: 400 });
  }
  if (question.length > 4000) {
    return Response.json(
      { error: "C\u00e2u h\u1ecfi kh\u00f4ng \u0111\u01b0\u1ee3c v\u01b0\u1ee3t qu\u00e1 4000 k\u00fd t\u1ef1." },
      { status: 400 },
    );
  }

  try {
    const result = await sendMoodieMessage({
      conversation_id: body.conversation_id ?? null,
      content: question,
      attachments: [],
      contexts: [],
      response_profile: "voice",
    }, undefined);

    if (!result.success) {
      return Response.json(
        { error: result.error || "Moodie kh\u00f4ng th\u1ec3 x\u1eed l\u00fd c\u00e2u h\u1ecfi." },
        { status: 500 },
      );
    }

    const conversation = result.data.conversation;
    const assistantMessage = [...conversation.messages]
      .reverse()
      .find((message: MoodieMessage) => message.role === "assistant" && message.content.trim());

    if (!assistantMessage) {
      return Response.json(
        { error: "Moodie ch\u01b0a tr\u1ea3 v\u1ec1 n\u1ed9i dung ph\u1ea3n h\u1ed3i." },
        { status: 500 },
      );
    }

    return Response.json({
      text: assistantMessage.content,
      conversation_id: conversation.id,
    });
  } catch (error) {
    return Response.json(
      { error: `Kh\u00f4ng th\u1ec3 h\u1ecfi Moodie: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    );
  }
}
