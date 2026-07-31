# Release Cycle & Versioning Policy

## รูปแบบเลขเวอร์ชัน

รูปแบบ: **`YYYY R{n}.{minor}.{patch}`** เช่น `2026R1.1.0`

| ส่วน | ตัวอย่าง | ความหมาย |
|------|---------|-----------|
| ปี | `2026` | ปีของรอบการพัฒนา |
| R | `R1` | Major release ลำดับที่ของปีนั้น (ปีละ 2 รอบ: R1 และ R2) |
| Minor | `.1` | เพิ่ม feature ย่อย/improvement โดยยัง backward compatible |
| Patch | `.0` | แก้ bug หรือ hotfix เท่านั้น ไม่มี feature ใหม่ |

**กติกาการขยับเลข**

- ออก major release รอบใหม่ → ขยับ R เช่น `2026R1` → `2026R2`
- เพิ่ม feature ย่อย → ขยับเลขกลาง เช่น `2026R1.0.0` → `2026R1.1.0`
- แก้ bug อย่างเดียว → ขยับเลขท้าย เช่น `2026R1.1.0` → `2026R1.1.1`

## รอบการออก Release

ออก major release **ปีละ 2 รอบ** (ประมาณทุก 6 เดือน)

- **R1** — ครึ่งปีแรก
- **R2** — ครึ่งปีหลัง

Timeline ต่อรอบ (6 เดือน): เดือน 1–4 พัฒนา feature → เดือน 5 **feature freeze** เข้าช่วง stabilization (แก้ bug + regression test) → เดือน 6 ปล่อย release

**หลักการสำคัญ:** วันออก release ผูกกับ "วันที่" ไม่ใช่ "feature เสร็จ" — feature ที่ไม่ทันรอบนี้ให้เลื่อนไปรอบถัดไป ไม่เลื่อนวัน release

**Minor release:** ออกเมื่อของพร้อม ไม่กำหนดรอบเวลาตายตัว

## Support Policy

Support เฉพาะ **R ล่าสุดรอบเดียว** — ถ้าพบ bug ในเวอร์ชันเก่า การแก้ไขจะอยู่ในเวอร์ชันล่าสุด กรุณา upgrade เพื่อรับ fix ยกเว้น critical / security issue จะพิจารณา backport เป็นกรณีไป

## Git Workflow

- ทำงานบน `main` เป็นหลัก (trunk-based) ใช้ branch สั้นๆ แล้ว merge เร็ว
- ตอน feature freeze ตัด branch `release/2026R1` แยกออกมา ส่วน `main` เดินหน้าต่อสำหรับรอบถัดไป
- **Tag ทุกครั้งที่ปล่อย** ให้ตรงกับเลขเวอร์ชัน เช่น `2026R1.0.0`, `2026R1.0.1`

## Hotfix Path (เมื่อ Production มีปัญหา)

1. แก้ bug บน release branch เช่น `release/2026R1`
2. ปล่อย patch version เช่น `2026R1.0.1` พร้อม tag
3. Merge กลับ `main` ทันที เพื่อไม่ให้ bug เดิมกลับมาในรอบถัดไป

## Checklist ก่อนปล่อยทุกครั้ง

- [ ] Tag ใน Git ตรงกับเลขเวอร์ชัน
- [ ] Changelog สรุปว่ารอบนี้มีอะไรเปลี่ยน
- [ ] ผ่าน smoke test checklist ครบทุกข้อ
