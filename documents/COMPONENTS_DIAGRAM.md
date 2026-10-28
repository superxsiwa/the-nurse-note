# แผนภาพส่วนประกอบของระบบ (Components Diagram)
## โครงการ: The Nurse Note (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้อธิบายสถาปัตยกรรมเชิงส่วนประกอบ (Component Architecture) ของระบบ **The Nurse Note** โดยแบ่งตามระดับชั้นการทำงาน (Tiered Architecture) พร้อมระบบรักษาความปลอดภัยและการปกป้องข้อมูลส่วนบุคคล (PDPA Compliance)

---

### 1. แผนภาพภาพรวมส่วนประกอบระบบ (System Components Diagram)

```mermaid
graph TD
    %% Styling Classes
    classDef client fill:#EBF5FB,stroke:#2980B9,stroke-width:2px,color:#1B4F72;
    classDef gateway fill:#FEF9E7,stroke:#F39C12,stroke-width:2px,color:#7D6608;
    classDef core fill:#E8F8F5,stroke:#27AE60,stroke-width:2px,color:#145A32;
    classDef sec fill:#FDEDEC,stroke:#E74C3C,stroke-width:2px,color:#78281F;
    classDef ext fill:#F4ECF7,stroke:#8E44AD,stroke-width:2px,color:#512E5F;
    classDef data fill:#EAEDED,stroke:#7F8C8D,stroke-width:2px,color:#2C3E50;

    subgraph ClientLayer ["1. Frontend Presentation Layer (Client Application)"]
        UI_Bed ["🛏️ ผู้ป่วย (Shift & Bed Component)<br/>(เลือกวันที่/รอบเวร เช้า-บ่าย-ดึก, การ์ดเตียง, กรองเตียงเรียลไทม์, + เตียง)"]:::client
        UI_Work ["📝 งาน (Work & SBAR Component)<br/>(ข้อมูลเวร+เลือกเตียง, Cheat Sheet บนสุด, บันทึกงานเป็นรายการด้วยเสียง/พิมพ์, สร้างข้อมูลส่งเวร SBAR)"]:::client
        UI_Knowledge ["📚 ความรู้ (Knowledge Hub Component)<br/>(คลังเอกสาร, ถาม AI ติวเตอร์, เกร็ดความรู้ & กดหัวใจ)"]:::client
        UI_Quiz ["🎮 ฝึกหัด (Quiz & Growth Component)<br/>(ควิซประจำวัน & ทบทวนเคส, เลเวล & EXP พยาบาล)"]:::client
        UI_System ["⚙️ ระบบ (System Administration Component)<br/>(โปรไฟล์, จัดการผู้ใช้, จัดการความรู้/อนุมัติ FAQ & Train Vector, สร้างโจทย์ AI)"]:::client
        UI_Auth ["🔐 Auth & PIN Component<br/>(หน้า Login, สลับ PIN, จัดการสิทธิ์, Inactivity Auto-Lock 5 นาที)"]:::client
    end

    subgraph GatewayLayer ["2. API Gateway & Security Pipeline"]
        APIGateway ["🌐 HTTP/HTTPS Reverse Proxy<br/>(Static Serving, Routing, CORS)"]:::gateway
        AuthMiddleware ["🛡️ Auth & RBAC Guard<br/>(JWT Verify, Session, Role Check)"]:::gateway
        PDPASanitizer ["🛡️ PDPA Data Sanitizer<br/>(De-identification, Mask HN/Name)"]:::sec
        AuditLogger ["📝 Audit & Access Logger<br/>(บันทึก Log กิจกรรม 90 วัน)"]:::sec
    end

    subgraph CoreServiceLayer ["3. Application & Business Logic Services"]
        AuthService ["🔑 Identity & Access Service<br/>(User, PIN, Role & Permissions)"]:::core
        ShiftBedService ["📋 Shift & Bed Management Service<br/>(จัดเวร, วันที่/รอบเวร, กรองรายการเตียง, จัดการเตียง)"]:::core
        WorkActivityService ["📝 Work Activity Management Service<br/>(บันทึกรายการกิจกรรมการพยาบาล รายการเสียง/พิมพ์)"]:::core
        HandoverShareService ["📤 Handover Sharing Service<br/>(สร้างข้อความส่ง LINE, Export การ์ด SBAR)"]:::core
        VoiceSbarService ["🧠 SBAR Structuring Service<br/>(แปลงรายการงาน+ข้อมูลเตียงเป็น SBAR & Cheat Sheet)"]:::core
        SeniorPearlsService ["💬 Senior Pearls Service<br/>(จัดการโพสต์ทริค, Reaction)"]:::core
        KnowledgeHubService ["📖 Knowledge Hub Service<br/>(ค้นหาคู่มือ CCU, อนุมัติ FAQ, Sync Vector Database)"]:::core
        QuizService ["🎯 Clinical Quiz Service<br/>(สร้างโจทย์จาก AI/เคส/ทริค, ตรวจคำตอบ, คำนวณ EXP)"]:::core
        RuleParserEngine ["⚙️ Local Clinical Fallback Parser<br/>(Rule-based Regex & Lexicon)"]:::core
    end

    subgraph ExternalServices ["4. External AI & Cloud Services"]
        GeminiMultimodal ["🤖 Gemini Audio API<br/>(Speech-to-Text ถอดศัพท์แพทย์สำหรับรายการกิจกรรม)"]:::ext
        GeminiSbarLLM ["🤖 Gemini LLM Service<br/>(วิเคราะห์รายการทำงาน ➔ SBAR & Cheat Sheet)"]:::ext
        GeminiTutor ["🤖 Gemini Tutor Agent<br/>(ตอบข้อสงสัยการพยาบาลแบบ RAG-grounded)"]:::ext
        VectorDB ["🔍 Ward Vector Store<br/>(Embeddings สำหรับค้นหาและถาม-ตอบ AI)"]:::ext
    end

    subgraph DataStorageLayer ["5. Persistence & Storage Layer"]
        DB_Users [("👥 User & Role Store<br/>(ข้อมูลพยาบาล, PIN, สิทธิ์)")]:::data
        DB_Beds [("🛏️ Bed & Patient Store<br/>(ข้อมูลเตียง, อาการ, สายระบาย, ยาเสี่ยงสูง)")]:::data
        DB_Activities [("📝 Nursing Activities Store<br/>(รายการงานตามเตียง/เวร ทั้งเสียงและพิมพ์)")]:::data
        DB_Handovers [("📋 Handover Records Store<br/>(ประวัติ SBAR, Revision Log)")]:::data
        DB_Pearls [("💡 Senior Pearls Store<br/>(เกร็ดความรู้, หัวใจ/ขอบคุณ)")]:::data
        DB_Knowledge [("📚 CCU Clinical Repo & FAQ<br/>(คู่มือยา, EKG, ผลแล็บ, FAQ รอ/อนุมัติ)")]:::data
        DB_Audit [("🔒 Immutable Audit Store<br/>(Log ความปลอดภัยตาม PDPA)")]:::data
    end

    %% Client to Gateway
    UI_Auth --> APIGateway
    UI_Bed --> APIGateway
    UI_Work --> APIGateway
    UI_Knowledge --> APIGateway
    UI_Quiz --> APIGateway
    UI_System --> APIGateway

    %% Gateway Pipeline
    APIGateway --> AuthMiddleware
    AuthMiddleware --> AuditLogger
    AuthMiddleware --> PDPASanitizer

    %% Gateway to Core Services
    PDPASanitizer --> AuthService
    PDPASanitizer --> ShiftBedService
    PDPASanitizer --> WorkActivityService
    PDPASanitizer --> HandoverShareService
    PDPASanitizer --> VoiceSbarService
    PDPASanitizer --> SeniorPearlsService
    PDPASanitizer --> KnowledgeHubService
    PDPASanitizer --> QuizService

    %% Service to External AI (through PDPA Sanitization)
    WorkActivityService --> |Cleaned Audio| GeminiMultimodal
    VoiceSbarService --> |Aggregated Activities + Patient Data| GeminiSbarLLM
    VoiceSbarService -.-> |Offline/Fallback| RuleParserEngine
    KnowledgeHubService --> GeminiTutor
    KnowledgeHubService --> |Train Vector on FAQ Approve| VectorDB
    GeminiTutor --> |Similarity Search| VectorDB
    SeniorPearlsService --> |แปลงทริคเป็นโจทย์| QuizService

    %% Core Services to Data Layer
    AuthService --> DB_Users
    ShiftBedService --> DB_Beds
    WorkActivityService --> DB_Activities
    HandoverShareService --> DB_Beds
    VoiceSbarService --> DB_Handovers
    SeniorPearlsService --> DB_Pearls
    KnowledgeHubService --> DB_Knowledge
    QuizService --> DB_Knowledge
    AuditLogger --> DB_Audit
    QuizService --> DB_Knowledge
    AuditLogger --> DB_Audit
```

