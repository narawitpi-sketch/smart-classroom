import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// ============================================================================
// Security-Hardened Callable Cloud Functions
// ============================================================================

// --- Configuration ---
const LINE_CHANNEL_ACCESS_TOKEN = functions.config().line.token;
const LINE_GROUP_ID = functions.config().line.group;
const ALLOWED_ADMIN_EMAILS = functions.config().admin.emails.split(',');
const APP_ID = "smart-classroom";

/**
 * Checks if the user is an authorized admin based on their email.
 * @param {functions.https.CallableContext} context - The context of the function call.
 * @throws {functions.https.HttpsError} Throws 'unauthenticated' if the user is not logged in
 * or 'permission-denied' if they are not an authorized admin.
 */
const isAdmin = (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to call this function.");
  }
  const userEmail = context.auth.token.email;
  if (!userEmail || !ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
    throw new functions.https.HttpsError("permission-denied", "You do not have permission to perform this action.");
  }
};

// --- Callable Function: sendLineMessage ---
export const sendLineMessage = functions.https.onCall(async (data, context) => {
  // --- Add Authentication Check ---
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to send a notification.");
  }
  
  const { newIssue } = data;

  if (!newIssue) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'newIssue' object.");
  }

  const message = `
    🔔 แจ้งเตือนรายการใหม่ 🔔
    รหัส: ${newIssue.id}
    ห้อง: ${newIssue.room}
    ประเภท: ${newIssue.category}
    ผู้แจ้ง: ${newIssue.reporter} (${newIssue.reporterType})
    โทร: ${newIssue.phone}
    สถานะ: ${newIssue.status}
    รายละเอียด: ${newIssue.description}
  `.trim().replace(/    /g, "");

  try {
    await axios.post("https://api.line.me/v2/bot/message/push", {
      to: LINE_GROUP_ID,
      messages: [{ type: "text", text: message }],
    }, {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    return { success: true, message: "Message sent successfully" };
  } catch (error) {
    console.error("Error sending LINE message:", error);
    throw new functions.https.HttpsError("internal", "Failed to send LINE message.");
  }
});

// --- Callable Function: deleteIssue ---
export const deleteIssue = functions.https.onCall(async (data, context) => {
  isAdmin(context);
  const { docId } = data;
  if (!docId) {
    throw new functions.https.HttpsError("invalid-argument", "docId is required.");
  }
  
  const issueRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('issues').doc(docId);
  
  try {
    const issueDoc = await issueRef.get();
    const issueData = issueDoc.data();

    // If there's an image, delete it from Cloud Storage first
    if (issueData && issueData.imagePath) {
      const bucket = admin.storage().bucket();
      const file = bucket.file(issueData.imagePath);
      await file.delete().catch(err => console.error("Failed to delete image, it may have already been removed:", err));
    }
    
    await issueRef.delete();
    return { success: true, message: `Issue ${docId} deleted successfully.` };
  } catch (error) {
    console.error("Error deleting issue:", error);
    throw new functions.https.HttpsError("internal", "Could not delete issue.");
  }
});

// --- Callable Function: addRoom ---
export const addRoom = functions.https.onCall(async (data, context) => {
  isAdmin(context);
  const { roomName } = data;
  if (!roomName || typeof roomName !== 'string' || roomName.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "A valid 'roomName' must be provided.");
  }

  try {
    const newRoomRef = await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('rooms').add({ name: roomName.trim() });
    return { success: true, id: newRoomRef.id };
  } catch (error) {
    console.error("Error adding room:", error);
    throw new functions.https.HttpsError("internal", "Failed to add new room.");
  }
});

// --- Callable Function: deleteRoom ---
export const deleteRoom = functions.https.onCall(async (data, context) => {
  isAdmin(context);
  const { roomId } = data;
  if (!roomId || typeof roomId !== 'string') {
    throw new functions.https.HttpsError("invalid-argument", "A valid 'roomId' must be provided.");
  }

  try {
    await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('rooms').doc(roomId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting room:", error);
    throw new functions.https.HttpsError("internal", "Failed to delete room.");
  }
});

