import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("📩 Incoming update:", JSON.stringify(body, null, 2)); // Log full payload

    const message = body?.message;
    if (!message) {
      console.warn("⚠️ No 'message' object in update");
      return NextResponse.json({ ok: false, error: "No message object" });
    }

    const chatId = message.chat.id;
    let fileId = null;
    let fileType = "";

    // Detect file type and get file_id
    if (message.document) {
      fileId = message.document.file_id;
      fileType = "document";
    } else if (message.video) {
      fileId = message.video.file_id;
      fileType = "video";
    } else if (message.audio) {
      fileId = message.audio.file_id;
      fileType = "audio";
    } else if (message.voice) {
      fileId = message.voice.file_id;
      fileType = "voice";
    } else if (message.photo) {
      const photos = message.photo;
      fileId = photos[photos.length - 1].file_id;
      fileType = "photo";
    }

    if (!fileId) {
      await sendMessage(
        chatId,
        "⚠️ This forwarded file is restricted or has no accessible file object.\n" +
          "Please send the file directly to me instead of forwarding from a private/protected chat."
      );
      return NextResponse.json({ ok: true, reason: "No file_id found" });
    }

    // Try to get file path from Telegram API
    const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      console.error("❌ Telegram getFile error:", fileData);
      await sendMessage(
        chatId,
        `❌ Failed to fetch file path from Telegram.\n` +
          `Possible reasons:\n` +
          `- File was forwarded from a private/protected chat\n` +
          `- Bot is not in the original chat/channel\n` +
          `- The sender has restricted saving content\n\n` +
          `Please try sending the file directly to this bot.`
      );
      return NextResponse.json({ ok: true, reason: "getFile failed" });
    }

    const filePath = fileData.result.file_path;
    const directLink = `${TELEGRAM_FILE_API}/${filePath}`;

    console.log(`✅ File path found: ${filePath}`);
    await sendMessage(
      chatId,
      `📥 File type: ${fileType}\n` +
        `📂 File path: ${filePath}\n` +
        `🔗 Direct link:\n${directLink}`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 Error processing webhook:", err);
    return NextResponse.json({ ok: false, error: "Server error" });
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
