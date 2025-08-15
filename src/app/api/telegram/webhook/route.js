import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = "8284136086:AAHBo_7XtnCn9Kkk9wcDqsQwjfVqXLwf0yU";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message) {
      return NextResponse.json({ ok: false, error: "No message found" });
    }

    const chatId = message.chat.id;
    let fileId = null;

    // Detect type of file
    if (message.document) fileId = message.document.file_id;
    else if (message.video) fileId = message.video.file_id;
    else if (message.audio) fileId = message.audio.file_id;
    else if (message.voice) fileId = message.voice.file_id;
    else if (message.photo) {
      // For photos, pick largest size
      const photos = message.photo;
      fileId = photos[photos.length - 1].file_id;
    }

    if (!fileId) {
      await sendMessage(chatId, "❌ No file detected in your message.");
      return NextResponse.json({ ok: true });
    }

    // Get file path from Telegram API
    const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      await sendMessage(chatId, "❌ Failed to fetch file path from Telegram.");
      return NextResponse.json({ ok: true });
    }

    const filePath = fileData.result.file_path;
    const directLink = `${TELEGRAM_FILE_API}/${filePath}`;

    // Send direct download link back to user
    await sendMessage(chatId, `📥 Your direct download link:\n${directLink}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json({ ok: false });
  }
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}
