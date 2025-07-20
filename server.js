const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Home route
app.get("/", (req, res) => {
  res.send("✅ Gemini API server is running.");
});

// Retry logic
async function generateWithRetry(model, prompt, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return await result.response.text();
    } catch (err) {
      if (err.message && err.message.includes("503") && i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// API route
app.post("/api/generate", async (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ success: false, error: "❌ Missing or invalid topic input." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Generate 25 multiple-choice interview questions for topic: ${topic}.
      For each question, provide 4 options labeled A, B, C, D, and specify the correct answer as "Correct Answer: <option letter>".
      Format:
      <number>. <Question>
      A) Option 1
      B) Option 2
      C) Option 3
      D) Option 4
      Correct Answer: <option letter>
    `;
    const responseText = await generateWithRetry(model, prompt);
    res.json({ success: true, content: responseText });
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message || err);
    res.status(500).json({ success: false, error: "❌ Failed to get response from Gemini." });
  }
});

// Use Render's dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
