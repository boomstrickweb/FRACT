import React from 'react';
import { ArrowLeft, Copyright } from 'lucide-react';

interface CPProps {
  onBack: () => void;
}

const CP: React.FC<CPProps> = ({ onBack }) => {
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
              <h1 className="text-xl font-bold text-slate-100">Copyright Policy</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Copyright className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Copyright Policy</h2>
          <p className="text-slate-400 text-sm">Intellectual Property Rights & Protection</p>
        </div>

        {/* Content */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-8">
          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">1. Ownership of Content</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                The FRACT platform, including its visual interface, graphics, design, compilation, information, computer code (including source code or object code), products, software, services, and all other elements of the platform (the "Materials") are protected by copyright, trade dress, patent, and trademark laws, international conventions, and all other relevant intellectual property and proprietary rights, and applicable laws.
              </p>
              <p>
                All Materials contained on the platform are the property of <strong className="text-slate-200">Boomstrick</strong> or its subsidiaries or affiliated companies and/or third-party licensors.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">2. User-Generated Content</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                Users retain their copyright and any other proprietary rights they hold in the content they post on FRACT. However, by posting content, you grant FRACT a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform that content in connection with the platform and FRACT's business.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">3. DMCA Notice & Takedown Procedure</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT respects the intellectual property rights of others. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible on our platform, please notify us.
              </p>
              <p>To be effective, the notification must include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed.</li>
                <li>Information reasonably sufficient to permit FRACT to contact the complaining party, such as an address, telephone number, and, if available, an electronic mail address.</li>
                <li>A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">4. Repeat Infringer Policy</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                FRACT will terminate the accounts of users who are determined to be repeat infringers of the intellectual property rights of others.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">5. Contact Information</h3>
            <div className="text-slate-300 space-y-3 leading-relaxed">
              <p>
                For any copyright-related inquiries or notices, please contact us via the "Feedback" section in Settings.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">Last Updated</h3>
            <div className="text-slate-300 leading-relaxed">
              <p>July 6, 2026</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CP;
