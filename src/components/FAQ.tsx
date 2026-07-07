import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Home, Search, PlusCircle, User, Settings, Bell, Shield, Heart, Radio, BookOpen, AlertTriangle, MessageSquare, Layers } from 'lucide-react';

interface FAQProps {
  onBack: () => void;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC<FAQProps> = ({ onBack }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sections: FAQSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Home className="w-5 h-5" />,
      items: [
        {
          question: 'What is FRACT?',
          answer: 'FRACT is a social platform built around thoughtful engagement. Instead of likes and viral content, FRACT uses a Respect / Reject / Observe reaction system that encourages genuine responses to posts. The platform uses AI to detect content quality and AI-generated material, supporting two types of accounts -- Personal and Media -- each with different tools and responsibilities.'
        },
        {
          question: 'Where is FRACT available?',
          answer: 'FRACT is currently available to users in the United States and Germany. We use IP-based geolocation to ensure compliance with regional availability. We plan to expand to more regions in the future.'
        },
        {
          question: 'How do I create an account?',
          answer: 'Tap "Get Started" on the landing page and enter your email address. You\'ll receive a one-time code to verify your email. Once verified, your account is created automatically and you\'re taken to the main feed. Disposable or temporary email addresses are not accepted.'
        },
        {
          question: 'Where is the main navigation?',
          answer: 'The bottom navigation bar has four items: Home (your feed), Search (find people and posts), the "+" button (create a new post), and your Profile. Additional features like Notifications and Settings are accessible from icons in the top header of the feed.'
        },
        {
          question: 'How do I set up my profile?',
          answer: 'Tap your profile icon in the bottom bar, then tap "Edit Profile." You can set your name, bio, beliefs, field of interest, profile picture, and cover photo. You can also create your Soulcode here -- a three-part personality fingerprint used for soulmate matching.'
        }
      ]
    },
    {
      id: 'feed',
      title: 'Feed & Discovery',
      icon: <Layers className="w-5 h-5" />,
      items: [
        {
          question: 'What are the different feed tabs?',
          answer: 'Your feed has three sub-tabs. "Discover" shows public posts from all users. "Following" shows posts only from people you follow. "Echoes" surfaces posts that are similar to your own content, helping you find like-minded voices.'
        },
        {
          question: 'What is the Echoes tab?',
          answer: 'Echoes finds posts that are semantically similar to your own writing using AI-powered content matching. Posts are grouped into three tiers: Weak Echo (loosely similar in theme), Strong Echo (clearly aligned in meaning), and Total Resonance (highly similar in both content and structure). You can filter by tier to explore different levels of alignment.'
        },
        {
          question: 'What is the Soulmates tab?',
          answer: 'The Soulmates tab shows users matched to you based on your Soulcode. To use it, you first need to create your Soulcode in Edit Profile by choosing your Core Drive, Value Spectrum, and Social Vibe. The system then finds people with compatible personality profiles.'
        },
        {
          question: 'Why don\'t I see certain posts in Discover?',
          answer: 'Posts that have been moderated for policy violations, posts from users you have blocked, and expired disappearing posts are excluded from the Discover feed. Explicit content is visible but blurred until you choose to reveal it.'
        }
      ]
    },
    {
      id: 'posts',
      title: 'Creating Posts',
      icon: <PlusCircle className="w-5 h-5" />,
      items: [
        {
          question: 'What types of posts can I create?',
          answer: 'There are three post types. Text posts allow up to 420 characters. Quote posts have a quote body (up to 300 characters) plus an attribution line (up to 100 characters). Voice posts let you record audio up to 60 seconds.'
        },
        {
          question: 'What is a Perspective Lock?',
          answer: 'A Perspective Lock is an optional tag you can add to clarify your post\'s intent. The options are Opinion, Question, Hypothesis, and Personal Experience. It appears as a label on your post so readers understand the framing before reacting.'
        },
        {
          question: 'What are Disappearing Posts?',
          answer: 'You can set a post to auto-delete after a certain time. Preset options are 5 minutes, 15 minutes, 1 hour, 6 hours, 24 hours, or 1 week. You can also enter a custom duration. Readers will see a countdown timer on these posts.'
        },
        {
          question: 'Can I post anonymously?',
          answer: 'Yes. When creating a post, enable the "Anonymous" toggle under advanced options. Your post will be published without your name, profile picture, or any link to your profile. Anonymous posts cannot be traced back to you by other users.'
        },
        {
          question: 'What does "Explicit Content" do?',
          answer: 'Toggling the Explicit Content option marks your post as containing sensitive material. The post will appear blurred in feeds, and readers must tap to reveal it. This helps others choose whether they want to view the content.'
        },
        {
          question: 'Can I edit or delete my posts?',
          answer: 'Text and Quote posts can be edited after publishing -- tap the menu on your post and select Edit. Voice posts cannot be edited. Any post can be deleted by its author through the same menu. Edit history is visible to others so changes are transparent. Media profiles have a stricter Correction Protocol for edits.'
        },
        {
          question: 'How does FRACT handle AI-generated content?',
          answer: 'FRACT uses automated systems to detect and tag content that appears to be AI-generated or AI-assisted. Users can also manually flag their own content as AI-generated. This ensures transparency for readers. Undisclosed AI content presented as human-made is a violation of our Community Standards.'
        },
        {
          question: 'Can I reply to other posts?',
          answer: 'Yes. When viewing a post, you can create a reply. The reply creation screen shows a preview of the original post you\'re responding to, and your reply will be linked to it.'
        }
      ]
    },
    {
      id: 'reactions',
      title: 'Reactions & Engagement',
      icon: <Heart className="w-5 h-5" />,
      items: [
        {
          question: 'What are Respect, Reject, and Observe?',
          answer: 'These are FRACT\'s three reactions, replacing traditional likes. "Respect" signals agreement or appreciation. "Reject" signals disagreement or disapproval. "Observe" means you\'ve acknowledged the post without taking a side. You can only choose one reaction per post.'
        },
        {
          question: 'Who can see reaction counts?',
          answer: 'Only the post\'s author can see the exact number of Respects, Rejects, and Observations their post has received. Other users cannot see these counts -- they only see their own reaction if they\'ve given one.'
        },
        {
          question: 'What does saving a post do?',
          answer: 'Saving a post bookmarks it to your Saved tab on your profile. This lets you revisit posts you found valuable. Only you can see your saved posts.'
        },
        {
          question: 'Can I rate posts with stars?',
          answer: 'Star ratings (1 to 5) are available only on posts from Media profiles. This gives readers a way to evaluate the quality and credibility of media content specifically.'
        }
      ]
    },
    {
      id: 'profile',
      title: 'Your Profile',
      icon: <User className="w-5 h-5" />,
      items: [
        {
          question: 'What tabs are on my profile?',
          answer: 'Your profile has six tabs: Posts (your published content), Respected (posts you\'ve respected), Rejected (posts you\'ve rejected), Observed (posts you\'ve observed), Saved (your bookmarks), and Following (people you follow). Some of these tabs can be made private in Settings.'
        },
        {
          question: 'Can others see my reactions?',
          answer: 'By default, your Respected, Rejected, and Observed tabs may be visible on your profile. You can control this in Settings under the Privacy tab -- toggle each one on or off independently.'
        },
        {
          question: 'What is a Soulcode?',
          answer: 'A Soulcode is a three-part personality fingerprint you create in Edit Profile. It consists of your Core Drive (what motivates you), Value Spectrum (how you see the world), and Social Vibe (how you engage). Options include things like Freedom, Order, Rationalist, Humanist, Calm, Bold, and more.'
        },
        {
          question: 'What are Beliefs and Field of Interest?',
          answer: 'These are profile attributes you can set in Edit Profile. Beliefs include options like Analyst, Humanist, Progressive, Conservative, Realist, and others. Field of Interest covers topics like Politics, Science/Tech, Philosophy, Business, Health, and more. They help others understand your perspective.'
        },
        {
          question: 'How do I follow or unfollow someone?',
          answer: 'Visit their profile and tap the Follow button. To unfollow, tap the Following button on their profile -- you\'ll be asked to confirm. You can also follow/unfollow from search results and follower/following lists.'
        },
        {
          question: 'Is my Following list visible to others?',
          answer: 'No. Your Following list is always private. Only you can see who you follow. Your Followers list, however, is visible to anyone who visits your profile.'
        }
      ]
    },
    {
      id: 'media-profiles',
      title: 'Media Profiles',
      icon: <Radio className="w-5 h-5" />,
      items: [
        {
          question: 'What is a Media profile?',
          answer: 'A Media profile is designed for accounts that share journalistic, analytical, or informational content. Media profiles are held to higher standards of accountability: they must declare sources, follow a correction protocol for edits, and maintain a public Trust Score.'
        },
        {
          question: 'How do I convert to a Media profile?',
          answer: 'Go to your profile and tap "Convert to Media Profile." You\'ll complete an Account Scope Declaration, selecting 2-5 topics you cover and 2 or more topics you explicitly do not cover (like medical advice or legal advice). This conversion is permanent and cannot be reversed.'
        },
        {
          question: 'What is the Account Scope Declaration?',
          answer: 'This is a public statement of what your Media profile covers and does not cover. It\'s shown on your profile so readers know the boundaries of your content. Topics span categories like Breaking News, Investigative Journalism, Social Commentary, Technology Review, and more.'
        },
        {
          question: 'What is Source Attribution?',
          answer: 'When creating a post as a Media profile, you must declare your source information: the number of sources (3, 4, or 5) and the type (Original Reporting, Opinion/Commentary, or Public Knowledge). This is visible to readers and builds transparency.'
        },
        {
          question: 'What is the Correction Protocol?',
          answer: 'When a Media profile edits a post, they must explain what was wrong and what was fixed. This creates a public correction timeline that anyone can view, showing every revision with its explanation. This holds media accounts accountable for accuracy.'
        },
        {
          question: 'What is Trust Score?',
          answer: 'Trust Score is a metric displayed on Media profiles that reflects their track record on the platform. It\'s visible on the profile page and in Settings (for media accounts only). The score helps readers gauge the reliability of a media source.'
        }
      ]
    },
    {
      id: 'search',
      title: 'Search & Soulmates',
      icon: <Search className="w-5 h-5" />,
      items: [
        {
          question: 'How do I search for people or posts?',
          answer: 'Tap the Search icon in the bottom navigation. You can switch between two tabs: Profiles (to find users by name or username) and Posts (to find content by keywords). Results update as you type.'
        },
        {
          question: 'How does "Find Your Soulmate" work?',
          answer: 'On the Search page, below the search bar, you\'ll see a "Find Your Soulmate" section if you\'ve created a Soulcode. Tapping it triggers the matching system, which searches for users with compatible Soulcodes and navigates you to a matched profile.'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      items: [
        {
          question: 'What notifications will I receive?',
          answer: 'You\'ll be notified when someone you follow publishes a new post, when someone follows you, and when someone mentions you. Each notification shows the relevant user and a description of the event.'
        },
        {
          question: 'How do I manage notifications?',
          answer: 'Open Notifications from the bell icon in the feed header. You can mark individual notifications as read by tapping them, or mark all as read at once. You can also toggle notifications on or off entirely from the settings card within the Notifications screen.'
        }
      ]
    },
    {
      id: 'privacy-security',
      title: 'Privacy & Security',
      icon: <Shield className="w-5 h-5" />,
      items: [
        {
          question: 'What is an Action Password?',
          answer: 'An Action Password is an additional layer of security for sensitive operations like deleting your account or converting to a Media profile. You set it up in Settings, and it must be entered to authorize these specific actions.'
        },
        {
          question: 'Where are my privacy settings?',
          answer: 'Go to Settings (gear icon in the feed header) and tap the Privacy tab. Here you can toggle the visibility of your Respected, Rejected, and Observed post tabs on your profile.'
        },
        {
          question: 'How do I block someone?',
          answer: 'Visit the user\'s profile, tap the menu icon, and select "Block." Blocked users cannot see your content or interact with you. You can manage your blocked list in Settings under the Blocked tab, where you can also unblock users.'
        },
        {
          question: 'How do I report a user or post?',
          answer: 'For posts, tap the menu on the post and select "Report." For users, visit their profile and select "Report" from the menu. You\'ll choose a category (like Harassment, Hate Speech, Misinformation, or Spam) and can add an optional description. Track your reports in Settings under the Reported tab.'
        },
        {
          question: 'What are active sessions?',
          answer: 'In Settings under the Sessions tab, you can see all devices where your account is signed in. Each session shows the device, location, and last activity time. You can end any session remotely or clean up old inactive sessions.'
        },
        {
          question: 'How do I mute someone?',
          answer: 'Visit a user\'s profile, tap the menu icon, and select "Mute." Muted users\' posts will no longer appear in your feed, but they can still see and interact with your content. Unlike blocking, muting is one-sided and invisible to the other person. You can manage your muted list in Settings under the Blocked tab.'
        },
        {
          question: 'How do I sign out?',
          answer: 'Scroll to the bottom of any Settings tab to find the Sign Out button. This signs you out on the current device only.'
        }
      ]
    },
    {
      id: 'account-management',
      title: 'Account Management',
      icon: <Settings className="w-5 h-5" />,
      items: [
        {
          question: 'Where can I see my account information?',
          answer: 'Go to Settings and open the Info tab. You\'ll see your account status (Active or Limited), account type (Personal or Media), verification status, membership date, and your community response summary based on how others react to your posts.'
        },
        {
          question: 'What does "Limited" account status mean?',
          answer: 'A Limited status means some of your posts have reduced visibility due to moderation actions. This can happen if posts are flagged for policy violations. The status is shown in your Settings under the Info tab.'
        },
        {
          question: 'How do I export my data?',
          answer: 'In Settings on the Info tab, tap "Export Your Data." You can select which data to include: profile information, posts, reactions, followers and following counts, saved posts, and session history. Your data is downloaded as a JSON file.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'In Settings on the Info tab, scroll to the bottom and tap "Delete My Account." You\'ll see a warning about what will be permanently removed: your profile, all posts, interactions, followers, following lists, and session data. This action cannot be undone.'
        },
        {
          question: 'What is the Community Response?',
          answer: 'Found in Settings under the Info tab, this shows how other users generally react to your posts. It can be "Mostly Respected," "Often Rejected," "Mixed Reactions," or "Low Activity" depending on the ratio of reactions your content receives.'
        }
      ]
    },
    {
      id: 'content-moderation',
      title: 'Content & Moderation',
      icon: <AlertTriangle className="w-5 h-5" />,
      items: [
        {
          question: 'How does content moderation work?',
          answer: 'FRACT uses a combination of AI-powered text classification and community reporting to identify content that violates our standards. Posts are scored on severity: Low and Medium cases may have reduced visibility, while High severity cases are quarantined and sent for manual review.'
        },
        {
          question: 'What is the Manual Review appeal system?',
          answer: 'If your content is moderated and you believe it was an error, you can request a Manual Review. For High severity cases, a review is often automatically initiated. For others, you can submit an appeal through the moderation notice on your post, explaining why the decision should be overturned.'
        },
        {
          question: 'What is Edit History?',
          answer: 'Every time a post is edited, the previous version is saved. Anyone can view a post\'s Edit History to see all past versions with timestamps. This ensures transparency -- readers can see what changed and when.'
        },
        {
          question: 'Where can I read the Community Standards?',
          answer: 'Go to Settings, open the Support tab, and tap "Community Standards." This outlines the rules and expectations for behavior on FRACT.'
        }
      ]
    },
    {
      id: 'support',
      title: 'Help & Feedback',
      icon: <MessageSquare className="w-5 h-5" />,
      items: [
        {
          question: 'How do I submit feedback?',
          answer: 'Go to Settings, open the Support tab, and tap "Feedback." Choose a category (Feature Request, UI/UX Improvement, Bug Report, Moderation Concern, or General Feedback) and describe your thoughts. Not all feedback receives a direct response, but it influences the platform\'s direction.'
        },
        {
          question: 'Where can I find the Terms of Service and Privacy Policy?',
          answer: 'Both are accessible from Settings under the Support tab. The Privacy Policy is also linked from the Info tab under Data Ownership. These documents explain your rights and how your data is handled.'
        },
        {
          question: 'What is the Verification Badge?',
          answer: 'Some profiles display a checkmark badge next to their name. Tapping the badge reveals the verification type (FRACT User, Developer, or Organization) and the reason for verification. Verification is managed by the platform and cannot be self-assigned.'
        }
      ]
    }
  ];

  const filteredSections = searchQuery.trim()
    ? sections.map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0)
    : sections;

