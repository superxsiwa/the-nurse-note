const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Read GEMINI_API_KEY from environment or .env file
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/GEMINI_API_KEY=(.+)/);
      if (match) GEMINI_API_KEY = match[1].trim();
    }
  } catch (e) {
    console.error('Error reading .env:', e.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check / API status endpoint
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({
      hasApiKey: !!GEMINI_API_KEY,
      model: 'gemini-3.5-flash-lite / fallback'
    }));
    return;
  }

  // API 1: Audio Transcription via Gemini Multimodal API
  if (req.url === '/api/transcribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { audioBase64, mimeType } = JSON.parse(body || '{}');
        if (!audioBase64 || !GEMINI_API_KEY) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({
            success: false,
            fallbackText: 'บันทึกการพยาบาลจากเสียง: ผู้ป่วยอาการคงที่ สัญญาณชีพอยู่ในเกณฑ์ปกติ ดูแลตามมาตรฐานวิชาชีพ'
          }));
          return;
        }

        const transcription = await callGeminiAudioTranscribe(audioBase64, mimeType || 'audio/webm');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, text: transcription }));
      } catch (err) {
        console.error('Transcription error:', err.message);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({
          success: false,
          fallbackText: 'บันทึกการพยาบาล: ผู้ป่วยสัญญาณชีพคงที่ ดูแลอาการตามแผนการรักษา'
        }));
      }
    });
    return;
  }

  // API 2: Parse Clinical Note to SBAR via Gemini AI
  if (req.url === '/api/parse-note' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { text, bed } = JSON.parse(body || '{}');
        const targetBed = bed || 'ไม่ระบุเตียง';

        if (GEMINI_API_KEY && text && text.trim()) {
          try {
            const aiSbar = await callGeminiSbarParser(text, targetBed);
            if (aiSbar && aiSbar.s) {
              res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
              res.end(JSON.stringify({ success: true, sbar: aiSbar, aiPowered: true }));
              return;
            }
          } catch (aiErr) {
            console.error('Gemini API call failed, falling back to local rule-based:', aiErr.message);
          }
        }

        // Fallback to local clinical parser
        const sbar = parseMedicalSpeech(text || '', targetBed);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, sbar, aiPowered: false }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static File Serving
  let reqUrl = req.url.split('?')[0];
  let filePath;
  if (reqUrl.startsWith('/prototype')) {
    let subPath = reqUrl.replace('/prototype', '');
    if (subPath === '' || subPath === '/') subPath = '/index.html';
    filePath = path.join(__dirname, 'prototype', subPath);
  } else {
    filePath = path.join(PUBLIC_DIR, reqUrl === '/' ? 'index.html' : reqUrl);
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

// Gemini AI Call for SBAR Note structuring
function callGeminiSbarParser(clinicalText, bed) {
  return new Promise((resolve, reject) => {
    const prompt = `คุณคือพยาบาลวิชาชีพระดับเชี่ยวชาญ (Charge Nurse / Nurse Specialist) ประจำหอผู้ป่วย
หน้าที่ของคุณคือ วิเคราะห์ข้อมูลการดูแลผู้ป่วยสำหรับ "${bed}" จากข้อความ/คำพูดต่อไปนี้:
"""
${clinicalText}
"""

กรุณาสรุปและจัดโครงสร้างส่งเวรตามมาตรฐาน SBAR ทางการพยาบาลอย่างกระชับ ชัดเจน ถูกต้องตามหลักวิชาชีพแพทย์และพยาบาล:
- Situation (S): สรุปสถานการณ์หลัก อาการสำคัญ หรือเหตุผลที่ต้องส่งเวรในรอบนี้
- Background (B): ประวัติสำคัญ อาการก่อนหน้า สัญญาณชีพ (BP, PR, RR, Temp, SpO2) หรือผลตรวจที่เกี่ยวข้อง
- Assessment (A): การประเมินทางคลินิก การพยาบาลที่ให้ไปแล้ว ยา/สารน้ำที่บริหาร
- Recommendation (R): แผนการพยาบาลต่อเนื่อง คำสั่งแพทย์ที่ต้องติดตาม หรือสิ่งที่ต้องฝากเวรถัดไปเฝ้าระวัง

ให้ตอบกลับเป็น JSON format เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "s": "ข้อความ Situation",
  "b": "ข้อความ Background",
  "a": "ข้อความ Assessment",
  "r": "ข้อความ Recommendation"
}`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    // Try models: gemini-3.5-flash-lite, fallback to gemini-2.5-flash / gemini-1.5-flash
    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
    
    function tryModel(index) {
      if (index >= modelsToTry.length) {
        return reject(new Error('All Gemini models exhausted'));
      }
      const model = modelsToTry[index];
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              const textOutput = parsed.candidates[0].content.parts[0].text;
              const sbarJson = JSON.parse(textOutput);
              resolve({
                s: sbarJson.s || sbarJson.Situation || '',
                b: sbarJson.b || sbarJson.Background || '',
                a: sbarJson.a || sbarJson.Assessment || '',
                r: sbarJson.r || sbarJson.Recommendation || '',
                rawText: clinicalText
              });
            } catch (parseErr) {
              reject(parseErr);
            }
          } else {
            console.warn(`Model ${model} returned status ${res.statusCode}, trying next...`);
            tryModel(index + 1);
          }
        });
      });

      req.on('error', (e) => tryModel(index + 1));
      req.on('timeout', () => { req.destroy(); tryModel(index + 1); });
      req.write(postData);
      req.end();
    }

    tryModel(0);
  });
}

