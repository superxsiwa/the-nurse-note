# แผนภาพลำดับขั้นตอนการทำงาน (Sequence Diagram)
## โครงการ: The Nurse Note (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้แสดงลำดับการส่งข้อมูลระหว่างวัตถุ (Sequence of Interactions) ใน 4 กระบวนการหลักของระบบ:
1. **Flow 0: การเข้าสู่ระบบด้วย Email & Password ➡️ ปลดล็อกด่วนด้วย Quick PIN (Authentication Flow)**
2. **Flow 1: การบันทึกเสียง ➡️ กรอง PDPA ➡️ สร้างรายงาน SBAR + Cheat Sheet ดักคำถาม**
3. **Flow 2: การแชร์สรุปข้อมูลเตียงคนไข้ให้เพื่อน (Handover Sharing via LINE / Clipboard)**
4. **Flow 3: การเผยแพร่เกร็ดความรู้จากรุ่นพี่ ➡️ แปลงเป็นโจทย์ควิซ ➡️ รุ่นน้องฝึกทำข้อสอบ**

---

### Flow 0: การลงทะเบียน, เข้าสู่ระบบ (Email/Social) ➡️ ปลดล็อกด่วนด้วย Quick PIN (Auth & Registration Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as 👩‍⚕️ พยาบาลผู้ใช้งาน (Nurse)
    participant UI as 📱 Auth, Register & PIN UI
    participant Gateway as 🌐 API Gateway & RBAC Guard
    participant AuthSvc as 🔑 Identity & Auth Service
    participant UserDB as 💾 User Database
    participant Audit as 🔒 Audit Logger

    %% Part 1: Registration with Confirm Quick PIN
    opt การลงทะเบียนพยาบาลใหม่ (New Nurse Registration)
        Nurse->>UI: 1. ป้อนชื่อ-นามสกุล, รหัสพนักงาน, อีเมล, เลือกวอร์ด, รหัสผ่าน
        Nurse->>UI: 2. ตั้งรหัส Quick PIN (4 หลัก) + ยืนยันรหัส Confirm PIN (4 หลัก)
        Nurse->>UI: 3. ติ๊กยินยอมรับข้อกำหนด PDPA และกด "ยืนยันการลงทะเบียน"
        UI->>UI: 4. ตรวจสอบ Quick PIN == Confirm PIN (ทั้งสองช่องตรงกัน)
        UI->>Gateway: 5. POST /api/auth/register { fullName, staffId, email, ward, password, pin, deviceId }
        Gateway->>AuthSvc: 6. Hash รหัสผ่าน (Argon2) + Hash PIN + ผูก DeviceId
        AuthSvc->>UserDB: 7. บันทึกข้อมูลพยาบาลใหม่
        UserDB-->>AuthSvc: 8. บันทึกสำเร็จ
        AuthSvc-->>Gateway: 9. ส่งผลลงทะเบียนสำเร็จ + Auto-issue Session
        Gateway-->>UI: 10. แจ้งเตือนสำเร็จและเข้าสู่ระบบทันที
    end

    %% Part 2: Standard Login or Social Login
    alt เข้าสู่ระบบด้วย Email & Password หรือ Social Login
        Nurse->>UI: 11. ป้อน Email + Password (หรือกดปุ่ม Google Sign-In)
        UI->>Gateway: 12. POST /api/auth/login หรือ POST /api/auth/social-callback
        Gateway->>Audit: 13. บันทึก Attempt Log (IP, User, DeviceId, Timestamp)
        Gateway->>AuthSvc: 14. ตรวจสอบข้อมูลประจำตัว + DeviceId
        AuthSvc->>UserDB: 15. ดึงข้อมูล User และ Device Binding
        alt ข้อมูลถูกต้อง & เครื่องตรงตามเงื่อนไข BYOD
            AuthSvc-->>Gateway: 16. สร้าง JWT Session Token + User Role
            Gateway->>Audit: 17. Log Success: Personal Device Login Succeeded
            Gateway-->>UI: 18. ส่ง Session Token + ข้อมูลพยาบาล
            UI-->>Nurse: 19. แสดงหน้าต่างจัดเวรและเตียงที่ดูแล (Shift & Bed Roster)
        else ข้อมูลไม่ถูกต้อง
            AuthSvc-->>Gateway: Login Failed
            Gateway-->>UI: แจ้งเตือนข้อผิดพลาด
        end
    end

    %% Part 3: 5-Minute Inactivity Auto-Lock & Quick PIN Unlock
    Note over Nurse, UI: วางเครื่องทิ้งไว้เกิน 5 นาที (Inactivity Timeout) หรือกดทดสอบจำลอง
    UI->>UI: 20. ตรวจพบ Inactivity ครบ 5 นาที ➔ เด้ง Quick PIN Keypad Modal ล็อกหน้าจอทันที
    Nurse->>UI: 21. กดรหัส Quick PIN 4 หลักบน Keypad
    UI->>UI: 22. ตรวจสอบรหัส PIN ตรงกับที่ลงทะเบียนไว้
    alt PIN ถูกต้อง
        UI-->>Nurse: 23. ปลดล็อกทันที กลับสู่หน้าจอการทำงานเดิมโดยไม่ต้องกรอกรหัสผ่านยาว
    else PIN ไม่ถูกต้อง
        UI-->>Nurse: 24. แจ้งเตือนรหัส PIN ไม่ถูกต้อง และสั่นเตือน
    end
