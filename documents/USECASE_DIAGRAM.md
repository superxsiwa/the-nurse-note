# แผนภาพยูสเคส (Use Case Diagram)
## โครงการ: The Nurse Note (เพื่อนคู่คิดและพี่เลี้ยงพยาบาลอัจฉริยะ)

เอกสารนี้แสดงขอบเขตปฏิสัมพันธ์ระหว่างผู้ใช้งานกลุ่มต่างๆ (Actors) กับฟังก์ชันการทำงานหลักของระบบ The Nurse Note ภายใต้การควบคุมสิทธิ์ (RBAC) และการคุ้มครองข้อมูลส่วนบุคคล (PDPA)

---

### 1. แผนภาพ Use Case Diagram (Mermaid Graph)

```mermaid
graph LR
    %% Actors
    subgraph Actors ["กลุ่มผู้ใช้งาน (Actors)"]
        JN["👩‍⚕️ พยาบาลรุ่นน้อง<br/>(Junior Nurse)"]
        SN["👩‍⚕️ พยาบาลรุ่นพี่/พรีเซปเตอร์<br/>(Senior/Preceptor)"]
        CN["🩺 หัวหน้าเวร/ตึก<br/>(Charge Nurse)"]
        AD["🛡️ ผู้ดูแลระบบ<br/>(Admin)"]
        AI["🤖 บริการ Gemini AI<br/>(External AI Service)"]
    end

    %% Use Cases
    subgraph CoreSystem ["ระบบ The Nurse Note (System Boundary)"]
        %% Group 1: Auth, Register & Shift
        UC_Auth(["UC01: ลงทะเบียน, ล็อกอิน (Email/Social) & ปลดล็อก Quick PIN"])
        UC_Shift(["UC02: จัดการรอบเวร (วันที่/รอบเวร) & กรองเตียงอัตโนมัติ"])
        UC_BedStatus(["UC03: จัดการเตียงผู้ป่วย (เพิ่ม ลบ แก้ไข ข้อมูลเตียง & ยาเสี่ยงสูง)"])
        
        %% Group 2: Work & Handover SBAR
        UC_RecordWork(["UC04: บันทึกรายการทำงาน (พิมพ์ หรือ บันทึกจากเสียง)"])
        UC_CheatSheet(["UC05: ดูคำถามดักคอของรุ่นพี่ (Cheat Sheet ก่อนเริ่มงาน)"])
        UC_SbarGen(["UC06: สร้างข้อมูลส่งเวร SBAR อัจฉริยะ"])
        UC_ShareLine(["UC07: สรุปและแชร์เตียงคนไข้ให้เพื่อน/ส่ง LINE"])
        
        %% Group 3: Knowledge Hub
        UC_KnowledgeRepo(["UC08: ค้นคว้าคลังคู่มือ CCU (ยา, EKG, อุปกรณ์, Lab)"])
        UC_AskTutor(["UC09: สนทนาถาม-ตอบพี่เลี้ยง AI (Safe Nurse Tutor)"])
        UC_Pearls(["UC10: อ่าน/แบ่งปันเกร็ดความรู้พยาบาล & ส่งหัวใจ"])
        
        %% Group 4: Quiz & Growth
        UC_PlayQuiz(["UC11: ทำควิซทบทวนเคส & สะสม EXP"])
        UC_CreateQuiz(["UC12: สร้างโจทย์ข้อสอบสำหรับการฝึกหัด (Quiz Generator)"])
        
        %% Group 5: Admin & Governance
        UC_ApproveFaq(["UC13: รุ่นพี่ Approve FAQ & สร้าง Vector Train AI"])
        UC_ManageUsers(["UC14: จัดการผู้ใช้งานระบบ (Admin เท่านั้น)"])
        UC_AuditLog(["UC15: ตรวจสอบประวัติความปลอดภัย (Audit Log)"])
        UC_Sanitize(["UC16: กรองข้อมูลระบุตัวตนคนไข้ (PDPA Filter)"])
    end

    %% Relations for Junior Nurse
    JN --> UC_Auth
    JN --> UC_Shift
    JN --> UC_BedStatus
    JN --> UC_RecordWork
    JN --> UC_CheatSheet
    JN --> UC_SbarGen
    JN --> UC_ShareLine
    JN --> UC_KnowledgeRepo
    JN --> UC_AskTutor
    JN --> UC_Pearls
    JN --> UC_PlayQuiz

    %% Relations for Senior Nurse (Inherits Junior abilities + Mentoring)
    SN --> UC_Auth
    SN --> UC_Shift
    SN --> UC_BedStatus
    SN --> UC_RecordWork
    SN --> UC_SbarGen
    SN --> UC_ShareLine
    SN --> UC_Pearls
    SN --> UC_KnowledgeRepo
    SN --> UC_AskTutor
    SN --> UC_ApproveFaq
    SN --> UC_CreateQuiz

    %% Relations for Charge Nurse (Management)
    CN --> UC_Auth
    CN --> UC_Shift
    CN --> UC_BedStatus
    CN --> UC_RecordWork
    CN --> UC_SbarGen
    CN --> UC_ShareLine
    CN --> UC_Pearls
    CN --> UC_ApproveFaq
    CN --> UC_CreateQuiz

    %% Relations for Admin
    AD --> UC_Auth
    AD --> UC_ManageUsers
    AD --> UC_AuditLog
    AD --> UC_BedStatus

    %% Include / Extend / AI connections
    UC_RecordWork -.->|<<include>>| UC_Sanitize
    UC_RecordWork -.->|สร้างข้อมูลส่งเวร| UC_SbarGen
    UC_SbarGen -.->|<<include>>| UC_CheatSheet
    UC_SbarGen <--> AI
    UC_AskTutor <--> AI
    UC_ApproveFaq -.->|สร้าง Vector Train| AI
```

