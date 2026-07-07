import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft } from 'lucide-react';

interface Country {
  name: string;
  code: string;
  reason: string;
}

const countries: Country[] = [
  {
    name: "United States",
    code: "us",
    reason: "Home to the largest early FRACT community, making it the natural starting point for our rollout."
  },
  {
    name: "United Kingdom",
    code: "gb",
    reason: "A long tradition of open public debate and one of FRACT's earliest and strongest user communities."
  },
  {
    name: "Canada",
    code: "ca",
    reason: "A country that balances individual freedoms with a respectful public discourse."
  },
  {
    name: "Netherlands",
    code: "nl",
    reason: "Recognized for its open internet culture and forward-looking approach to digital society."
  },
  {
    name: "Germany",
    code: "de",
    reason: "A strong commitment to privacy and one of the world's most trusted legal frameworks."
  },
  {
    name: "Ireland",
    code: "ie",
    reason: "A global technology hub where innovation and democratic values go hand in hand."
  },
  {
    name: "Denmark",
    code: "dk",
    reason: "Built on exceptionally high public trust and strong digital institutions."
  },
  {
    name: "Norway",
    code: "no",
    reason: "Consistently setting a global standard for democracy, transparency, and civic trust."
  },
  {
    name: "Finland",
    code: "fi",
    reason: "Known for digital resilience, media literacy, and one of the world's most trusted societies."
  },
  {
    name: "Sweden",
    code: "se",
    reason: "A long-standing culture of openness that has shaped the modern digital world."
  },
  {
    name: "Australia",
    code: "au",
    reason: "Bringing FRACT's vision to the Asia–Pacific region through a stable democratic environment."
  },
  {
    name: "New Zealand",
    code: "nz",
    reason: "A reputation for accountable institutions and a people-first approach to governance."
  },
  {
    name: "Switzerland",
    code: "ch",
    reason: "Internationally respected for neutrality, stability, and strong protection of personal privacy."
  },
  {
    name: "Estonia",
    code: "ee",
    reason: "One of the world's most digitally advanced nations, built around secure digital citizenship."
  },
  {
    name: "Japan",
    code: "jp",
    reason: "Combining technological excellence with long-term institutional stability."
  },
  {
    name: "Iceland",
    code: "is",
    reason: "Completing the list with one of the world's strongest traditions of freedom of expression and open society."
  }
];

const AvailableCountries: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          Back
        </button>

        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-slate-800 rounded-2xl">
              <Globe className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Available Countries
          </h1>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            FRACT is expanding globally, starting with nations that share our commitment to open discourse, privacy, and democratic values.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {countries.map((country) => (
            <div 
              key={country.name}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-8 flex-shrink-0 grayscale-[0.5] group-hover:grayscale-0 transition-all overflow-hidden rounded-md shadow-sm border border-slate-700/50">
                  <img 
                    src={`https://flagcdn.com/w80/${country.code}.png`}
                    srcSet={`https://flagcdn.com/w160/${country.code}.png 2x`}
                    alt={`${country.name} flag`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-semibold text-slate-100">
                  {country.name}
                </h2>
              </div>
              <p className="text-slate-400 leading-relaxed">
                {country.reason}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-slate-500 text-sm">
          <p>© 2026 FRACT. Expanding the horizons of digital discourse.</p>
        </div>
      </div>
    </div>
  );
};

export default AvailableCountries;