```

---

### Flow 1: การดูคำถามดัก ➡️ บันทึกกิจกรรมการทำงาน (เสียง/พิมพ์) ➡️ สร้างรายงาน SBAR + Cheat Sheet ดักคำถาม

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as 👩‍⚕️ พยาบาลรุ่นน้อง (Junior Nurse)
    participant UI as 📱 Work Screen UI (หน้างาน)
    participant Gateway as 🛡️ API Gateway & Sanitizer (PDPA)
    participant AudioAPI as 🤖 Gemini Audio API (STT)
    participant WorkSvc as 📝 Work Activity Service
    participant SbarSvc as 🧠 SBAR Structuring Service
    participant GeminiLLM as 🤖 Gemini LLM Engine
    participant Fallback as ⚙️ Rule-based Parser (Fallback)
    participant DB as 💾 Work & Handover Database
    participant Audit as 🔒 Audit Logger

    %% Step 1: Bed Selection & Cheat Sheet Review
    Nurse->>UI: 1. เลือกเตียงที่ดูแล (เช่น เตียง 2 - STEMI)
    UI->>UI: 2. แสดง "💡 สิ่งที่รุ่นพี่/แพทย์มักจะถามจี้ในเคสนี้" ด้านบนสุด เพื่อทบทวนก่อนปฏิบัติงาน
    
    %% Step 2: Add Nursing Activity via Voice or Text
    Nurse->>UI: 3. กดปุ่ม "➕ เพิ่มรายการ" (ฟอร์มบันทึกเปิดออก)
    alt บันทึกกิจกรรมด้วยเสียง (Voice Note)
        Nurse->>UI: 4a. กดไอคอนไมค์ 🎙️ และพูดบันทึกกิจกรรม (เช่น "10:30 ปรับ NTG เป็น 15 mcg/min ตาม BP ล่าสุด")
        UI->>Gateway: 5a. ส่ง Audio Stream (Base64) + BedId
        Gateway->>AudioAPI: 6a. ส่งเสียงถอดความเป็นข้อความคลินิก
        AudioAPI-->>Gateway: 7a. ข้อความกิจกรรมที่ถอดความได้
        Gateway->>Gateway: 8a. 🛡️ PDPA Filter: ตรวจจับ & Masking ชื่อ/HN ออก
        Gateway-->>UI: 9a. กรอกข้อความลงช่องพิมพ์ให้อัตโนมัติ พร้อมสัญลักษณ์ 🎙️
    else พิมพ์บันทึกข้อความ (Text Note)
        Nurse->>UI: 4b. พิมพ์ข้อความกิจกรรมลงในช่องพิมพ์ ⌨️
    end

    Nurse->>UI: 10. กดปุ่ม "💾 บันทึก" (ฟอร์มบันทึกปิดตัวลงทันที)
    UI->>WorkSvc: 11. บันทึกรายการกิจกรรมใหม่ (BedId, Time, Text, Source)
    WorkSvc->>DB: 12. Insert Nursing Activity Item
    WorkSvc-->>UI: 13. แสดงรายการกิจกรรมที่อัปเดตในตารางกิจกรรม

    %% Step 3: Generate SBAR
    Nurse->>UI: 14. กดปุ่ม "✨ สร้างข้อมูลส่งเวร (จากรายการทำงาน + ข้อมูลผู้ป่วย)"
    UI->>Gateway: 15. รวบรวมข้อมูลคนไข้ + รายการกิจกรรมทั้งหมดในเวร
    Gateway->>Audit: 16. บันทึก Audit Log (User, Bed, Action: GenerateHandover)
    Gateway->>SbarSvc: 17. ส่งรายการกิจกรรมที่ Cleaned แล้ว
    
    SbarSvc->>GeminiLLM: 18. Prompt: สรุปเป็นโครงสร้าง SBAR + สกัด Cheat Sheet คำถามเตรียมตัวส่งเวร
    alt Gemini AI ตอบกลับปกติ
        GeminiLLM-->>SbarSvc: 19. JSON: { S, B, A, R, preceptorQuestions }
    else Gemini Offline
        SbarSvc->>Fallback: 20. ใช้ Rule-based Regex สกัดค่า BP, HR, O2, แผนยา
        Fallback-->>SbarSvc: 21. Fallback SBAR Object
    end

    SbarSvc->>DB: 22. บันทึก SBAR Note ลงฐานข้อมูล (Revision)
    SbarSvc-->>UI: 23. ส่งผลลัพธ์ SBAR พร้อมปุ่ม "คัดลอกส่งเวร (LINE)"
    UI-->>Nurse: 24. แสดงการ์ด SBAR และปุ่มคัดลอก น้องอ่านทบทวนก่อนเดินไปส่งเวร
```