---

### 2. คำอธิบายสาระสำคัญของ Use Case

| รหัส Use Case | ชื่อ Use Case | ผู้ใช้งานหลัก | คำอธิบายสาระสำคัญ |
| :--- | :--- | :--- | :--- |
| **UC01** | ลงทะเบียน, ล็อกอิน (Email/Social) & ปลดล็อก Quick PIN | ทุกคน | ลงทะเบียนพร้อมตั้งและยืนยัน Quick PIN 4 หลัก, ยืนยันตัวตนด้วยอีเมล/รหัสผ่าน หรือ Google Sign-In, ผูกอุปกรณ์ส่วนตัวพยาบาล (Device Binding) ป้องกันล็อกอินซ้อน และปลดล็อกด่วนกรณีล็อกจออัตโนมัติ 5 นาที |
| **UC02** | จัดการรอบเวร & กรองเตียงอัตโนมัติ | JN, SN, CN | จัดการวันที่และปุ่มรอบเวร (เช้า/บ่าย/ดึก) แบบแถวเดียว และกรองรายการเตียงอัตโนมัติตามเวร |
| **UC03** | จัดการเตียงผู้ป่วย (CRUD) | JN, SN, CN | แสดงจำนวนเตียงรวม, ปุ่มไอคอน "+" เพิ่มเตียง, แก้ไข และลบข้อมูลเตียงผู้ป่วยในเวร |
| **UC04** | บันทึกรายการทำงาน (พิมพ์/เสียง) | JN, SN, CN | บันทึกกิจกรรมการพยาบาลแบบรายการตามเวลา มีกล่องป้อนงานแบบ Toggle และรองรับการพูดถอดความจากเสียง |
| **UC05** | ดูคำถามดักคอของรุ่นพี่ (Cheat Sheet) | JN, SN | แสดงโพยคำถามดักคอที่รุ่นพี่/แพทย์มักจะถามจี้ไว้บนสุดของหน้าการทำงาน ให้น้องเตรียมตัวล่วงหน้า |
| **UC06** | สร้างข้อมูลส่งเวร SBAR อัจฉริยะ | JN, SN, AI | ประมวลผลจากรายการทำงานและข้อมูลผู้ป่วย แปลงเป็นข้อความ SBAR ที่ถูกต้องตามมาตรฐานวิชาชีพ |
| **UC07** | แชร์เตียงคนไข้ให้เพื่อน/ส่ง LINE | JN, SN, CN | จัดฟอร์แมตสรุปข้อมูลเตียงใน 1 คลิก ส่งต่อเพื่อนร่วมเวรหรือกลุ่ม LINE ปลอดภัยตาม PDPA |
| **UC08** | ค้นคว้าคลังคู่มือ CCU | JN, SN | คลังเอกสารแบ่งหมวดหมู่: ยาเสี่ยงสูง, แถบ EKG, อุปกรณ์ช่วยชีวิต, และผลตรวจทางห้องปฏิบัติการ |
| **UC09** | ถามพี่เลี้ยง AI (Safe Nurse Tutor) | JN, SN, AI | สนทนาถาม-ตอบข้อสงสัยการพยาบาล 24 ชม. ไม่ดุ ไม่ด่า มีเหตุผลทางคลินิกรองรับ |
| **UC10** | อ่าน/แบ่งปันเกร็ดความรู้พยาบาล | ทุกคน | บอร์ดแลกเปลี่ยนทริคจากรุ่นพี่ พร้อมปุ่มส่งหัวใจแสดงความขอบคุณ (Heart Reaction) |
| **UC11** | เล่นเกมควิซ & สะสม EXP | JN, SN | ฝึกตอบคำถามจำลองสถานการณ์ส่งเวร เพิ่มความมั่นใจและเลเวลพยาบาล |
| **UC12** | สร้างโจทย์ข้อสอบฝึกหัด (Quiz Generator) | SN, CN, AD | ออกข้อสอบเคสใหม่เพื่อกระจายให้พยาบาลทุกคนในวอร์ดได้ฝึกทำ |
| **UC13** | รุ่นพี่ Approve FAQ & Vector Train AI | SN, CN | ตรวจสอบรับรองคำตอบ FAQ และสั่งสร้าง Vector Embeddings เข้าโมเดล AI ติวเตอร์ทันที |
| **UC14** | จัดการผู้ใช้งานระบบ (User Management) | AD | จัดการบัญชีพยาบาล ตรวจสอบสถานะการผูกอุปกรณ์ และสิทธิ์ในระบบ (เฉพาะ Admin) |
| **UC15** | ตรวจสอบประวัติความปลอดภัย (Audit Log) | AD | ตรวจสอบประวัติการเข้าใช้งานตามข้อกำหนด พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล |
| **UC16** | กรองข้อมูลระบุตัวตนคนไข้ (PDPA Filter) | ระบบอัตโนมัติ | กรองชื่อ-นามสกุล, เลขประจำตัวประชาชน และ HN ออกก่อนส่งให้ AI ภายนอก |
