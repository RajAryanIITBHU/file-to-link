import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || ""; // optional but recommended

const TG_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TG_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

export const dynamic = "force-dynamic"; // ensure no caching on Vercel

export async function POST(req) {
  try {
    // --- Optional: verify webhook secret token header ---
    if (WEBHOOK_SECRET_TOKEN) {
      const incoming = req.headers.get("x-telegram-bot-api-secret-token");
      if (incoming !== WEBHOOK_SECRET_TOKEN) {
        console.warn("❌ Invalid webhook secret token");
        return NextResponse.json(
          { ok: false, error: "invalid secret token" },
          { status: 401 }
        );
      }
    }

    const update = await req.json();
    console.log("📩 Incoming update:", JSON.stringify(update, null, 2));

    const message = update?.message || update?.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true }); // ignore non-message updates
    }

    const chatId = message.chat?.id;
    if (!chatId) return NextResponse.json({ ok: true });

    // Handle /start
    const text = message.text?.trim();
    if (text === "/start") {
      await sendMessage(
        chatId,
        [
          "👋 Send me a file (or forward one).",
          "I’ll reply with a direct download link from Telegram’s CDN.",
          "",
          "⚠️ If a forwarded file is from a private/protected chat, Telegram doesn’t give me the file object.",
          "In that case I’ll ask you to send the file directly to me.",
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    // Extract file info (any type)
    const info = extractFileInfo(message);
    if (!info) {
      // No accessible file object in the update → likely a restricted forward
      await sendMessage(
        chatId,
        [
          "⚠️ I couldn't access a file in that message.",
          "If you forwarded it from a private/protected chat or a channel I’m not in, Telegram hides the file.",
          "👉 Please upload the file directly to me instead of forwarding.",
        ].join("\n")
      );
      return NextResponse.json({ ok: true, reason: "no file object" });
    }

    const { fileId, fileName, mimeType, fileSize, kind } = info;

    // Call getFile to obtain file_path
    const res = await fetch(
      `${TG_API}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = await res.json();

    if (!data?.ok || !data?.result?.file_path) {
      console.error("❌ getFile failed:", data);
      await sendMessage(
        chatId,
        [
          "❌ Failed to fetch file path from Telegram.",
          "Possible reasons:",
          "• Forwarded from a private/protected chat",
          "• I’m not in the original group/channel",
          "• Sender restricts saving content",
          "",
          "👉 Please upload the file directly to me.",
        ].join("\n")
      );
      return NextResponse.json({ ok: true, reason: "getFile failed" });
    }

    const filePath = data.result.file_path;
    const directLink = `${TG_FILE_API}/${filePath}`;

    // Build a nice response
    const lines = [
      "✅ File detected!",
      `• Type: ${kind}`,
      fileName ? `• Name: ${fileName}` : "",
      mimeType ? `• MIME: ${mimeType}` : "",
      fileSize ? `• Size: ${formatBytes(fileSize)}` : "",
      "",
      `🔗 Direct link:\n${directLink}`,
    ].filter(Boolean);

    await sendMessage(chatId, lines.join("\n"), {
      disable_web_page_preview: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    return NextResponse.json({ ok: false });
  }
}

/** Extracts a single file_id (largest photo if photos), plus helpful metadata */
function extractFileInfo(message) {
  // documents (pdf/zip/etc.)
  if (message.document) {
    const d = message.document;
    return {
      fileId: d.file_id,
      fileName: d.file_name,
      mimeType: d.mime_type,
      fileSize: d.file_size,
      kind: "document",
    };
  }

  // videos
  if (message.video) {
    const v = message.video;
    return {
      fileId: v.file_id,
      fileName: v.file_name,
      mimeType: v.mime_type,
      fileSize: v.file_size,
      kind: "video",
    };
  }

  // audio (music files)
  if (message.audio) {
    const a = message.audio;
    return {
      fileId: a.file_id,
      fileName: a.file_name || a.title,
      mimeType: a.mime_type,
      fileSize: a.file_size,
      kind: "audio",
    };
  }

  // voice messages (ogg/opus)
  if (message.voice) {
    const v = message.voice;
    return {
      fileId: v.file_id,
      mimeType: v.mime_type,
      fileSize: v.file_size,
      kind: "voice",
    };
  }

  // stickers (static/animated/video)
  if (message.sticker) {
    const s = message.sticker;
    return {
      fileId: s.file_id,
      fileName: s.emoji ? `sticker_${s.emoji}` : undefined,
      mimeType: undefined,
      fileSize: s.file_size,
      kind: "sticker",
    };
  }

  // photos come as an array of sizes; pick the largest
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const ph = message.photo[message.photo.length - 1];
    return {
      fileId: ph.file_id,
      mimeType: undefined,
      fileSize: ph.file_size,
      kind: "photo",
    };
  }

  return null;
}

async function sendMessage(chatId, text, options) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    }),
  });
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
}
