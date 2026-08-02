// results-route.js
// Drop-in Express route for Jax's Class 7 practice app.
// Receives POST /api/results from the quiz and emails the parent (with a console-log fallback).
//
// SETUP (one time):
//   1) npm install express nodemailer
//   2) In your main server file, add these two lines near your other routes:
//          app.use(express.json());                 // if you don't already parse JSON
//          app.use(require("./results-route"));
//   3) Set these environment variables in Railway (Service > Variables):
//          PARENT_EMAIL   = you@example.com          (where results are sent)
//          SMTP_HOST      = smtp.gmail.com           (your mail provider)
//          SMTP_PORT      = 465
//          SMTP_USER      = your-mailbox@gmail.com
//          SMTP_PASS      = your-app-password        (Gmail: use an App Password, not your login)
//      If you leave the SMTP_* vars unset, results still log to the Railway console.

const express = require("express");
const router = express.Router();

let transporter = null;
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
} catch (e) {
  console.warn("nodemailer not available — results will log to console only.");
}

function buildText(r) {
  const lines = [];
  lines.push(`${r.student || "Student"} — Alberta Class 7 practice result`);
  lines.push(`Mode: ${r.mode}`);
  lines.push(`Score: ${r.score}/${r.total} (${r.percent}%) — ${r.passed ? "PASSED" : "did not pass"}`);
  lines.push(`Taken: ${new Date(r.takenAt || Date.now()).toLocaleString()}`);
  if (r.weakTopics && r.weakTopics.length) {
    lines.push("");
    lines.push("Weak areas: " + r.weakTopics.join(", "));
  }
  if (r.missedQuestions && r.missedQuestions.length) {
    lines.push("");
    lines.push("Questions missed:");
    r.missedQuestions.forEach((m, i) => {
      lines.push(`  ${i + 1}. [${m.topic}] ${m.question}`);
      lines.push(`       His answer: ${m.chosen}`);
      lines.push(`       Correct:    ${m.correct}`);
    });
  }
  return lines.join("\n");
}

router.post("/api/results", async (req, res) => {
  const r = req.body || {};
  const text = buildText(r);

  // Always log — this alone gives you access via Railway's Deploy Logs.
  console.log("\n===== QUIZ RESULT =====\n" + text + "\n=======================\n");

  // Try to email if configured.
  if (transporter && process.env.PARENT_EMAIL) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.PARENT_EMAIL,
        subject: `${r.student || "Student"}'s Class 7 result: ${r.score}/${r.total} (${r.passed ? "pass" : "fail"})`,
        text,
      });
      return res.json({ ok: true, emailed: true });
    } catch (e) {
      console.error("Email send failed:", e.message);
      return res.json({ ok: true, emailed: false, note: "logged only" });
    }
  }

  return res.json({ ok: true, emailed: false, note: "logged only" });
});

module.exports = router;