---

### 2. คำอธิบายรายละเอียดของแต่ละส่วนประกอบ (Component Descriptions)

#### 2.1 Presentation Layer (Frontend Components)
- **🛏️ ผู้ป่วย (Shift & Bed Component):**
  - แสดงหัวข้อ `⏱️ 1. ข้อมูลเวรปฏิบัติงาน` นอกการ์ด ควบคุมแบบ Inline รวม วันที่ (`🗓️`) และรอบเวร (`เช้า`, `บ่าย`, `ดึก`) ไว้ด้วยกัน
  - เมื่อเปลี่ยนวันที่หรือรอบเวร รายการเตียงจะอัปเดตแบบ Dynamic Reactive ทันที
  - ส่วน `🛏️ 2. รายการเตียงผู้ป่วย` แสดง Badge สรุปจำนวนเตียงคงเหลือ (เช่น `3 เตียง`), ปุ่มไอคอน `+` สำหรับเพิ่มเตียง และการ์ดแสดงสถานะความวิกฤต (Acuity Tag)
- **📝 งาน (Work & SBAR Component):**
  - **ส่วนที่ 1 ข้อมูลเวรปฏิบัติงาน & เตียงที่ดูแล:** ซิงก์วันที่/รอบเวร และ Dropdown เลือกเตียง เมื่อเปลี่ยนเตียงจะโหลดประวัติกิจกรรมของเตียงนั้นทันที
  - **ส่วนที่ 2 การทำงาน (Nursing Activities):** นำ `💡 สิ่งที่รุ่นพี่/แพทย์มักจะถามจี้ในเคสนี้ (Preceptor Cheat Sheet)` มาไว้ด้านบนสุดเพื่อให้พยาบาลอ่านเตรียมความพร้อมก่อนบันทึกงาน ถัดมาเป็นฟอร์มบันทึกงานแบบ Toggle (เปิด/ปิดด้วยปุ่ม `➕ เพิ่มรายการ` และซ่อนอัตโนมัติเมื่อกดบันทึก) รองรับทั้งการพิมพ์และบันทึกเสียงแปลงเป็นข้อความ แสดงรายการกิจกรรมการพยาบาลแบบแยกรายการ (Itemized Activities) พร้อมเวลาและที่มา (🎙️ เสียง / ⌨️ พิมพ์)
  - **ส่วนที่ 3 การส่งเวร (Handover SBAR):** ปุ่ม `✨ สร้างข้อมูลส่งเวร (จากรายการทำงาน + ข้อมูลผู้ป่วย)` รวบรวมข้อมูลแปลงเป็น SBAR การ์ด พร้อมปุ่มคัดลอกส่งไลน์แบบ One-Click
