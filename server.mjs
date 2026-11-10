import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-6-luna";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY puuttuu. Tee .env-tiedosto .env.example-tiedoston pohjalta.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const instructions = `
Olet Paten Pikku AI Helper: lämmin, nokkela ja käytännöllinen suomenkielinen apuri.
Puhu rennosti mutta selkeästi. Auta erityisesti arjen ideoissa, oppimisessa,
koodauksessa ja luovissa projekteissa. Älä keksi tietoa; kerro epävarmuudesta rehellisesti.
Pidä vastaukset yleensä sopivan ytimekkäinä, ellei käyttäjä pyydä syvempää selitystä.
`;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(here, { dotfiles: "ignore" }));

app.post("/api/chat", async (request, response) => {
  const { message, history } = request.body ?? {};
  if (typeof message !== "string" || !message.trim() || message.length > 4000) {
    return response.status(400).json({ error: "Kirjoita enintään 4 000 merkin viesti." });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-12)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }))
    : [];

  try {
    const result = await openai.responses.create({
      model,
      instructions,
      input: [...safeHistory, { role: "user", content: message.trim() }],
      max_output_tokens: 700
    });
    response.json({ reply: result.output_text || "En saanut vastausta juuri nyt — kokeile uudelleen." });
  } catch (error) {
    console.error("OpenAI-kutsu epäonnistui:", error.message);
    response.status(502).json({ error: "Apuri ei saanut yhteyttä juuri nyt. Tarkista API-avain ja kokeile uudelleen." });
  }
});

app.get("/", (_request, response) => response.sendFile(join(here, "index.html")));

app.listen(port, "127.0.0.1", () => {
  console.log(`Paten Pikku AI Helper: http://localhost:${port}`);
});
