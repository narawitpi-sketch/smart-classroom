import { collection, onSnapshot, type Firestore } from 'firebase/firestore';
import type { Issue, Role } from '../types';

const appLoadTime = new Date();

export function requestNotificationPermission() {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("เปิดใช้งานการแจ้งเตือนแล้ว!");
        }
      });
    }
  }
}

export function setupIssueNotifications(
  db: Firestore, 
  APP_ID: string, 
  role: Role,
  setIssues: (issues: Issue[]) => void
) {
  const qIssues = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
  
  const unsubscribe = onSnapshot(qIssues, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newIssue = change.doc.data() as Issue;
        const issueTimestamp = newIssue.timestamp && (newIssue.timestamp as any).toDate();

        if (role === 'staff' && Notification.permission === "granted" && issueTimestamp && issueTimestamp > appLoadTime) {
          new Notification("มีรายการแจ้งซ่อมใหม่", {
            body: `ห้อง ${newIssue.room}: ${newIssue.description}`,
            icon: '/img/logo.png'
          });
        }
      }
    });

    const fetched = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as Issue[];
    fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    setIssues(fetched);
  });

  return unsubscribe;
}