- **📚 ความรู้ (Knowledge Hub Component):** แบ่งเป็น 3 แท็บย่อยชัดเจน: `📚 คลังเอกสาร CCU`, `🤖 ถาม AI ติวเตอร์`, `💡 เกร็ดความรู้ (Pearls)` พร้อมปุ่มส่งหัวใจขอบคุณ
- **🎮 ฝึกหัด (Quiz & Growth Component):** ระบบทำแบบทดสอบประจำวันและควิซฝึกหัดตามหมวดหมู่ คำนวณแต้ม EXP, อัปเลเวล, และสถิติความแม่นยำ
- **⚙️ ระบบ (System Administration Component):** แบ่งเป็น 4 แท็บย่อย: `👤 โปรไฟล์พยาบาล`, `👥 ผู้ใช้งาน (Admin)`, `📖 จัดการความรู้` (จัดการเอกสาร, ตรวจสอบและอนุมัติ FAQ พยาบาลพร้อมปุ่ม Train Vector สำหรับ RAG), `🎯 สร้างโจทย์ (Quiz Generator)`
- **🔐 Auth & Access Component:** หน้าจอยืนยันตัวตน Email/Password หรือ Social Login, Quick PIN 4 หลัก, ระบบล็อกหน้าจออัตโนมัติเมื่อพักเครื่อง 5 นาที (Inactivity Auto-Lock) พร้อม Keypad ปลดล็อกด่วน