---

### Flow 2: การแชร์สรุปข้อมูลเตียงคนไข้ให้เพื่อน (Handover Sharing via LINE / Clipboard)

```mermaid
sequenceDiagram
    autonumber
    actor NurseA as 👩‍⚕️ พยาบาลส่งเวร (Nurse A)
    participant UI as 📱 Bed Management UI
    participant ShareSvc as 📤 Handover Share Service
    participant DB as 💾 Bed & Handover DB
    participant Clipboard as 📋 OS Clipboard / LINE App
    actor NurseB as 👩‍⚕️ พยาบาลรับเวร (Nurse B / Peer)

    NurseA->>UI: 1. กดปุ่ม "แชร์สรุปเตียงนี้ให้เพื่อน" (Share Bed)
    UI->>ShareSvc: 2. Request สรุปข้อมูลเตียง (BedId, CurrentShift)
    ShareSvc->>DB: 3. ดึงประวัติคนไข้ + สัญญาณชีพ + ยาเสี่ยงสูง + SBAR ล่าสุด
    DB-->>ShareSvc: 4. ข้อมูลครบถ้วน
    
    ShareSvc->>ShareSvc: 5. 🛡️ จัดรูปแบบข้อความ Clean ข้อความตาม PDPA (ไม่มีชื่อ/HN)
    ShareSvc-->>UI: 6. ข้อความจัดฟอร์แมตสำเร็จ (Markdown / Plaintext)
    
    UI->>Clipboard: 7. คัดลอกลง Clipboard หรือเรียก LINE URL Scheme
    Clipboard-->>NurseA: 8. แสดงแจ้งเตือน "คัดลอกข้อความส่งเวรเรียบร้อย!"
    
    NurseA->>NurseB: 9. วางข้อความส่งในห้องแชท LINE เวรพยาบาล
    NurseB-->>NurseB: 10. อ่านสรุปเตรียมรับช่วงดูแลต่อได้ทันที
```

---

