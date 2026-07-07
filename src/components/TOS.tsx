import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

interface TOSProps {
  onBack: () => void;
}

const TOS: React.FC<TOSProps> = ({ onBack }) => {
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
              <h1 className="text-xl font-bold text-slate-100">Terms of Service</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Terms of Service</h2>
          <p className="text-slate-400 text-sm">Last Updated: January 13, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">1. Agreement to Terms</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                Welcome to FRACT. By accessing or using our platform, you agree to be bound by these Terms of Service and all applicable laws and regulations, including the Digital Services Act (DSA) and General Data Protection Regulation (GDPR).
              </p>
              <p>
                FRACT is a social platform designed to facilitate thoughtful discourse and evidence-based discussion. We reserve the right to modify these terms at any time, and such modifications will be effective immediately upon posting.
              </p>
            </div>
          </section>

          {/* Account Terms */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">2. Account Terms</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Account Creation:</strong> You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials, including your Action Password.
              </p>
              <p>
                <strong className="text-slate-200">Account Responsibility:</strong> You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>
              <p>
                <strong className="text-slate-200">Eligibility:</strong> You must be at least 13 years old to use FRACT. If you are under 18, you confirm that you have parental or guardian consent to use this platform. You must also be located in an authorized region.
              </p>
              <p>
                <strong className="text-slate-200">Account Types:</strong> FRACT offers different account types including Personal and Media profiles. You agree to accurately represent your account type and scope of authority.
              </p>
            </div>
          </section>

          {/* User Content */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">3. User Content and Conduct</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Content Ownership:</strong> You retain all rights to the content you post on FRACT. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content on the platform.
              </p>
              <p>
                <strong className="text-slate-200">Content Standards:</strong> You agree not to post content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable. Content must comply with our Community Standards.
              </p>
              <p>
                <strong className="text-slate-200">Moderation and DSA Compliance:</strong> FRACT employs both human moderation and algorithmic tools to ensure compliance with our Community Standards. In accordance with the Digital Services Act, users will be notified of moderation decisions affecting their content and have the right to appeal such decisions through our internal complaint-handling system.
              </p>
              <p>
                <strong className="text-slate-200">AI Content Disclosure:</strong> You are encouraged to disclose when content is AI-assisted or AI-generated. FRACT uses automated systems to detect and tag such content for transparency.
              </p>
              <p>
                <strong className="text-slate-200">Evidence-Based Posting:</strong> When making factual claims, you are encouraged to provide sources and evidence. Posts marked with sources carry additional weight in the FRACT ecosystem. FRACT does not guarantee the accuracy of cited sources.
              </p>
              <p>
                <strong className="text-slate-200">Respect and Reject System:</strong> FRACT's core features include the ability to Respect, Reject, or Observe posts. Abuse of this system, including coordinated manipulation or brigading, is strictly prohibited.
              </p>
            </div>
          </section>

          {/* Trust Score and Verification */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">4. Trust Score and Verification</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Trust Score:</strong> FRACT calculates a Trust Score based on your activity, content quality, and community interactions. This score affects your visibility and influence on the platform. The Trust Score is an internal and discretionary system. FRACT does not guarantee equal reach, visibility, or distribution for all users.
              </p>
              <p>
                <strong className="text-slate-200">Verification:</strong> Verified accounts have been authenticated by FRACT. Impersonation or fraudulent verification attempts will result in immediate account suspension.
              </p>
              <p>
                <strong className="text-slate-200">Score Manipulation:</strong> Any attempt to artificially inflate your Trust Score or manipulate the scoring system is prohibited and may result in permanent account termination.
              </p>
            </div>
          </section>

          {/* Correction Protocol */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">5. Correction Protocol</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Issue Corrections:</strong> Users may issue corrections to posts containing factual errors. The Correction Protocol is designed to maintain accuracy and integrity of information.
              </p>
              <p>
                <strong className="text-slate-200">Correction Standards:</strong> Corrections must be supported by credible evidence and submitted in good faith. Malicious or frivolous corrections may result in penalties to your Trust Score.
              </p>
              <p>
                <strong className="text-slate-200">Author Response:</strong> Post authors have the right to respond to corrections and may accept, reject, or provide additional context.
              </p>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">6. Prohibited Activities</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate any local, state, national, or international law</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Transmit spam, chain letters, or other unsolicited communications</li>
                <li>Distribute viruses or malicious code</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate any person or entity</li>
                <li>Collect or store personal data of other users without consent</li>
                <li>Use automated systems (bots) without authorization</li>
                <li>Attempt to gain unauthorized access to the platform</li>
                <li>Manipulate the platform's features or algorithms</li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">7. Intellectual Property</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                The FRACT platform, including its design, features, functionality, and content (excluding user-generated content), is owned by Boomstrick and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any content from FRACT without prior written consent.
              </p>
            </div>
          </section>

          {/* Termination */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">8. Termination</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                We reserve the right to terminate or suspend your account at any time, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
              </p>
              <p>
                Upon termination, your right to use the platform will immediately cease. We may retain certain information as required by law or for legitimate business purposes.
              </p>
              <p>
                You may delete your account at any time through your account settings. Some information may be retained for legal or operational purposes.
              </p>
            </div>
          </section>

          {/* Disclaimers */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">9. Disclaimers and Limitations of Liability</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Service Provided "As Is":</strong> FRACT is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied.
              </p>
              <p>
                <strong className="text-slate-200">User Content:</strong> We do not endorse, support, represent, or guarantee the accuracy or reliability of any user-generated content. You acknowledge that reliance on such content is at your own risk.
              </p>
              <p>
                <strong className="text-slate-200">Limitation of Liability:</strong> To the maximum extent permitted by law, FRACT shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">10. Indemnification</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                You agree to indemnify, defend, and hold harmless FRACT, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising from your use of the platform or violation of these Terms of Service.
              </p>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">11. Dispute Resolution and DSA Appeals</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Internal Complaint-Handling:</strong> If you disagree with a moderation decision (e.g., content removal, account suspension), you may submit an appeal through our internal system within 6 months of the decision.
              </p>
              <p>
                <strong className="text-slate-200">Out-of-Court Dispute Settlement:</strong> In accordance with the DSA, users in the EU have the right to select any out-of-court dispute settlement body that has been certified by a Digital Services Coordinator to resolve disputes relating to moderation decisions.
              </p>
              <p>
                <strong className="text-slate-200">Informal Resolution:</strong> For all other disputes, you agree to first contact us to attempt to resolve the dispute informally.
              </p>
              <p>
                <strong className="text-slate-200">Governing Law:</strong> These Terms shall be governed by and construed in accordance with applicable laws of the jurisdiction where FRACT is officially registered, without regard to conflict of law principles.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">12. Changes to Terms</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or platform notification. Your continued use of FRACT after such modifications constitutes acceptance of the updated Terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">13. Contact Information</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                If you have questions about these Terms of Service, please contact us through the Feedback feature in your Settings, or reach out to our support team.
              </p>
              <p className="text-slate-400 text-sm mt-4">
                By using FRACT, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TOS;