#### 2.2 Security & Gateway Layer
- **🌐 API Gateway / Reverse Proxy:** รับ Request จาก Client, จัดการเส้นทาง URL, จัดการ CORS และ Static Files
- **🛡️ Auth & RBAC Guard:** ตรวจสอบ Token (JWT), สิทธิ์การเข้าถึงตามบทบาท (Junior, Senior, Charge Nurse, Admin)
- **🛡️ PDPA Data Sanitizer:** ตัดและปิดบังข้อมูลที่ระบุตัวตน (เช่น ชื่อ-นามสกุล, เลขประจำตัวประชาชน, เลข HN) ก่อนส่งต่อไปยังบริการภายนอก
- **📝 Audit & Access Logger:** บันทึกการเข้าใช้งาน การส่งต่อข้อมูล และเหตุการณ์สำคัญลงใน Log ตามข้อกำหนดกฎหมาย PDPA อย่างน้อย 90 วัน

#### 2.3 Business Logic & Service Layer
- **🔑 Identity & Access Service:** ดูแลการยืนยันตัวตน, จัดการ Hash รหัสผ่านและ Quick PIN, ตรวจสอบสถานะ Inactivity Session
- **📋 Shift & Bed Management Service:** ประมวลผลสถานะเตียงในวอร์ด กรองเตียงตามวันที่และรอบเวรแบบเรียลไทม์
- **📝 Work Activity Management Service:** จัดการบันทึก ลบ หรือแก้ไขรายการกิจกรรมการพยาบาล (Nursing Activity Items) ตามเตียงและเวร
- **📤 Handover Sharing Service:** จัดรูปแบบข้อความส่งต่อเตียงสำหรับแชร์ลง LINE, สร้างสรุปส่งเวรประจำรอบ (Shift Summary Sheet)
- **🧠 SBAR Structuring Service:** ประสานงานกับ AI เพื่อแปลงรายการกิจกรรมที่บันทึกและข้อมูลพื้นฐานของเตียงเป็นโครงสร้าง SBAR พร้อมชุดคำถาม Cheat Sheet
- **⚙️ Local Clinical Fallback Parser:** โมดูลสำรองทำงานด้วยกฎทางคลินิก (Rule-based) ทำงานได้ทันทีเมื่อไม่มีอินเทอร์เน็ต
- **💬 Senior Pearls Service:** ดูแลการบันทึก, แก้ไข, ปักหมุดทริคของรุ่นพี่ และนับยอดหัวใจ
- **📖 Knowledge Hub Service:** จัดการคลังเอกสาร ตรวจสอบอนุมัติ FAQ และส่งเวกเตอร์เข้า Vector DB เพื่อให้ AI ตอบอย่างแม่นยำ
- **🎯 Quiz Service:** กลไกสร้างโจทย์ควิซด้วย AI หรือแปลงจากทริค/เคสคนไข้ พร้อมตรวจคำตอบและคำนวณ EXP

#### 2.4 External AI & Cloud Services
- **🤖 Gemini Audio API:** โมเดลประมวลผลเสียงทางการแพทย์ แปลงเสียงพูดเป็นข้อความรายกิจกรรม
- **🤖 Gemini SBAR & Tutor:** วิเคราะห์ข้อมูลทางคลินิกและรายการงานเป็น SBAR, ออกโจทย์ควิซ และตอบข้อสงสัยการพยาบาล
- **🔍 Ward Vector Store:** คลัง Vector Embeddings สำหรับ RAG เพื่อให้ AI ติวเตอร์อ้างอิงคู่มือ CCU และ FAQ ที่ผ่านการอนุมัติแล้วอย่างปลอดภัย

#### 2.5 Data Storage Layer
- **DB_Users:** จัดเก็บข้อมูลผู้ใช้งาน, รหัสผ่านแบบเข้ารหัส, สิทธิ์ RBAC
- **DB_Beds:** จัดเก็บข้อมูลเตียง, อาการ, สายระบาย, ยาเสี่ยงสูง
- **DB_Activities:** จัดเก็บรายการกิจกรรมการพยาบาล (Time, Description, Source) ผูกกับเตียงและรอบเวร
- **DB_Handovers:** จัดเก็บประวัติการสร้างรายงาน SBAR
- **DB_Pearls & DB_Knowledge:** ฐานข้อมูลเกร็ดความรู้ของวอร์ด และคู่มือทางคลินิก รวมถึง FAQ ที่ผ่านการอนุมัติ
- **DB_Audit:** ฐานข้อมูล Log ความปลอดภัย สำหรับตรวจสอบย้อนหลังตามมาตรฐาน PDPA (เก็บไม่น้อยกว่า 90 วัน)

---

*แผนภาพและโครงสร้างส่วนประกอบนี้ ออกแบบเพื่อให้สอดรับกับข้อกำหนด [REQUIREMENT_AND_SCOPE.md](REQUIREMENT_AND_SCOPE.md) อย่างสมบูรณ์*
