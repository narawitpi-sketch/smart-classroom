import { collection, onSnapshot, Firestore } from 'firebase/firestore';

// ขออนุญาตแจ้งเตือน
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
};

// ฟังก์ชันแสดงการแจ้งเตือน
const showNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    // เล่นเสียงแจ้งเตือน (ถ้าต้องการ)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));

    new Notification(title, {
      body: body,
      icon: 'https://cdn-icons-png.flaticon.com/512/2950/2950663.png', // ไอคอนรูปประแจ/ซ่อม
      silent: false
    });
  }
};

// ฟังก์ชันหลักสำหรับตั้งค่า Listener และแจ้งเตือน
export const setupIssueNotifications = (
  db: Firestore,
  appId: string,
  role: string,
  setIssues: (issues: any[]) => void,
  onError?: (error: any) => void
) => {
  const q = collection(db, 'artifacts', appId, 'public', 'data', 'issues');

  // Real-time listener
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // 1. แปลงข้อมูลและอัปเดต State (Issues List)
    const fetchedIssues = snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    })) as any[];

    // เรียงลำดับจากใหม่ไปเก่า
    fetchedIssues.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    setIssues(fetchedIssues);

    // 2. ตรวจสอบการแจ้งเตือน (เฉพาะ Staff)
    if (role === 'staff') {
      snapshot.docChanges().forEach((change) => {
        // ถ้าเป็นการ "เพิ่ม" (added) รายการใหม่
        if (change.type === "added") {
          const data = change.doc.data();

          // เช็คเวลา: แจ้งเตือนเฉพาะรายการที่เพิ่งสร้างภายใน 30 วินาทีที่ผ่านมา
          // (เพื่อป้องกันการแจ้งเตือนรัวๆ ตอนโหลดหน้าเว็บครั้งแรก ที่โหลดข้อมูลเก่ามา)
          const now = Date.now();
          const issueTime = data.timestamp?.seconds * 1000;

          // ถ้าเป็นรายการใหม่จริงๆ (สร้างไม่เกิน 30 วินาที) ให้แจ้งเตือน
          if (issueTime && (now - issueTime < 30000)) {
            showNotification(
              `📢 แจ้งซ่อมใหม่: ${data.room}`,
              `${data.category}: ${data.description}`
            );
          }
        }
      });
    }
  }, (error) => {
    console.error("Error fetching issues:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};