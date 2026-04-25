const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
	if (transporter) return transporter;

	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT),
		secure: process.env.SMTP_SECURE === "true",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS
		},
		tls: {
			rejectUnauthorized: false
		}
	});

	return transporter;
}

async function sendMail({ to, subject, text, html }) {
	const transporter = getTransporter();

	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to,
		subject,
		text,
		html
	};

	return transporter.sendMail(mailOptions);
}

function renderEmailLayout({ title, previewText, content }) {
	const year = new Date().getFullYear();

	return `
		<!doctype html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${title}</title>
		</head>
		<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif; color:#111827;">
			<div style="display:none; max-height:0; overflow:hidden; opacity:0;">
				${previewText}
			</div>

			<div style="margin:0; padding:32px 16px; background-color:#f4f4f5;">
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
					<tr>
						<td align="center">
							<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px; border-collapse:collapse; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:16px;">
								<tr>
									<td style="padding:32px 32px 24px 32px; text-align:center;">
										<img
											src="https://gradus.tools/images/logo.png"
											alt="Gradus logo"
											width="140"
											style="display:block; margin:0 auto 20px auto; max-width:140px; height:auto; border:0;"
										>

										${content}
									</td>
								</tr>

								<tr>
									<td style="padding:0 32px 32px 32px; text-align:center;">
										<p style="margin:0; font-size:12px; line-height:1.5; color:#9ca3af;">
											Gradus - Student Planner
										</p>
									</td>
								</tr>
							</table>

							<p style="margin:16px 0 0 0; font-size:12px; line-height:1.5; color:#9ca3af;">
								Gradus © ${year} by Mimix Software
							</p>
						</td>
					</tr>
				</table>
			</div>
		</body>
		</html>
	`;
}

async function sendVerificationCode(to, code, expiresInMinutes) {
	const subject = "Verify your Gradus account";

	const text = `Your Gradus verification code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.`;

	const html = renderEmailLayout({
		title: "Verify your Gradus account",
		previewText: `Your Gradus verification code is ${code}.`,
		content: `
			<h1 style="margin:0 0 12px 0; font-size:28px; line-height:1.2; color:#111827;">
				Verify your account
			</h1>

			<p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#6b7280;">
				Welcome to Gradus. Use the verification code below to complete your registration.
			</p>

			<div style="margin:0 0 24px 0; padding:18px 20px; background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
				<div style="font-size:13px; line-height:1.4; color:#6b7280; margin-bottom:8px;">
					Your verification code
				</div>
				<div style="font-size:32px; line-height:1; font-weight:bold; letter-spacing:6px; color:#111827;">
					${code}
				</div>
			</div>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				This code expires in <strong>${expiresInMinutes} minutes</strong>.
			</p>

			<p style="margin:0; font-size:14px; line-height:1.6; color:#6b7280;">
				If you did not create a Gradus account, you can safely ignore this email.
			</p>
		`
	});

	return sendMail({ to, subject, text, html });
}

async function sendPasswordChangedNotification(to) {
	const subject = "Your Gradus password was changed";

	const text = [
		"Your Gradus password was changed.",
		"",
		"If you made this change, no further action is needed.",
		"If you did not make this change, reset your password immediately."
	].join("\n");

	const html = renderEmailLayout({
		title: "Your Gradus password was changed",
		previewText: "Your Gradus password was changed.",
		content: `
			<h1 style="margin:0 0 12px 0; font-size:28px; line-height:1.2; color:#111827;">
				Password changed
			</h1>

			<p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#6b7280;">
				Your Gradus password was changed successfully.
			</p>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				If you made this change, no further action is needed.
			</p>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				If you did not make this change, reset your password immediately.
			</p>

			<p style="margin:0; font-size:14px; line-height:1.6; color:#6b7280;">
				This email was sent for your account security.
			</p>
		`
	});

	return sendMail({ to, subject, text, html });
}

async function sendResetToken(to, resetToken, expiresInMinutes) {
	const resetUrl = `${process.env.URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

	const subject = "Reset your Gradus password";

	const text = [
		"We received a request to reset your Gradus password.",
		"",
		`Reset your password using this link: ${resetUrl}`,
		"",
		`This link expires in ${expiresInMinutes} minutes.`,
		"If you did not request this, you can ignore this email."
	].join("\n");

	const html = renderEmailLayout({
		title: "Reset your Gradus password",
		previewText: "Reset your Gradus password.",
		content: `
			<h1 style="margin:0 0 12px 0; font-size:28px; line-height:1.2; color:#111827;">
				Reset your password
			</h1>

			<p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#6b7280;">
				We received a request to reset your Gradus password.
			</p>

			<p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#374151;">
				Click the button below to choose a new password.
			</p>

			<div style="margin:0 0 24px 0;">
				<a
					href="${resetUrl}"
					style="
						display:inline-block;
						padding:12px 20px;
						border-radius:10px;
						background:#111827;
						color:#ffffff;
						text-decoration:none;
						font-size:15px;
						font-weight:600;
					"
				>
					Reset Password
				</a>
			</div>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				This link expires in <strong>${expiresInMinutes} minutes</strong>.
			</p>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				If you did not request a password reset, you can safely ignore this email.
			</p>

			<p style="margin:0; font-size:14px; line-height:1.6; color:#6b7280;">
				For security, this link can only be used once.
			</p>
		`
	});

	return sendMail({ to, subject, text, html });
}

async function sendAccountDeletedNotification(to) {
	const subject = "Your Gradus account has been deleted";

	const text = [
		"Your Gradus account has been deleted.",
		"",
		"All your data, including semesters, modules, assignments, tasks, and schedules, has been permanently removed.",
		"If you did not request this, please contact support immediately."
	].join("\n");

	const html = renderEmailLayout({
		title: "Your Gradus account has been deleted",
		previewText: "Your Gradus account has been deleted.",
		content: `
			<h1 style="margin:0 0 12px 0; font-size:28px; line-height:1.2; color:#111827;">
				Account deleted
			</h1>

			<p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#6b7280;">
				Your Gradus account has been deleted successfully.
			</p>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				All your data, including semesters, modules, assignments, tasks, and schedules, has been permanently removed.
			</p>

			<p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#374151;">
				If you did not request this, please contact support immediately.
			</p>

			<p style="margin:0; font-size:14px; line-height:1.6; color:#6b7280;">
				This email was sent for your account security.
			</p>
		`
	});

	return sendMail({ to, subject, text, html });
}

module.exports = {
	sendMail,
	sendVerificationCode,
	sendPasswordChangedNotification,
	sendResetToken,
	sendAccountDeletedNotification
};