import { p, renderEmail } from "./layout";

/** The wording of every app email. Links are absolute, built from the site URL. */

const lkr = (n: number) => (n === 0 ? "Free" : `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function welcomeEmail(o: { name: string; site: string }) {
  return renderEmail({
    subject: "Welcome to iBox Academy",
    preheader: "Your account is ready. Here's how to get started.",
    title: `Welcome, ${first(o.name)}`,
    blocks: [
      p("Your iBox Academy account is ready."),
      p("Every course has free preview lessons, so you can try before you buy. When you enrol, you keep lifetime access, including future updates to the course."),
      p("Pay by card through PayHere, or by bank transfer. Learn on your phone or computer, and pick up where you left off on any device."),
    ],
    button: { label: "Browse courses", url: `${o.site}/courses` },
    footnote: "You're getting this because you created an iBox Academy account.",
  });
}

export function enrolledEmail(o: {
  name: string;
  courseTitle: string;
  reference: string;
  amount: number;
  method: "payhere" | "bank_transfer" | "free";
  url: string;
  site: string;
}) {
  const paid = o.method !== "free";
  return renderEmail({
    subject: paid ? `Payment received: ${o.courseTitle}` : `You're enrolled: ${o.courseTitle}`,
    preheader: paid ? "Your payment is confirmed and your course is open." : "Your course is open. Start whenever you're ready.",
    title: paid ? "Payment received. Your course is open" : "You're enrolled",
    blocks: [
      p(`Hi ${first(o.name)}, `, paid ? "thanks for your payment. You now have access to " : "you now have access to ", { b: o.courseTitle }, "."),
      {
        kind: "rows",
        rows: [
          ["Order", o.reference],
          ["Course", o.courseTitle],
          ["Amount", lkr(o.amount)],
          ...(paid ? ([["Paid by", o.method === "payhere" ? "Card (PayHere)" : "Bank transfer"]] as [string, string][]) : []),
          ["Access", "Lifetime"],
        ],
      },
    ],
    button: { label: "Start learning", url: o.url },
    note: paid
      ? "Keep this email as your receipt. Changed your mind? You can ask for a refund within 14 days if you've completed less than 20% of the course."
      : undefined,
    footnote: `See all your orders any time in your account: ${o.site}/app/student/payments`,
  });
}

export function slipReceivedEmail(o: { name: string; courseTitle: string; reference: string; amount: number; url: string }) {
  return renderEmail({
    subject: `We got your bank slip: ${o.reference}`,
    preheader: "We'll check it and open your course, usually within one working day.",
    title: "We got your bank slip",
    blocks: [
      p(`Hi ${first(o.name)}, thanks for sending your bank transfer slip for `, { b: o.courseTitle }, "."),
      p("Our team will check it against our bank account and open your course, usually within one working day. We'll email you as soon as it's done."),
      { kind: "rows", rows: [["Order", o.reference], ["Amount", lkr(o.amount)]] },
    ],
    button: { label: "View your order", url: o.url },
  });
}

export function bankRejectedEmail(o: { name: string; courseTitle: string; reference: string; reason: string; url: string }) {
  return renderEmail({
    subject: `We couldn't confirm your bank transfer: ${o.reference}`,
    preheader: "Please check the note from our team and upload your slip again.",
    title: "We couldn't confirm your transfer",
    blocks: [
      p(`Hi ${first(o.name)}, we checked the bank slip for `, { b: o.courseTitle }, " but couldn't match it to a payment yet."),
      { kind: "quote", by: "Note from our team", text: o.reason },
      p("Open your order to upload a clearer or corrected slip. If you think this is a mistake, reply to this email with your order reference and we'll look again."),
    ],
    button: { label: "Upload slip again", url: o.url },
    note: `Order reference: ${o.reference}`,
  });
}

export function ticketReceivedEmail(o: { name: string; subject: string; reference: string; url: string }) {
  return renderEmail({
    subject: `We got your message: ${o.subject}`,
    preheader: `Ticket ${o.reference}. A real person on our team will reply soon.`,
    title: "We got your message",
    blocks: [
      p(`Hi ${first(o.name)}, thanks for getting in touch. A real person on our team will reply, usually within one working day.`),
      { kind: "rows", rows: [["Ticket", o.reference], ["Subject", o.subject]] },
      p("We'll email you when we reply. You can add more details on the ticket page any time."),
    ],
    button: { label: "View your ticket", url: o.url },
  });
}

export function ticketReplyEmail(o: { name: string; subject: string; reference: string; author: string; body: string; url: string }) {
  const preview = o.body.length > 1200 ? `${o.body.slice(0, 1200).trimEnd()}…` : o.body;
  return renderEmail({
    subject: `Re: ${o.subject} [${o.reference}]`,
    preheader: `${o.author} replied to your support ticket.`,
    title: "We replied to your ticket",
    blocks: [
      p(`Hi ${first(o.name)}, `, { b: o.author }, " from our team replied:"),
      { kind: "quote", text: preview },
      p("To answer, open the ticket and reply there, so the whole conversation stays in one place."),
    ],
    button: { label: "View and reply", url: o.url },
    note: `Ticket ${o.reference}: ${o.subject}`,
  });
}

export function certificateEmail(o: { name: string; courseTitle: string; code: string; url: string; site: string }) {
  return renderEmail({
    subject: `Your certificate for ${o.courseTitle}`,
    preheader: "Congratulations! Your certificate of completion is ready to share.",
    title: `Congratulations, ${first(o.name)}!`,
    blocks: [
      p("You've completed ", { b: o.courseTitle }, ", and your certificate is ready."),
      p("Anyone can check it's genuine with its link, so you can add it to your CV or LinkedIn profile, or share it with an employer."),
      { kind: "rows", rows: [["Certificate ID", o.code], ["Course", o.courseTitle]] },
    ],
    button: { label: "View your certificate", url: o.url },
    note: "Ready for the next one? Browse more courses and keep learning.",
    footnote: `All your certificates are in your account: ${o.site}/app/student/certificates`,
  });
}

export function testEmail(o: { name: string; site: string }) {
  return renderEmail({
    subject: "Test email from iBox Academy",
    preheader: "Your app emails are set up correctly.",
    title: "Emails are working",
    blocks: [p(`Hi ${first(o.name)}, this test came from your iBox Academy website, so app emails are set up correctly.`)],
    button: { label: "Open iBox Academy", url: o.site },
  });
}