  const totalQuestions = sections.reduce((sum, s) => sum + s.items.length, 0);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
    setExpandedItem(null);
  };

  const toggleItem = (itemKey: string) => {
    setExpandedItem(prev => prev === itemKey ? null : itemKey);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
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
              <h1 className="text-xl font-bold text-slate-100">Help Center</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-3">How can we help?</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Your guide to everything on FRACT -- what to find, where to find it, and how it works.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            {totalQuestions} topics across {sections.length} categories
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search for a topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <span className="text-sm">Clear</span>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-slate-500 text-sm mt-3 text-center">
              {filteredSections.reduce((sum, s) => sum + s.items.length, 0)} result{filteredSections.reduce((sum, s) => sum + s.items.length, 0) !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        <div className="space-y-3">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-700/20 transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    expandedSection === section.id
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold transition-colors duration-300 ${
                      expandedSection === section.id ? 'text-slate-100' : 'text-slate-300'
                    }`}>
                      {section.title}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {section.items.length} topic{section.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`} />
              </button>

              {expandedSection === section.id && (
                <div className="border-t border-slate-700/30">
                  {section.items.map((item, itemIndex) => {
                    const itemKey = `${section.id}-${itemIndex}`;
                    const isExpanded = expandedItem === itemKey;

                    return (
                      <div key={itemKey} className="border-b border-slate-700/20 last:border-b-0">
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/10 transition-all duration-200 text-left"
                        >
                          <span className={`pr-4 font-medium transition-colors duration-200 ${
                            isExpanded ? 'text-blue-400' : 'text-slate-300'
                          }`}>
                            {item.question}
                          </span>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`} />
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5">
                            <div className="pl-0 md:pl-4 border-l-2 border-blue-500/30 ml-0 md:ml-1">
                              <p className="text-slate-400 leading-relaxed pl-4 text-[15px]">
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No results found</h3>
            <p className="text-slate-500">Try a different search term or browse the categories above.</p>
          </div>
        )}

        <div className="mt-12 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
          <MessageSquare className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-100 mb-2">Still have questions?</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            If you didn't find what you're looking for, share your question or feedback directly with the FRACT team.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            Go to Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