### Flow 3: การแชร์เกร็ดความรู้ / อนุมัติ FAQ ➡️ Train Vector RAG ➡️ แปลงเป็นโจทย์ควิซ ➡️ รุ่นน้องฝึกทำข้อสอบ

```mermaid
sequenceDiagram
    autonumber
    actor Senior as 👩‍⚕️ พยาบาลรุ่นพี่ / หัวหน้าเวร (Senior / Charge Nurse)
    participant UI_System as ⚙️ System & Knowledge UI (หน้าระบบ)
    participant PearlSvc as 💡 Pearls & Knowledge Service
    participant VectorDB as 🔍 Ward Vector Store (RAG)
    participant QuizEngine as 🎯 Quiz Quest Engine
    participant DB as 💾 Pearls, Knowledge & Quiz DB
    actor Junior as 👩‍⚕️ พยาบาลรุ่นน้อง (Junior Nurse)
    participant UI_Junior as 📱 Knowledge & Quiz UI (หน้าความรู้/ฝึกหัด)

    %% Part 1: Senior Shares Pearl & Approves FAQ
    Senior->>UI_System: 1. เขียนทริค "การระวังความดันตกตอนดริป NTG"
    UI_System->>PearlSvc: 2. บันทึกเกร็ดความรู้ลงคลังวอร์ด
    PearlSvc->>DB: 3. บันทึก Senior Pearl (หมวด High Alert Drug)

    Senior->>UI_System: 4. ตรวจสอบรายการ "คำถามพยาบาลที่รออนุมัติ (Pending FAQ)"
    Senior->>UI_System: 5. กดปุ่ม "อนุมัติ & Train Vector" (Approve & Sync)
    UI_System->>PearlSvc: 6. อัปเดตสถานะ FAQ เป็น Approved
    PearlSvc->>VectorDB: 7. ส่ง Embeddings เข้าสู่ Vector Store ของวอร์ดทันที
    VectorDB-->>UI_System: 8. แจ้งผล: อัปเดต Vector Database สำเร็จ (AI ติวเตอร์พร้อมตอบคำถามนี้)

    %% Part 2: Quiz Generation
    PearlSvc->>QuizEngine: 9. ส่ง Trigger สร้างข้อสอบจากเกร็ดความรู้และ FAQ นี้
    QuizEngine->>QuizEngine: 10. AI สกัดเป็นคำถาม Multiple Choice 4 ตัวเลือก พร้อม Rationale
    QuizEngine->>DB: 11. บันทึกชุดข้อสอบลงธนาคารควิซ (Quiz Bank)

    %% Part 3: Junior Studies & Quizzes
    Note over Junior, UI_Junior: ในเวลาว่างระหว่างเวร หรือช่วงทบทวนความรู้
    Junior->>UI_Junior: 12. เปิดแท็บ "💡 เกร็ดความรู้" เพื่ออ่านทริคประจำวันจากพี่ๆ
    UI_Junior->>DB: 13. ดึงทริคของรุ่นพี่มาแสดง
    DB-->>UI_Junior: 14. แสดงการ์ดทริค NTG
    Junior->>UI_Junior: 15. แตะปุ่ม "ส่งหัวใจขอบคุณพี่ ❤️"
    UI_Junior->>DB: 16. อัปเดตยอด Reaction ให้รุ่นพี่

    Junior->>UI_Junior: 17. เปิดเมนู "ฝึกหัด" และเริ่มเล่นเกมควิซประจำวัน (Daily Quiz)
    UI_Junior->>QuizEngine: 18. ดึงคำถามที่สร้างจากทริค NTG และเคสในวอร์ด
    QuizEngine-->>UI_Junior: 19. แสดงโจทย์และตัวเลือก
    Junior->>UI_Junior: 20. เลือกคำตอบ
    UI_Junior->>QuizEngine: 21. ส่งคำตอบตรวจ
    QuizEngine-->>UI_Junior: 22. เฉลยพร้อมคำอธิบายให้กำลังใจ + มอบแต้ม 50 EXP
    UI_Junior-->>Junior: 23. เลเวลพยาบาลอัปเกรด มั่นใจขึ้น!
```
```