// Gemini AI Call for Speech Transcription from Audio Base64
function callGeminiAudioTranscribe(audioBase64, mimeType) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{
        parts: [
          {
            text: "คุณเป็นพยาบาลวิชาชีพ กรุณาถอดเสียงภาษาไทยจากคลิปบันทึกเสียงนี้เป็นข้อความภาษาไทยที่ถูกต้อง รวมถึงคำศัพท์การแพทย์ (เช่น BP, SpO2, PR, DTX, NSS, IV, Med, แพทย์, หนาวสั่น, ไข้) ให้เขียนออกมาเป็นข้อความต่อเนื่องที่อ่านง่าย ไม่ต้องใส่คำอธิบายเพิ่มเติม"
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1
      }
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            const textOutput = parsed.candidates[0].content.parts[0].text;
            resolve(textOutput.trim());
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Transcribe failed with HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Transcribe timeout')); });
    req.write(postData);
    req.end();
  });
}

// Fallback rule-based clinical parser
function parseMedicalSpeech(rawText, bed) {
  let s = `${bed}: รับรายงานเหตุการณ์ระหว่างเวร`;
  let b = "สัญญาณชีพและอาการทั่วไปทรงตัว";
  let a = "ดูแลตามแผนการรักษา";
  let r = "ติดตามอาการอย่างต่อเนื่องในเวรถัดไป";

  if (/bp.*(ดรอป|ตก|ต่ำ)|ความดัน.*(ดรอป|ตก|ต่ำ)/i.test(rawText)) {
    s = `${bed}: มีภาวะความดันโลหิตลดต่ำลง (Hypotension / BP Drop)`;
  } else if (/เหนื่อย|หอบ|dyspnea|o2.*(ตก|ดรอป)/i.test(rawText)) {
    s = `${bed}: ผู้ป่วยมีอาการเหนื่อย หายใจเร็ว หรือ SpO2 ลดต่ำลง`;
  } else if (/ไข้|fever|t.*(สูง|38|39)/i.test(rawText)) {
    s = `${bed}: ผู้ป่วยมีไข้ อุณหภูมิกายสูง`;
  }

  const bpMatch = rawText.match(/(\d{2,3}\/\d{2,3})/g);
  if (bpMatch && bpMatch.length > 0) {
    b = `บันทึกสัญญาณชีพ BP: ${bpMatch.join(', ')} mmHg`;
  }

  const o2Match = rawText.match(/(o2\s*sat|spo2|sat)\s*(\d{2,3})%?/i);
  if (o2Match) {
    b += ` | SpO2: ${o2Match[2]}%`;
  }

  const actionList = [];
  if (/โหลด.*nss|nss.*(โหลด|500|1000)/i.test(rawText)) {
    actionList.push("รายงานแพทย์ ได้รับคำสั่ง IV Fluid Loading (NSS)");
  }
  if (/cannula|mask|oxygen|ออกซิเจน/i.test(rawText)) {
    actionList.push("ปรับเพิ่ม/ดูแลการให้ออกซิเจนบำบัด");
  }
  if (/dtx|เจาะน้ำตาล/i.test(rawText)) {
    actionList.push("เจาะตรวจ DTX ติดตามระดับน้ำตาลในเลือด");
  }
  if (actionList.length > 0) {
    a = actionList.join(", ");
  } else if (rawText) {
    a = `การพยาบาล: ${rawText.slice(0, 120)}...`;
  }

  const planList = [];
  if (/urine|ปัสสาวะ/i.test(rawText)) {
    planList.push("ติดตาม Urine Output ทุก 1-2 ชั่วโมง");
  }
  if (/เวรดึก|เวรถัดไป|ฝาก/i.test(rawText)) {
    planList.push("ฝากเวรถัดไปประเมินสัญญาณชีพซ้ำและเฝ้าระวังอาการเปลี่ยนแปลง");
  }
  if (planList.length > 0) {
    r = planList.join(", ");
  }

  return { s, b, a, r, rawText };
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`The Nurse Note running on http://localhost:${PORT} (Gemini AI: ${GEMINI_API_KEY ? 'Active' : 'Offline/Fallback'})`);
});
