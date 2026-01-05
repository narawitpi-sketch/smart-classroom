# วิธีการตั้งค่าผู้ใช้งานแอดมิน

ระบบความปลอดภัยของแอปพลิเคชันได้รับการอัปเดตให้ใช้โมเดลการให้สิทธิ์ (Authorization) ที่ปลอดภัยยิ่งขึ้นและทำงานฝั่งเซิร์ฟเวอร์ รายชื่ออีเมลแอดมินที่เคยถูกเขียนไว้โดยตรงในโค้ดฝั่ง Client ถูกนำออกไปแล้ว

ในการกำหนดให้ผู้ใช้คนใดคนหนึ่งเป็นผู้ดูแลระบบ (Administrator) คุณต้องทำ 2 ขั้นตอนดังนี้:

### 1. ตั้งค่า Custom Claim ผ่านสภาพแวดล้อมของเซิร์ฟเวอร์

ตอนนี้หน้าจอของแอปพลิเคชันจะอาศัยสิ่งที่เรียกว่า "Custom Claim" ที่ตั้งค่าไว้ใน Token ของผู้ใช้ (`admin: true`) เพื่ออนุญาตให้เข้าถึงหน้าแดชบอร์ดของแอดมินได้ คุณจำเป็นต้องตั้งค่า Claim นี้ให้กับผู้ใช้ที่ต้องการให้เป็นแอดมิน โดยปกติแล้วขั้นตอนนี้จะทำผ่านสภาพแวดล้อมที่เชื่อถือได้ของเซิร์ฟเวอร์ (เช่น Cloud Function หรือเครื่องคอมพิวเตอร์ของคุณที่ติดตั้ง Firebase Admin SDK)

**ตัวอย่างการใช้งาน Firebase Admin SDK (Node.js):**

ก่อนอื่น คุณต้องทราบ UID ของผู้ใช้ที่ต้องการจะตั้งเป็นแอดมินก่อน ซึ่งสามารถหาได้จากหน้าคอนโซลของ Firebase Authentication

```javascript
// admin-setup.js
const admin = require('firebase-admin');

// สำคัญ: ต้องระบุ Service Account Key ของคุณ
const serviceAccount = require('./path/to/your/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// <-- แทนที่ด้วย UID ของผู้ใช้ที่ต้องการให้เป็นแอดมิน
const uid = 'USER_UID_TO_MAKE_ADMIN'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`ตั้งค่า Custom Claim ให้กับผู้ใช้ ${uid} สำเร็จแล้ว`);
    // Claim ใหม่นี้จะพร้อมใช้งานใน ID Token ของผู้ใช้ในการลงชื่อเข้าใช้ครั้งถัดไป
    process.exit(0);
  })
  .catch(error => {
    console.error('เกิดข้อผิดพลาดในการตั้งค่า Custom Claim:', error);
    process.exit(1);
  });
```

คุณจะต้องรันสคริปต์นี้เพียงครั้งเดียวเพื่อตั้งค่าผู้ใช้แอดมินหนึ่งคน

### 2. เพิ่มผู้ใช้ลงใน Collection 'admins' ใน Firestore

กฎความปลอดภัย (Security Rules) ใหม่ของ Firestore และ Storage จะใช้ข้อมูลใน Collection ที่ชื่อว่า `admins` เพื่อให้สิทธิ์ในการเข้าถึงและจัดการข้อมูลในฐานข้อมูลและไฟล์ต่างๆ บนเซิร์ฟเวอร์

1.  ไปที่ Firebase Console ของคุณ
2.  ไปที่เมนู **Firestore Database**
3.  สร้าง Collection ใหม่ชื่อว่า `admins`
4.  สร้าง Document ใหม่ใน Collection `admins`
5.  ตั้งค่า **Document ID** ให้เป็น **UID** ของผู้ใช้ที่คุณต้องการให้เป็นแอดมิน
6.  คุณสามารถเพิ่มฟิลด์ใดๆ ลงใน Document ก็ได้ (เช่น `name: 'Admin User'`) หรือจะเว้นว่างไว้ก็ได้ เพราะกฎความปลอดภัยจะตรวจสอบแค่ว่ามี Document นี้อยู่หรือไม่เท่านั้น

**เมื่อทำครบทั้ง 2 ขั้นตอนนี้ ผู้ใช้คนดังกล่าวจะได้รับสิทธิ์เป็นผู้ดูแลระบบอย่างสมบูรณ์**
