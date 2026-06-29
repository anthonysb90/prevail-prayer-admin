/**
 * The text the marketing pages currently ship with (their built-in HTML defaults),
 * expressed as Markdown. The Site editor preloads these so an admin edits the
 * real, current copy instead of a blank box. Saving stores an override in
 * site_content; until then the live page keeps rendering its built-in version.
 */

const PRIVACY = `_Last updated: June 27, 2026_

Prevail Prayer ("we," "us," or "our"), operated by B TWO LLC, provides the Prevail Prayer mobile app and website (the "Service"). This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using the Service you agree to this policy.

## 1. Information We Collect

### Information you provide

- **Account details:** your name, email address, phone number, and zip code when you create an account.
- **Profile content:** an optional profile photo.
- **Prayer content:** prayer requests, journal entries, reminders, related notes, and optional photos you attach to a request. This content is private to your account.
- **AI Import submissions:** if you choose to use AI Import, the photo or pasted text of a prayer list you submit so it can be turned into prayer requests. It is processed once to return your results and is never used to train AI models.
- **Communications:** messages you send us through contact or feature-request forms.

### Information collected automatically

- **Usage & device data:** app interactions, device type, and operating system, used to improve the Service.
- **Push tokens:** a device token so we can send the notifications and reminders you enable.

## 2. How We Use Your Information

- To provide and operate the Service, including syncing your prayers across your devices.
- To send reminders, devotions, and notifications you have enabled.
- To process subscriptions and manage your free trial.
- To power optional features you choose to use, such as turning a photographed or pasted prayer list into prayer requests with AI Import.
- To understand how the app is used so we can improve it.
- To respond to your questions and support requests.

## 3. How Your Information Is Shared

We do **not** sell your personal information. We share data only with service providers that help us run the Service, under agreements that protect your information:

- **Supabase** — secure database and authentication (stores your account and prayer content).
- **RevenueCat** and the **Apple App Store** / **Google Play** — to process subscriptions and purchases. We never see or store your full payment details.
- **PostHog** — privacy-conscious product analytics to understand usage.
- **Expo** — to deliver push notifications and app updates.
- **Anthropic** — when you use AI Import, the prayer-list photo or text you submit is sent securely to Anthropic's API to extract the requests. It is used only to generate your results and is **not used to train AI models** or retained for training.

We may also disclose information if required by law or to protect the rights, safety, and security of our users and the Service.

## 4. Data Security

Your data is stored on secured infrastructure with access controls and encryption in transit. Prayer content — including any photos you attach — is restricted to your authenticated account; images are held in private storage and shown only through short-lived, signed links. You can also enable an optional **Face ID / biometric app lock** that requires your face or fingerprint before the app will open. AI Import data is processed securely and is never used to train AI models. No method of transmission or storage is 100% secure, but we work to protect your information using industry-standard safeguards.

## 5. Data Retention & Deletion

We keep your information for as long as your account is active. You may request deletion of your account and associated data at any time by emailing [support@prevailprayer.com](mailto:support@prevailprayer.com) or using our contact form. We will delete your data within a reasonable period, except where we must retain it to meet legal obligations.

## 6. Children's Privacy

The Service is intended for users 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, contact us and we will remove it.

## 7. Your Choices

- **Notifications:** manage or disable reminders in the app and in your device settings.
- **Profile:** view and update your details under Settings → Account.
- **Access & deletion:** contact us to access or delete your data.

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. We'll post the updated version here with a new "Last updated" date and, where appropriate, notify you in the app.

## 9. Contact Us

Questions about this policy or your data? Email [support@prevailprayer.com](mailto:support@prevailprayer.com) or visit our contact page.`;

const TERMS = `_Last updated: June 27, 2026_

These Terms of Service ("Terms") govern your use of the Prevail Prayer mobile app and website (the "Service"), operated by B TWO LLC ("we," "us," or "our"). By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.

## 1. Who Can Use the Service

You must be at least 13 years old to use the Service. By using it, you confirm that you can form a binding agreement with us and that you will comply with these Terms and all applicable laws.

## 2. Your Account

You are responsible for keeping your login credentials secure and for all activity under your account. Please provide accurate information and keep it up to date. Notify us promptly if you believe your account has been compromised.

## 3. Subscriptions, Trials & Payments

- Prayer requests and your prayer list are free to use.
- Premium features are available by subscription, with a free trial for new accounts.
- Subscriptions are billed through the Apple App Store or Google Play and renew automatically unless cancelled. You can manage or cancel anytime in your store account settings; cancellation takes effect at the end of the current billing period.
- Except where required by law or store policy, payments are non-refundable. Prices may change with notice.

## 4. Your Content

You keep ownership of the prayer requests, journal entries, photos, and other content you create ("Your Content"). You grant us only the limited permission needed to store and display Your Content back to you and operate the Service. Your Content is private to your account and is not shared publicly by us.

## 5. AI Import

AI Import is an optional feature that uses a third-party AI provider to turn a prayer list you photograph or paste into prayer requests for your review. Material you submit is processed only to generate your results and is not used to train AI models. You are responsible for the content you submit and should not upload information you do not have permission to share.

## 6. Acceptable Use

You agree not to misuse the Service, including by: breaking the law; infringing others' rights; uploading harmful or unlawful content; attempting to access accounts or data that are not yours; disrupting or reverse-engineering the Service; or using it to harass or harm others.

## 7. Our Content

The Service, including devotions, Scripture resources, software, and design, is owned by us or our licensors and is protected by intellectual-property laws. You may use it only as permitted by these Terms. Scripture quotations remain the property of their respective publishers.

## 8. Disclaimers

The Service is provided "as is" and "as available," without warranties of any kind. Prevail Prayer is a tool for prayer and spiritual encouragement and is not a substitute for professional medical, mental-health, legal, or financial advice. We do not guarantee that the Service will be uninterrupted, error-free, or that AI-generated results will be accurate.

## 9. Limitation of Liability

To the fullest extent permitted by law, B TWO LLC will not be liable for indirect, incidental, special, or consequential damages, or for lost data or profits, arising from your use of the Service. Our total liability for any claim is limited to the amount you paid us for the Service in the twelve months before the claim.

## 10. Termination

You may stop using the Service and delete your account at any time. We may suspend or terminate access if you violate these Terms or to protect the Service and its users. You can request deletion of your account and data by emailing [support@prevailprayer.com](mailto:support@prevailprayer.com).

## 11. Changes to These Terms

We may update these Terms from time to time. We'll post the updated version here with a new "Last updated" date and, where appropriate, notify you in the app. Continued use after changes means you accept the updated Terms.

## 12. Contact

Questions about these Terms? Email [support@prevailprayer.com](mailto:support@prevailprayer.com) or visit our contact page.`;

export const SITE_DEFAULTS: Record<string, string> = {
  privacy: PRIVACY,
  terms: TERMS,
  // support & contact ship with no CMS body — their pages are built-in HTML.
  // Text saved here is shown as an optional intro above that built-in content.
  support: "",
  contact: "",
};
