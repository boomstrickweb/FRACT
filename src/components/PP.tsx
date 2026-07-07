import React from 'react';
import { ArrowLeft, Lock, Shield, Eye, Database, UserCheck, Bell } from 'lucide-react';

interface PPProps {
  onBack: () => void;
}

const PP: React.FC<PPProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Privacy Policy</h2>
          <p className="text-slate-400 text-sm">Last Updated: January 13, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Introduction */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h3 className="text-2xl font-bold text-slate-100">Our Commitment to Privacy</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                At FRACT, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, in compliance with the General Data Protection Regulation (GDPR) and other applicable privacy laws.
              </p>
              <p>
                We operate under the principle of data minimization—only collecting what is strictly necessary for FRACT's unique evidence-based ecosystem. We are committed to transparency about our data practices and giving you control over your personal information.
              </p>
            </div>
          </div>

          {/* Information We Collect */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-green-400" />
              <h3 className="text-2xl font-bold text-slate-100">Information We Collect</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">1. Information You Provide</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Account Information:</strong> Name, email address and profile information</li>
                  <li><strong>Profile Details:</strong> Profile picture, bio, account type (Personal/Media), account scope declarations</li>
                  <li><strong>Content:</strong> Posts, comments, corrections, sources, and other content you create or share</li>
                  <li><strong>Communications:</strong> Feedback, support requests, and messages sent through the platform</li>
                  <li><strong>Verification Data:</strong> Information provided for account verification purposes</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">2. Automatically Collected Information</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Usage Data:</strong> Posts you respect, reject, or observe; accounts you follow; search queries</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers. FRACT uses IP address for security, fraud prevention, and regional availability checks (currently restricted to the United States and Germany).</li>
                  <li><strong>Session Data:</strong> Login times, session duration, active devices, and locations</li>
                  <li><strong>Interaction Data:</strong> How you interact with posts, users, and features on the platform</li>
                  <li><strong>Trust Score Data:</strong> Metrics that contribute to your Trust Score calculation</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">3. Information from Third Parties</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Authentication services if you sign in through third-party providers</li>
                  <li>Publicly available information used for verification purposes</li>
                  <li>Information from integrated services or APIs you choose to connect</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <UserCheck className="w-6 h-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-slate-100">Legal Basis for Processing</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <p>We process your personal data under the following legal bases:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Contractual Necessity:</strong> To provide the FRACT service as described in our Terms of Service.</li>
                <li><strong>Legitimate Interests:</strong> To maintain platform integrity, calculate Trust Scores, and prevent abuse/fraud.</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws, including the Digital Services Act (DSA) requirements for moderation transparency.</li>
                <li><strong>Consent:</strong> Where you have given us clear consent for a specific purpose (e.g., location-based features).</li>
              </ul>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <UserCheck className="w-6 h-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-slate-100">How We Use Your Information</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Provide and Improve Services:</strong> Operate FRACT, personalize your experience, and develop new features</li>
                <li><strong>Trust Score Calculation:</strong> Determine and update your Trust Score based on platform activity (automated processing)</li>
                <li><strong>Content Moderation:</strong> Enforce Community Standards and DSA requirements using automated AI classification and community signals</li>
                <li><strong>Communication:</strong> Send notifications, updates, security alerts, and respond to your inquiries</li>
                <li><strong>Analytics:</strong> Understand how users interact with FRACT and improve platform performance</li>
                <li><strong>Security:</strong> Detect, prevent, and address fraud, abuse, and security threats using IP tracking and action passwords</li>
                <li><strong>Legal Compliance:</strong> Comply with legal obligations, enforce our Terms of Service, and manage regional availability</li>
              </ul>
            </div>
          </div>

          {/* Information Sharing */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Eye className="w-6 h-6 text-amber-400" />
              <h3 className="text-2xl font-bold text-slate-100">Information Sharing and Disclosure</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">Public Information</h4>
                <p>
                  Your profile information, posts, and certain activities on FRACT are public by default. This includes your username, profile picture, bio, posts, and public interactions. You can control some privacy settings through your account preferences.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">We Share Information:</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>With Other Users:</strong> As necessary for platform functionality (e.g., when you post, follow, or interact)</li>
                  <li><strong>Service Providers:</strong> With vendors who help us operate the platform (hosting, analytics, security)</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or legal process</li>
                  <li><strong>Safety and Security:</strong> To protect rights, property, and safety of FRACT, users, or others</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">We Do Not:</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Sell your personal information to third parties</li>
                  <li>Share your email address publicly without consent</li>
                  <li>Disclose private messages or communications except as required by law</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Your Privacy Rights */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="w-6 h-6 text-red-400" />
              <h3 className="text-2xl font-bold text-slate-100">Your Privacy Rights (GDPR)</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>Under GDPR, you have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Right of Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong>Right to Rectification:</strong> Update or correct inaccurate information in your profile settings.</li>
                <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Delete your account and associated personal data at any time.</li>
                <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format (JSON) via Settings.</li>
                <li><strong>Right to Restrict Processing:</strong> Request that we limit how we use your data in certain circumstances.</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests, including Trust Score automated signals.</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent.</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, visit your account settings or contact us through the Feedback feature. You also have the right to lodge a complaint with a data protection authority.
              </p>
            </div>
          </div>

          {/* Data Security */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h3 className="text-2xl font-bold text-slate-100">Data Security</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure session management and monitoring</li>
                <li>Regular security updates and patches</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-indigo-400" />
              <h3 className="text-2xl font-bold text-slate-100">Data Retention</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                We retain your information for as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. Retention periods vary depending on the type of information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after deletion</li>
                <li><strong>Content:</strong> Public posts may remain accessible after account deletion, but attribution may be anonymized</li>
                <li><strong>Session Data:</strong> Retained for security and analytics purposes for up to 90 days</li>
                <li><strong>Legal Data:</strong> Information required for legal compliance retained as required by law</li>
              </ul>
            </div>
          </div>

          {/* Children's Privacy */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <UserCheck className="w-6 h-6 text-pink-400" />
              <h3 className="text-2xl font-bold text-slate-100">Children's Privacy</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information promptly.
              </p>
              <p>
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us through the Feedback feature.
              </p>
            </div>
          </div>

          {/* International Data Transfers */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Eye className="w-6 h-6 text-teal-400" />
              <h3 className="text-2xl font-bold text-slate-100">International Data Transfers</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT operates globally. Your information may be transferred to, stored, and processed in countries other than your country of residence. These countries may have data protection laws different from those in your country.
              </p>
              <p>
                By using FRACT, you consent to the transfer of your information to our facilities and service providers wherever they are located. We take appropriate safeguards to ensure your information receives adequate protection.
              </p>
            </div>
          </div>

          {/* Changes to Privacy Policy */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="w-6 h-6 text-yellow-400" />
              <h3 className="text-2xl font-bold text-slate-100">Changes to This Privacy Policy</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on the platform. We encourage you to review this policy periodically.
              </p>
              <p>
                Your continued use of FRACT after changes to this Privacy Policy constitutes your acceptance of the updated policy.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-6 h-6 text-slate-400" />
              <h3 className="text-2xl font-bold text-slate-100">Contact Us</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us through the Feedback feature in your Settings.
              </p>
              <p className="text-slate-400 text-sm mt-4">
                By using FRACT, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PP;
