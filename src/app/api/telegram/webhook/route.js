// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req) {
  try {
    const update = await req.json();
    console.log("🔹 Incoming Telegram update:", JSON.stringify(update, null, 2));

    // Step 1: Get file_id from the incoming message
    const fileId = update?.message?.document?.file_id
      || update?.message?.photo?.[0]?.file_id
      || update?.message?.video?.file_id
      || null;

    if (!fileId) {
      console.error("❌ No file_id found in update.");
      return NextResponse.json({ error: "No file found in message." }, { status: 400 });
    }

    console.log("📂 File ID:", fileId);

    // Step 2: Get file_path using getFile
    const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const fileRes = await fetch(getFileUrl);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      console.error("❌ Failed to fetch file path:", fileData);
      return NextResponse.json({ error: "Failed to fetch file path" }, { status: 500 });
    }

    const filePath = fileData.result.file_path;
    console.log("📄 File Path:", filePath);

    // Step 3: Construct direct download link
    const fileLink = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    console.log("✅ Direct File Link:", fileLink);

    // Optional: send the link back to the user via sendMessage
    const chatId = update.message.chat.id;
    const sendMsgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(sendMsgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Your download link: ${fileLink}`
      })
    });

    return NextResponse.json({ success: true, fileLink });

  } catch (err) {
    console.error("🔥 Error handling Telegram update:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
