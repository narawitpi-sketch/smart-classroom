# วิธีการตั้งค่า Environment Variables ใน Vercel

เนื่องจากเราได้ย้ายการตั้งค่าต่างๆ ไปไว้ใน `.env` ซึ่งจะไม่ถูกอัปโหลดขึ้น Git ดังนั้นเมื่อคุณ Deploy ขึ้น Vercel คุณจำเป็นต้องไปตั้งค่าตัวแปรเหล่านี้ด้วยตัวเองเพื่อให้เว็บทำงานได้ถูกต้องครับ

## ขั้นตอนการทำ

1. **เข้าสู่ระบบ Vercel Dashboard**: ไปที่ [vercel.com/dashboard](https://vercel.com/dashboard)
2. **เลือก Project**: คลิกที่โปรเจกต์ `smart-classroom` ของคุณ
3. **ไปที่ Settings**: คลิกที่แท็บ **Settings** ด้านบน
4. **เลือก Environment Variables**: ที่เมนูด้านซ้าย คลิก **Environment Variables**
5. **เพิ่มตัวแปร (Add Variables)**:
    *   คุณสามารถ Copy เนื้อหาทั้งหมดจากไฟล์ `.env` ในเครื่องของคุณ
    *   นำมา Paste ลงในช่อง **Key** ในหน้า Vercel ได้เลย (Vercel จะฉลาดพอที่จะแยก Key กับ Value ให้อัตโนมัติถ้า Copy มาทั้งไฟล์)
    *   ตรวจสอบให้แน่ใจว่าเลือก Environment เป็น **Production**, **Preview**, และ **Development** (ติ๊กถูกทั้งหมด)
    *   กดปุ่ม **Save**

## รายชื่อตัวแปรที่ต้องใช้ (Checklist)

ตรวจสอบว่ามีตัวแปรเหล่านี้ครบถ้วนครับ:

### App Config
- `VITE_APP_ID`
- `VITE_ADMIN_PASSWORD`
- `VITE_ALLOWED_ADMIN_EMAILS`
- `VITE_LINE_CHANNEL_ACCESS_TOKEN`
- `VITE_LINE_GROUP_ID`

### Firebase Config
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

> **หมายเหตุ**: หากมีการแก้ไขค่าในอนาคต อย่าลืมมาอัปเดตในหน้านี้ด้วยนะครับ และหลังจากตั้งค่าเสร็จแล้ว แนะนำให้ทำการ **Redeploy** อีกครั้งเพื่อให้ค่าใหม่มีผล (ไปที่แท็บ Deployments > จุดสามจุดท้ายรายการล่าสุด > Redeploy)
