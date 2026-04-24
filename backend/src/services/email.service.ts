// Owner: Workflow Engineer
// Email service for sending interview invitations, offer letters, and notifications.

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@hireflow.com';
const COMPANY_NAME = process.env.COMPANY_NAME || 'HireFlow';

let transporter: any = null;

function getTransporter(): any {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('Email not configured - emails will be logged only');
      transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
    }
  }
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;

  if (!SMTP_HOST) {
    console.log(`[EMAIL MOCK] To: ${to}\nSubject: ${subject}\nBody: ${html.substring(0, 200)}...`);
    return true;
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendAiInterviewInvite(
  candidate: { fullName: string; email: string },
  job: { title: string },
  interviewLink: string
): Promise<boolean> {
  const subject = `AI Technical Interview - ${job.title}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Dear ${candidate.fullName},</h2>
      <p>Thank you for applying for the <strong>${job.title}</strong> role.</p>
      <p>Your application has progressed to our AI pre-screen interview. This short session includes coding, MCQ, and behavioral questions so we can evaluate real skill signals instead of CV keywords alone.</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 12px;"><strong>Interview link</strong></p>
        <a href="${interviewLink}" style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Start AI Interview</a>
      </div>

      <p>This link is unique to you. Please complete the interview in one sitting when you are ready.</p>
      <p>Best regards,<br/>${COMPANY_NAME} Hiring Team</p>
    </div>
  `;

  return sendEmail({ to: candidate.email, subject, html });
}

export async function sendOfferLetter(
  candidate: { fullName: string; email: string },
  job: { title: string },
  offerDetails: { subject: string; body: string }
): Promise<boolean> {
  const subject = offerDetails.subject || `Offer Letter - ${job.title} Position`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Dear ${candidate.fullName},</h2>
      <p>Congratulations! We are pleased to extend an offer for the <strong>${job.title}</strong> position.</p>
      
      <div style="margin: 20px 0; white-space: pre-wrap;">${offerDetails.body}</div>
      
      <p>To accept this offer, please sign and return the attached documents within 7 days.</p>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br/>${COMPANY_NAME} HR Team</p>
    </div>
  `;

  return sendEmail({ to: candidate.email, subject, html });
}

export async function sendRejectionEmail(
  candidate: { fullName: string; email: string },
  job: { title: string },
  stage: 'cv' | 'interview'
): Promise<boolean> {
  const subject = `Update on Your Application - ${job.title}`;
  const stageLabel = stage === 'cv' ? 'CV review' : 'interview';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Dear ${candidate.fullName},</h2>
      <p>Thank you for your interest in the <strong>${job.title}</strong> position and for taking the time to complete the ${stageLabel} stage.</p>
      
      <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
      
      <p>We appreciate your understanding and wish you the best in your job search.</p>
      
      <p>Best regards,<br/>${COMPANY_NAME} HR Team</p>
    </div>
  `;

  return sendEmail({ to: candidate.email, subject, html });
}

interface CandidateWithId {
  fullName: string;
  email: string;
  candidateId: string;
}

interface JobWithId {
  title: string;
  candidateId: string;
}

export async function sendInterviewSchedule(
  candidate: CandidateWithId,
  job: JobWithId,
  interviewDetails: { date: string; time: string; location: string; meetingLink?: string }
): Promise<boolean> {
  const subject = `Interview Scheduled - ${job.title} Position`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Dear ${candidate.fullName},</h2>
      <p>Your interview for the <strong>${job.title}</strong> position has been scheduled.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Interview Details</h3>
        <p><strong>Date:</strong> ${interviewDetails.date}</p>
        <p><strong>Time:</strong> ${interviewDetails.time}</p>
        <p><strong>Location:</strong> ${interviewDetails.location}</p>
        ${interviewDetails.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interviewDetails.meetingLink}">${interviewDetails.meetingLink}</a></p>` : ''}
      </div>
      
      <p>Please confirm your attendance by clicking one of the links below:</p>
      <p>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/interview/confirm/${candidate.candidateId}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Confirm</a>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/interview/reschedule/${candidate.candidateId}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Request Reschedule</a>
      </p>
      
      <p>Or reply to this email with your response.</p>
      
      <p>Best regards,<br/>${COMPANY_NAME} HR Team</p>
    </div>
  `;

  return sendEmail({ to: candidate.email, subject, html });
}

export async function notifyHRRescheduleRequest(
  candidate: { fullName: string; email: string; job: { title: string } },
  reason?: string
): Promise<boolean> {
  const subject = `Interview Reschedule Request - ${candidate.fullName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>HR Notification</h2>
      <p>Candidate <strong>${candidate.fullName}</strong> (<a href="mailto:${candidate.email}">${candidate.email}</a>) has requested to reschedule their interview for the <strong>${candidate.job.title}</strong> position.</p>
      
      ${reason ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
      </div>` : ''}
      
      <p>Please review and update the interview schedule in the dashboard.</p>
    </div>
  `;

  return sendEmail({ to: process.env.HR_NOTIFICATION_EMAIL || FROM_EMAIL, subject, html });
}

export async function notifyHRInterviewConfirmed(
  candidate: { fullName: string; email: string; job: { title: string } },
  interviewDetails: { date: string; time: string; location: string }
): Promise<boolean> {
  const subject = `Interview Confirmed - ${candidate.fullName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>HR Notification</h2>
      <p>Candidate <strong>${candidate.fullName}</strong> (<a href="mailto:${candidate.email}">${candidate.email}</a>) has confirmed their interview for the <strong>${candidate.job.title}</strong> position.</p>
      
      <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>Date:</strong> ${interviewDetails.date}</p>
        <p><strong>Time:</strong> ${interviewDetails.time}</p>
        <p><strong>Location:</strong> ${interviewDetails.location}</p>
      </div>
    </div>
  `;

  return sendEmail({ to: process.env.HR_NOTIFICATION_EMAIL || FROM_EMAIL, subject, html });
}
