// src/utils/helpers.ts
import type { ReporterType } from '../types';

export const getReporterLabel = (type: ReporterType) => type === 'lecturer' ? 'อาจารย์' : type === 'student' ? 'นักศึกษา' : 'อื่น ๆ';

export const formatDate = (timestamp: any) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const sendLineMessage = async (issueData: any) => {
  const LINE_CHANNEL_ACCESS_TOKEN = "GA3r5ViM4lH1TYGzllT9XKErXn2MlxUKBq8F9c4R/SIeAqHMrKKaGwopC9dcv1vNdcb2/g9383YGFjvMUW72bqHVaqjYUpHPbAYHv+a8glAc4wWda5c0dQyP+IjS4TAHSvVt0EW3v/IdSX4xfknHNAdB04t89/1O/w1cDnyilFU="; 
  const LINE_GROUP_ID = "C8d92d6c426766edb968dabcb780d4c39"; 

  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID || LINE_CHANNEL_ACCESS_TOKEN.includes("ใส่_")) return;
  
  const messageText = `🚨 *แจ้งซ่อมห้องเรียนใหม่* (${issueData.id})\n--------------------\n📍 *ห้อง:* ${issueData.room}\n👤 *ผู้แจ้ง:* ${issueData.reporter} (${getReporterLabel(issueData.reporterType)})\n📞 *เบอร์:* ${issueData.phone}\n⚠️ *ความเร่งด่วน:* ${issueData.urgency === 'high' ? '🔴 ด่วนมาก' : issueData.urgency === 'medium' ? '🟠 ปานกลาง' : '🟢 ทั่วไป'}\n🛠 *ปัญหา:* ${issueData.category}\n📝 *รายละเอียด:* ${issueData.description}\n--------------------\nตรวจสอบ: https://smart-classroom-neon.vercel.app/`;
  
  const messages: any[] = [
    { type: "text", text: messageText.trim() }
  ];

  try {
    await fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.line.me/v2/bot/message/push'), {
      method: 'POST', headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: LINE_GROUP_ID, messages: messages }),
    });
  } catch (error) { console.error("Line Error", error); }
};