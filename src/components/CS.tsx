import React from 'react';
import { ArrowLeft, BookOpen, Heart, AlertTriangle, Shield, Users, CheckCircle, Flag } from 'lucide-react';

interface CSProps {
  onBack: () => void;
}

const CS: React.FC<CSProps> = ({ onBack }) => {
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
              <h1 className="text-xl font-bold text-slate-100">Community Standards</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Community Standards</h2>
          <p className="text-slate-400 text-sm mb-4">Last Updated: January 13, 2026</p>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            FRACT is built on the foundation of thoughtful discourse, evidence-based discussion, and mutual respect. These Community Standards guide our shared space.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Core Principles */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="w-6 h-6 text-red-400" />
              <h3 className="text-2xl font-bold text-slate-100">Core Principles</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <p>
                FRACT exists to elevate discourse through evidence, accountability, and respect. Our community is built on these fundamental principles:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Truth and Evidence</h4>
                  <p className="text-sm">Support claims with credible sources and accurate information</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Respectful Discourse</h4>
                  <p className="text-sm">Engage with others thoughtfully, even in disagreement</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Intellectual Honesty</h4>
                  <p className="text-sm">Acknowledge corrections and admit when you are wrong</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Good Faith Participation</h4>
                  <p className="text-sm">Use platform features as intended, not to manipulate or abuse</p>
                </div>
              </div>
            </div>
          </div>

          {/* Respect System */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-2xl font-bold text-slate-100">The Respect, Reject, Observe System</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT's core interaction system allows you to Respect, Reject, or Observe posts. This system is designed to promote quality content and honest discourse.
              </p>
              <div className="space-y-4 mt-4">
                <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
                  <h4 className="text-green-400 font-semibold mb-2">Respect</h4>
                  <p className="text-sm">Use Respect for content that is accurate, well-sourced, thoughtful, or contributes positively to discourse. Respect signals quality and agreement.</p>
                </div>
                <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                  <h4 className="text-red-400 font-semibold mb-2">Reject</h4>
                  <p className="text-sm">Use Reject for content that is inaccurate, misleading, harmful, or violates community standards. Reject with good faith, not simply for disagreement.</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Observe</h4>
                  <p className="text-sm">Use Observe to save content for later review without signaling agreement or disagreement. Observe when you want to track important discussions.</p>
                </div>
              </div>
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 mt-4">
                <p className="text-amber-300 text-sm">
                  <strong>Important:</strong> Coordinated manipulation of the Respect/Reject system through multiple accounts, bots, or brigading is strictly prohibited and will result in account termination.
                </p>
              </div>
            </div>
          </div>

          {/* Content Standards */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h3 className="text-2xl font-bold text-slate-100">Content Standards</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">What We Encourage</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Evidence-based arguments supported by credible sources</li>
                  <li>Nuanced discussions that acknowledge complexity</li>
                  <li>Good-faith corrections when errors are found</li>
                  <li>Respectful disagreement and constructive debate</li>
                  <li>Transparency about your expertise and perspective</li>
                  <li>Accountability through the Correction Protocol</li>
                  <li>Disclosure of AI-assisted or AI-generated content</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-2">What We Prohibit (DSA-Compliant)</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Illegal Content:</strong> Any content prohibited by EU or national law (e.g., terrorist content, illegal hate speech, child sexual abuse material).</li>
                  <li><strong>Disinformation:</strong> Intentional deception that may cause public harm or manipulate democratic processes.</li>
                  <li><strong>Harassment:</strong> Targeted bullying, stalking, or intimidation.</li>
                  <li><strong>Inauthentic Behavior:</strong> Bot manipulation, coordinated brigading, or multi-account abuse.</li>
                  <li><strong>Impersonation:</strong> Fraudulent misrepresentation of identity or affiliations.</li>
                  <li><strong>Graphic Violence:</strong> Promotion or glorification of self-harm or violence.</li>
                  <li><strong>Privacy Violations:</strong> Sharing private data (doxxing) without explicit consent.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Prohibited Behaviors */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-2xl font-bold text-slate-100">Prohibited Behaviors</h3>
            </div>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Violence and Harm</h4>
                <p className="text-sm">Threats, incitement to violence, promotion of self-harm, or glorification of violence are strictly prohibited.</p>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Harassment and Bullying</h4>
                <p className="text-sm">Targeted harassment, cyberbullying, stalking, or intimidation of individuals or groups is not allowed.</p>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Hate Speech</h4>
                <p className="text-sm">Content that attacks individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics is prohibited.</p>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Misinformation and Disinformation</h4>
                <p className="text-sm">Deliberately spreading false information, especially regarding public health, elections, or safety, is prohibited. FRACT uses AI and community signals to detect potential disinformation. Users are expected to correct errors in good faith.</p>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Manipulation and Spam</h4>
                <p className="text-sm">Coordinated inauthentic behavior, vote manipulation, spam, or abuse of platform features is not allowed. Prohibited manipulations include: coordinated reactions, mass reporting, brigading, artificial amplification, and multi-account abuse.</p>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Impersonation</h4>
                <p className="text-sm">Pretending to be someone else, using misleading account types, or fraudulent verification is prohibited.</p>
              </div>
            </div>
          </div>

          {/* Trust Score and Accountability */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-purple-400" />
              <h3 className="text-2xl font-bold text-slate-100">Trust Score and Accountability</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                Your Trust Score reflects your contributions to FRACT and your standing in the community. It is calculated based on:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Quality and accuracy of your posts</li>
                <li>Community responses (Respects, Rejects, Corrections)</li>
                <li>Source citation and verification</li>
                <li>Good-faith participation in corrections</li>
                <li>Adherence to Community Standards</li>
                <li>Account age and verification status</li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  A higher Trust Score increases your visibility and influence on the platform. Violations of Community Standards will negatively impact your Trust Score.
                </p>
              </div>
            </div>
          </div>

          {/* Correction Protocol */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
              <h3 className="text-2xl font-bold text-slate-100">Correction Protocol</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT's Correction Protocol is designed to maintain accuracy and accountability. When factual errors occur, the community can issue corrections.
              </p>
              <div className="space-y-3 mt-4">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Issuing Corrections</h4>
                  <p className="text-sm">Corrections must be specific, evidence-based, and submitted in good faith. Cite credible sources to support your correction.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Receiving Corrections</h4>
                  <p className="text-sm">When you receive a correction, review it objectively. Accepting valid corrections demonstrates intellectual honesty and improves your Trust Score.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Perspective Lock</h4>
                  <p className="text-sm">Posts can be Perspective-Locked when evidence overwhelmingly supports one view. This prevents manipulation while allowing documented counterarguments.</p>
                </div>
              </div>
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 mt-4">
                <p className="text-amber-300 text-sm">
                  <strong>Note:</strong> Frivolous or malicious corrections that waste community resources may result in penalties to your Trust Score.
                </p>
              </div>
            </div>
          </div>

          {/* Account Types */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-indigo-400" />
              <h3 className="text-2xl font-bold text-slate-100">Account Types and Transparency</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT supports different account types to promote transparency about who is speaking:
              </p>
              <div className="space-y-3 mt-4">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Personal Accounts</h4>
                  <p className="text-sm">Individual users speaking for themselves. Must accurately declare any professional affiliations or expertise.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Media Accounts</h4>
                  <p className="text-sm">Individuals speaking in a professional capacity. Must declare their organization and scope of authority through Account Scope Declaration.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Verified Accounts</h4>
                  <p className="text-sm">Accounts that have been verified by FRACT. Verification confirms identity and representation, not the accuracy of content or claims.</p>
                </div>
              </div>
              <p className="mt-4">
                Misrepresenting your account type, credentials, or affiliations is a serious violation of Community Standards.
              </p>
            </div>
          </div>

          {/* Reporting and Enforcement */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Flag className="w-6 h-6 text-orange-400" />
              <h3 className="text-2xl font-bold text-slate-100">Reporting and Enforcement</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                If you encounter content or behavior that violates Community Standards, you can report it. Our moderation team reviews reports and takes appropriate action.
              </p>
              <div className="space-y-3 mt-4">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">How to Report</h4>
                  <p className="text-sm">Use the report feature on posts or profiles. Provide specific details about the violation and any relevant context.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Enforcement Actions</h4>
                  <p className="text-sm">Violations may result in content removal, Trust Score penalties, temporary suspension, or permanent account termination, depending on severity.</p>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-slate-100 font-semibold mb-2">Appeals</h4>
                  <p className="text-sm">If you believe enforcement action was taken in error, you may appeal through the Feedback system with additional context.</p>
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mt-4">
                <p className="text-red-300 text-sm">
                  <strong>False Reports:</strong> Submitting false or malicious reports is itself a violation and may result in penalties to your account.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy and Safety */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-teal-400" />
              <h3 className="text-2xl font-bold text-slate-100">Privacy and Safety</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                Your safety and privacy are important to us. FRACT provides tools to control your experience:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Block users to prevent them from seeing or interacting with your content</li>
                <li>Control visibility of your following list and interaction history</li>
                <li>Report concerning behavior or content</li>
                <li>Manage your privacy settings in account preferences</li>
              </ul>
              <p className="mt-4">
                Never share personal information publicly that could compromise your safety. See our Privacy Policy for more information about data protection.
              </p>
            </div>
          </div>

          {/* Conclusion */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="w-6 h-6 text-pink-400" />
              <h3 className="text-2xl font-bold text-slate-100">Building FRACT Together</h3>
            </div>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT succeeds when every member upholds these Community Standards. By participating, you contribute to a platform where truth, evidence, and respectful discourse thrive.
              </p>
              <p>
                We continuously evolve these standards based on community feedback and emerging challenges. Your input through the Feedback system helps shape FRACT's future.
              </p>
              <p className="text-slate-400 text-sm mt-4">
                Thank you for being part of the FRACT community. Together, we elevate discourse.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS;
