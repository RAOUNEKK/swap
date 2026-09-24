import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

type Dict = Record<string, { en: string; ar: string }>;

const T: Dict = {
  // Landing
  'trade_skills_not_money': { en: 'Trade skills, not money', ar: 'تبادل المهارات، لا المال' },
  'your_skills_have_value': { en: 'Your skills', ar: 'مهاراتك' },
  'have_value': { en: 'have value.', ar: 'ذات قيمة.' },
  'hero_sub': { en: "Swap what you know for what you want to learn. One hour of your time is worth one hour of someone else's.", ar: 'تبادل ما تعرف بما تريد تعلمه. ساعة من وقتك تساوي ساعة من وقت شخص آخر.' },
  'find_your_swap': { en: 'Find your skill swap', ar: 'ابحث عن تبادل مهاراتك' },
  'see_how_it_works': { en: 'See how it works', ar: 'كيف يعمل' },
  'how_it_works': { en: 'How it works', ar: 'كيف يعمل' },
  'tiny_idea': { en: 'A tiny idea', ar: 'فكرة صغيرة' },
  'big_ripple': { en: 'with a big ripple.', ar: 'بأثر كبير.' },
  'share_what_you_know': { en: 'Share what you know', ar: 'شارك ما تعرف' },
  'share_desc': { en: 'Add the skills you can teach and the ones you are itching to learn.', ar: 'أضف المهارات التي يمكنك تعليمها والتي تود تعلمها.' },
  'meet_your_match': { en: 'Meet your match', ar: 'قابل شريكك' },
  'meet_desc': { en: 'Find a real person with the perfect give-and-get combination.', ar: 'اعثر على شخص حقيقي يمنحك ويأخذ منك بالشكل المثالي.' },
  'swap_and_grow': { en: 'Swap and grow', ar: 'تبادل وتطور' },
  'swap_desc': { en: 'Book a session, trade an hour, and leave with a new skill and a new friend.', ar: 'احجز جلسة، تبادل ساعة، وغادر بمهارة جديدة وصديق جديد.' },
  'the_community': { en: 'Swap community', ar: 'مجتمع swap' },
  'no_wrong_skill': { en: 'There is no', ar: 'لا توجد' },
  'wrong_skill': { en: 'wrong skill.', ar: 'مهارة خاطئة.' },
  'community_desc': { en: 'From bread baking to brand strategy, every person knows something worth sharing.', ar: 'من خبز الخبز إلى استراتيجية العلامات التجارية، كل شخص يعرف شيئًا يستحق المشاركة.' },
  'bring_your_skill': { en: 'Bring your skill', ar: 'أحضر مهارتك' },
  'swap_stories': { en: 'Swap stories', ar: 'قصص التبادل' },
  'good_trades': { en: 'Good trades', ar: 'التبادلات الجيدة' },
  'good_days': { en: 'make good days.', ar: 'تصنع أيامًا جيدة.' },
  'stories_desc': { en: 'Real people. Real skills. Zero awkward networking energy.', ar: 'أشخاص حقيقيون. مهارات حقيقية. لا طاقة محرجة للتواصل.' },
  'your_move': { en: 'Your move', ar: 'دورك' },
  'trade_a_little': { en: 'Trade a little.', ar: 'تبادل قليلًا.' },
  'learn_a_lot': { en: 'Learn a lot.', ar: 'تعلم كثيرًا.' },
  'join_friendliest': { en: 'Join the friendliest skill exchange on the internet.', ar: 'انضم إلى أودم تبادل مهارات على الإنترنت.' },
  'start_swapping_free': { en: 'Start swapping free', ar: 'ابدأ التبادل مجانًا' },
  'log_in': { en: 'Log in', ar: 'تسجيل الدخول' },
  'join_swap': { en: 'Join Swap', ar: 'انضم إلى سواب' },
  'footer_tagline': { en: 'Trade skills, not money. Built by Raounek.hrz.', ar: 'تبادل المهارات، لا المال. بواسطة Raounek.hrz' },
  'grow_together_line1': { en: 'GROW TOGETHER', ar: 'ننمو معًا' },
  'grow_together_line2': { en: 'GROW BETTER', ar: 'ونتطور أكثر' },
  'grow_together_sub': { en: 'Every skill you share makes the whole community a little stronger.', ar: 'كل مهارة تشاركها تجعل مجتمعنا أقوى يومًا بعد يوم.' },
  'curious_people_swapping': { en: '2,400+ curious people are swapping', ar: 'أكثر من 2400 شخص فضولي يتبادلون' },
  'no_money_needed': { en: 'NO\nMONEY\nNEEDED', ar: 'بدون\nمال\nمطلوب' },
  'learn_out_loud': { en: 'Learn out loud', ar: 'تعلم بصوت عالٍ' },
  'make_something': { en: 'Make something', ar: 'اصنع شيئًا' },
  'creative': { en: 'Creative', ar: 'إبداعي' },
  'technology': { en: 'Technology', ar: 'تقنية' },
  'languages': { en: 'Languages', ar: 'لغات' },
  'music': { en: 'Music', ar: 'موسيقى' },
  'business': { en: 'Business', ar: 'أعمال' },
  'lifestyle': { en: 'Lifestyle', ar: 'نمط حياة' },
  'all': { en: 'All', ar: 'الكل' },

  // Auth
  'fair_exchange': { en: 'A fair exchange', ar: 'تبادل عادل' },
  'come_for_skill': { en: 'Come for a skill.', ar: 'تعال من أجل مهارة.' },
  'stay_for_people': { en: 'Stay for the people.', ar: 'ابقَ من أجل الناس.' },
  'teach_best': { en: 'Teach the thing you know best', ar: 'علم ما تعرفه أفضل' },
  'equal_exchange': { en: 'Find an equal exchange', ar: 'اعثر على تبادل متكافئ' },
  'grow_with_people': { en: 'Grow with real people', ar: 'تطور مع أشخاص حقيقيين' },
  'join_community': { en: 'Join the skill exchange community', ar: 'انضم إلى مجتمع تبادل المهارات' },
  'welcome_curious': { en: 'Welcome, curious human', ar: 'مرحبًا أيها الفضولي' },
  'welcome_back': { en: 'Welcome back.', ar: 'مرحبًا بعودتك.' },
  'make_first_swap': { en: 'Make your first swap.', ar: 'قم بأول تبادل لك.' },
  'next_exchange_waiting': { en: 'Your next skill exchange is waiting.', ar: 'تبادل المهارات القادم في انتظارك.' },
  'create_account': { en: 'Create an account and start trading knowledge.', ar: 'أنشئ حسابًا وابدأ تبادل المعرفة.' },
  'your_name': { en: 'Your name', ar: 'اسمك' },
  'email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'password': { en: 'Password', ar: 'كلمة المرور' },
  'please_wait': { en: 'Please wait...', ar: 'يرجى الانتظار...' },
  'sign_in': { en: 'Sign in', ar: 'تسجيل الدخول' },
  'create_account_btn': { en: 'Create account', ar: 'إنشاء حساب' },
  'no_account': { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  'have_account': { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },
  'sign_up': { en: 'Sign up', ar: 'إنشاء حساب' },
  'no_fees': { en: 'No fees. No credit card. Just skills.', ar: 'بدون رسوم. بدون بطاقة ائتمان. مهارات فقط.' },
  'back': { en: 'Back', ar: 'رجوع' },
  'back_to_home': { en: 'Back to home', ar: 'العودة إلى الرئيسية' },
  'name_min': { en: 'Please enter your name (at least 2 characters).', ar: 'يرجى إدخال اسمك (حرفان على الأقل).' },
  'password_min': { en: 'Password must be at least 6 characters.', ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' },

  // Onboarding
  'step': { en: 'Step', ar: 'خطوة' },
  'of': { en: 'of', ar: 'من' },
  'setup_profile': { en: "Let's set up your profile", ar: 'لنقم بإعداد ملفك الشخصي' },
  'what_teach': { en: 'What can you teach?', ar: 'ماذا يمكنك أن تعلم؟' },
  'what_learn': { en: 'What do you want to learn?', ar: 'ماذا تريد أن تتعلم؟' },
  'when_available': { en: 'When are you available?', ar: 'متى تكون متاحًا؟' },
  'profile_sub': { en: 'This is how other swappers will see you', ar: 'هكذا سيراك المتبادلون الآخرون' },
  'teach_sub': { en: 'Pick from the list or type your own every skill is welcome', ar: 'اختر من القائمة أو اكتب مهارتك  كل مهارة مرحب بها' },
  'learn_sub': { en: "Pick from the list or type your own  the sky's the limit", ar: 'اختر من القائمة أو اكتب مهارتك  السماء هي الحد' },
  'avail_sub': { en: 'Set your weekly availability so others know when to schedule swaps', ar: 'حدد أوقات تواجدك الأسبوعية ليعرف الآخرون متى يجدولون التبادل' },
  'profile_photo': { en: 'Profile photo', ar: 'صورة الملف الشخصي' },
  'click_to_upload': { en: 'Click the circle to upload a picture', ar: 'انقر على الدائرة لرفع صورة' },
  'remove_photo': { en: 'Remove photo', ar: 'إزالة الصورة' },
  'display_name': { en: 'Display name', ar: 'اسم العرض' },
  'bio': { en: 'Bio', ar: 'نبذة' },
  'optional': { en: '(optional)', ar: '(اختياري)' },
  'location': { en: 'Location', ar: 'الموقع' },
  'add_custom_skill': { en: 'Add a custom skill', ar: 'أضف مهارة مخصصة' },
  'add': { en: 'Add', ar: 'إضافة' },
  'search_skills': { en: 'Search existing skills...', ar: 'ابحث في المهارات الموجودة...' },
  'selected': { en: 'Selected', ar: 'المحدد' },
  'want_to_learn': { en: 'Want to learn', ar: 'أريد تعلم' },
  'continue': { en: 'Continue', ar: 'متابعة' },
  'complete_setup': { en: 'Complete setup', ar: 'إكمال الإعداد' },
  'finishing': { en: 'Finishing...', ar: 'جارٍ الإنهاء...' },
  'add_time_slot': { en: 'Add time slot', ar: 'أضف فترة زمنية' },
  'skip_availability': { en: 'You can skip this step and add availability later from your dashboard.', ar: 'يمكنك تخطي هذه الخطوة وإضافة أوقات التواجد لاحقًا من لوحة التحكم.' },
  'no_availability': { en: 'No availability set yet. Add your first time slot below.', ar: 'لا توجد أوقات تواجد بعد. أضف فترتك الزمنية الأولى أدناه.' },
  'just_curious': { en: 'Just curious', ar: 'فضولي فقط' },
  'somewhat': { en: 'Somewhat', ar: 'إلى حد ما' },
  'really_want': { en: 'Really want it', ar: 'أريده جدًا' },

  // App Shell
  'discover': { en: 'Discover', ar: 'اكتشف' },
  'my_swaps': { en: 'My Swaps', ar: 'تبادلاتي' },
  'dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'sign_out': { en: 'Sign out', ar: 'تسجيل الخروج' },

  // Discover
  'discover_partners': { en: 'Discover swap partners', ar: 'اكتشف شركاء التبادل' },
  'discover_sub': { en: 'People who teach what you want to learn and want to learn what you teach', ar: 'أشخاص يعلمون ما تريد تعلمه ويريدون تعلم ما تعلمه' },
  'total_matches': { en: 'Total matches', ar: 'إجمالي التطابقات' },
  'exact_swaps': { en: 'Exact swaps', ar: 'تبادلات دقيقة' },
  'skills_to_learn': { en: 'Skills to learn', ar: 'مهارات للتعلم' },
  'search_name_skill': { en: 'Search by name, skill, or location...', ar: 'ابحث بالاسم أو المهارة أو الموقع...' },
  'all_categories': { en: 'All categories', ar: 'كل الفئات' },
  'exact_only': { en: 'Exact only', ar: 'دقيق فقط' },
  'no_matches': { en: 'No matches found', ar: 'لا توجد تطابقات' },
  'try_adjusting': { en: 'Try adjusting your filters to see more people.', ar: 'حاول تعديل عوامل التصفية لرؤية المزيد من الأشخاص.' },
  'add_more_skills': { en: "As more people join Swap, you'll find partners here. Try adding more skills to your profile!", ar: 'مع انضمام المزيد من الأشخاص إلى سواب، ستجد شركاء هنا. حاول إضافة المزيد من المهارات إلى ملفك!' },
  'propose_swap': { en: 'Propose swap', ar: 'اقترح تبادل' },
  'swap_already_proposed': { en: 'Swap already proposed', ar: 'التبادل مقترح بالفعل' },
  'can_teach_you': { en: 'Can teach you', ar: 'يستطيع تعليمك' },
  'wants_from_you': { en: 'Wants to learn from you', ar: 'يريد التعلم منك' },
  'exact_match': { en: 'Exact match', ar: 'تطابق دقيق' },
  'new_member': { en: 'New member', ar: 'عضو جديد' },
  'free_slots': { en: 'Free', ar: 'متاح' },
  'slots_week': { en: 'slots/week', ar: 'فترات/أسبوع' },
  'propose_a_swap': { en: 'Propose a swap', ar: 'اقترح تبادلًا' },
  'they_teach_you': { en: 'They teach you', ar: 'يعلمك' },
  'you_teach_them': { en: 'You teach them in return', ar: 'تعلمه بالمقابل' },
  'send_proposal': { en: 'Send swap proposal', ar: 'أرسل اقتراح التبادل' },
  'sending': { en: 'Sending proposal...', ar: 'جارٍ إرسال الاقتراح...' },
  'swap_partner': { en: 'Swap partner', ar: 'شريك التبادل' },
  'they_dont_want': { en: "They don't want to learn any skill you currently teach. You can still propose a one-way session.", ar: 'لا يريدون تعلم أي مهارة تعلمها حاليًا. لا يزال بإمكانك اقتراح جلسة باتجاه واحد.' },
  'they_want_this': { en: 'They want to learn this', ar: 'يريدون تعلم هذا' },
  'you_learn': { en: 'You learn', ar: 'تتعلم' },
  'you_teach': { en: 'You teach', ar: 'تعلم' },
  'what_want_to_learn': { en: 'What do you want to learn?', ar: 'ماذا تريد أن تتعلم؟' },
  'add_skills_to_discover': { en: 'Add skills you want to learn from your profile to start discovering swap partners.', ar: 'أضف المهارات التي تريد تعلمها من ملفك الشخصي لبدء اكتشاف شركاء التبادل.' },

  // Swaps
  'manage_swaps': { en: 'Manage your skill exchange proposals and sessions', ar: 'أدر اقتراحات وجلسات تبادل المهارات' },
  'active': { en: 'Active', ar: 'نشط' },
  'pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'past': { en: 'Past', ar: 'سابق' },
  'no_active': { en: 'No active swaps', ar: 'لا توجد تبادلات نشطة' },
  'no_pending': { en: 'No pending proposals', ar: 'لا توجد اقتراحات معلقة' },
  'no_past': { en: 'No past swaps yet', ar: 'لا توجد تبادلات سابقة بعد' },
  'load_error': { en: 'Something went wrong loading your swaps. Please try again.', ar: 'حدث خطأ أثناء تحميل تبادلاتك. حاول مرة أخرى.' },
  'notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'no_notifications': { en: "No notifications yet", ar: 'لا توجد إشعارات بعد' },
  'mark_all_read': { en: 'Mark all as read', ar: 'وضع علامة مقروء على الكل' },
  'notif_swap_proposed_suffix': { en: 'wants to swap skills with you', ar: 'يريد تبادل المهارات معك' },
  'notif_swap_accepted_suffix': { en: 'accepted your swap proposal', ar: 'قبل عرض التبادل الخاص بك' },
  'notif_swap_scheduled_suffix': { en: 'scheduled your swap', ar: 'حدّد موعد التبادل معك' },
  'retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'active_desc': { en: 'Accepted swaps will appear here once you start scheduling sessions.', ar: 'ستظهر التبادلات المقبولة هنا بمجرد بدء جدولة الجلسات.' },
  'pending_desc': { en: 'Proposals you send or receive will show up here.', ar: 'الاقتراحات التي ترسلها أو تستقبلها ستظهر هنا.' },
  'past_desc': { en: 'Completed and reviewed swaps will be archived here.', ar: 'التبادلات المكتملة والمراجعة ستُؤرشف هنا.' },

  // Dashboard
  'dashboard_title': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'dashboard_sub': { en: 'Your Swap activity at a glance', ar: 'نشاط التبادل الخاص بك بنظرة سريعة' },
  'hours_balance': { en: 'Hours balance', ar: 'رصيد الساعات' },
  'hours': { en: 'hours', ar: 'ساعات' },
  'hours_taught': { en: 'Hours taught', ar: 'ساعات التدريس' },
  'hours_learned': { en: 'Hours learned', ar: 'ساعات التعلم' },
  'rating': { en: 'Rating', ar: 'التقييم' },
  'no_reviews_yet': { en: 'No reviews yet', ar: 'لا توجد تقييمات بعد' },
  'my_skills': { en: 'My Skills', ar: 'مهاراتي' },
  'teaching': { en: 'Teaching', ar: 'أُدرّس' },
  'learning': { en: 'Learning', ar: 'أتعلّم' },
  'no_teaching_skills': { en: 'No teaching skills added yet', ar: 'لم تُضف مهارات تدريس بعد' },
  'no_learning_skills': { en: 'No learning skills added yet', ar: 'لم تُضف مهارات تعلم بعد' },
  'recent_activity': { en: 'Recent Activity', ar: 'النشاط الأخير' },
  'no_swaps_yet': { en: 'No swaps yet. Head to Discover to find partners!', ar: 'لا توجد تبادلات بعد. توجه إلى اكتشف للعثور على شركاء!' },
  'time_ledger': { en: 'Time Ledger', ar: 'سجل الوقت' },
  'no_transactions': { en: 'No transactions yet', ar: 'لا توجد معاملات بعد' },
  'reviews': { en: 'Reviews', ar: 'التقييمات' },
  'no_reviews': { en: 'No reviews yet', ar: 'لا توجد تقييمات بعد' },

  // Profile
  'teaching_skills': { en: 'Teaching Skills', ar: 'مهارات التدريس' },
  'learning_skills': { en: 'Learning Skills', ar: 'مهارات التعلم' },
  'weekly_availability': { en: 'Weekly Availability', ar: 'أوقات التواجد الأسبوعية' },
  'edit': { en: 'Edit', ar: 'تعديل' },
  'save': { en: 'Save', ar: 'حفظ' },
  'cancel': { en: 'Cancel', ar: 'إلغاء' },
  'add_slot': { en: 'Add slot', ar: 'أضف فترة' },
  'no_teaching_yet': { en: 'No teaching skills yet. Add skills you can share with others.', ar: 'لا توجد مهارات تدريس بعد. أضف مهارات يمكنك مشاركتها مع الآخرين.' },
  'no_learning_yet': { en: 'No learning skills yet. Add skills you want to pick up.', ar: 'لا توجد مهارات تعلم بعد. أضف مهارات تريد اكتسابها.' },
  'no_availability_set': { en: "No availability set. Add time slots so others know when you're free.", ar: 'لا توجد أوقات تواجد محددة. أضف فترات زمنية ليعرف الآخرون متى تكون متاحًا.' },
  'add_teaching_skill': { en: 'Add a teaching skill', ar: 'أضف مهارة تدريس' },
  'add_learning_skill': { en: 'Add a learning skill', ar: 'أضف مهارة تعلم' },
  'cant_find_it': { en: "Can't find it? Type your own", ar: 'لا تجدها؟ اكتب مهارتك' },
  'to': { en: 'to', ar: 'إلى' },
  'joined': { en: 'Joined', ar: 'انضم' },
  'swaps': { en: 'swaps', ar: 'تبادلات' },

  // Swap Detail
  'back_to_swaps': { en: 'Back to swaps', ar: 'العودة للتبادلات' },
  'back_to_profile': { en: 'Back', ar: 'رجوع' },
  'view_profile': { en: 'View profile', ar: 'عرض الملف الشخصي' },
  'skill_ratings': { en: 'Skill ratings', ar: 'تقييمات المهارات' },
  'no_skill_ratings_yet': { en: 'No skill ratings yet', ar: 'لا توجد تقييمات مهارات بعد' },
  'rated_on': { en: 'on teaching', ar: 'في تدريس' },
  'by_swapper': { en: 'by 1 swapper', ar: 'من قِبل متبادل واحد' },
  'by_swappers': { en: 'by {n} swappers', ar: 'من قِبل {n} متبادلين' },
  'rate_this_swapper': { en: 'Rate this swapper', ar: 'قيّم هذا المتبادل' },
  'rate_swapper_title': { en: 'Rate your swap partner', ar: 'قيّم شريك التبادل' },
  'rating_anonymous_note': { en: "Your rating is anonymous ,they won't see who rated them.", ar: 'تقييمك مجهول لن يظهر لهم من قام بالتقييم.' },
  'already_rated': { en: "You've already rated this swap", ar: 'لقد قيّمت هذا التبادل بالفعل' },
  'no_swap_to_rate': { en: 'Complete a swap with them first to leave a rating', ar: 'أكمل تبادلاً معهم أولاً لترك تقييم' },
  'anonymous_swapper': { en: 'A swapper', ar: 'متبادل مجهول' },
  'completed_swaps': { en: 'Completed swaps', ar: 'التبادلات المكتملة' },
  'accept_proposal': { en: 'Accept proposal', ar: 'قبول الاقتراح' },
  'decline': { en: 'Decline', ar: 'رفض' },
  'cancel_proposal': { en: 'Cancel proposal', ar: 'إلغاء الاقتراح' },
  'waiting_for_response': { en: 'Waiting for', ar: 'في انتظار' },
  'to_respond': { en: 'to respond...', ar: 'للرد...' },
  'proposal_accepted': { en: 'Proposal accepted! Schedule a time to meet.', ar: 'تم قبول الاقتراح! جدول وقتًا للقاء.' },
  'schedule_session': { en: 'Schedule session', ar: 'جدول الجلسة' },
  'reschedule': { en: 'Reschedule', ar: 'إعادة جدولة' },
  'mark_complete': { en: 'Mark complete', ar: 'وضع علامة مكتمل' },
  'completed': { en: 'Completed', ar: 'مكتمل' },
  'session_on': { en: 'Session on', ar: 'الجلسة في' },
  'mark_complete_after': { en: 'Mark complete after the session happens', ar: 'ضع علامة مكتمل بعد حدوث الجلسة' },
  'session_complete': { en: 'Session complete! Confirm to finalize the swap.', ar: 'الجلسة مكتملة! أكد لإنهاء التبادل.' },
  'confirm_update_hours': { en: 'Confirm & update hours', ar: 'تأكيد وتحديث الساعات' },
  'swap_confirmed': { en: 'Swap confirmed! Leave a review for', ar: 'تم تأكيد التبادل! اكتب تقييمًا لـ' },
  'write_a_review': { en: 'Write a review', ar: 'اكتب تقييمًا' },
  'youve_reviewed': { en: "You've reviewed this swap. Waiting for", ar: 'لقد قيّمت هذا التبادل. في انتظار' },
  'review': { en: 'review.', ar: 'تقييم.' },
  'swap_complete_reviewed': { en: 'Swap complete and reviewed. Thank you!', ar: 'التبادل مكتمل ومُقيّم. شكرًا!' },
  'swap_declined': { en: 'This swap was declined.', ar: 'تم رفض هذا التبادل.' },
  'swap_cancelled': { en: 'This swap was cancelled.', ar: 'تم إلغاء هذا التبادل.' },
  'messages_with': { en: 'Messages with', ar: 'رسائل مع' },
  'no_messages': { en: 'No messages yet. Say hello to', ar: 'لا توجد رسائل بعد. قل مرحبًا لـ' },
  'type_message': { en: 'Type a message...', ar: 'اكتب رسالة...' },
  'date': { en: 'Date', ar: 'التاريخ' },
  'start_time': { en: 'Start time', ar: 'وقت البدء' },
  'duration': { en: 'Duration', ar: 'المدة' },
  'min': { en: 'min', ar: 'دقيقة' },
  'hour': { en: 'hour', ar: 'ساعة' },
  'hours_plural': { en: 'hours', ar: 'ساعات' },
  'equals_ledger': { en: 'This equals', ar: 'هذا يساوي' },
  'in_ledger': { en: 'hours in your time ledger.', ar: 'ساعات في سجل وقتك.' },
  'review_your_swap': { en: 'Review your swap', ar: 'قيّم تبادللك' },
  'your_review': { en: 'Your review', ar: 'تقييمك' },
  'review_placeholder': { en: 'How was your experience? Was the session helpful?', ar: 'كيف كانت تجربتك؟ هل كانت الجلسة مفيدة؟' },
  'submit_review': { en: 'Submit review', ar: 'إرسال التقييم' },
  'both_marked': { en: 'Both marked complete confirm to finalize', ar: 'كلاهما وضع علامة مكتمل  أكد للإنهاء' },
  'you_marked_waiting': { en: 'You marked complete waiting for partner', ar: 'لقد وضعت علامة مكتمل في انتظار الشريك' },
  'partner_marked_waiting': { en: 'Partner marked complete waiting for you', ar: 'الشريك وضع علامة مكتمل في انتظارك' },
  'proposed': { en: 'Proposed', ar: 'اقترح' },
  'scheduled_for': { en: 'Scheduled for', ar: 'مجدول لـ' },
  'ago': { en: 'ago', ar: 'منذ' },

  // Landing - extra
  'skill_sharing_curious': { en: 'Skill sharing for curious people', ar: 'تبادل المهارات للفضوليين' },
  'learn_something': { en: 'Learn something.', ar: 'تعلم شيئًا.' },
  'teach_something': { en: 'Teach something.', ar: 'علم شيئًا.' },
  'swap_skills': { en: 'Swap skills.', ar: 'تبادل المهارات.' },
  'see_how_it_works_btn': { en: 'See how it works', ar: 'كيف يعمل' },
  'learn_together': { en: 'Learn together', ar: 'تعلم معًا' },
  'no_money_needed_badge': { en: 'No money needed', ar: 'بدون مال' },
  'why_swap': { en: 'Why Swap', ar: 'لماذا سواب' },
  'better_network': { en: 'A better kind of network', ar: 'نوع أفضل من الشبكات' },
  'people_best_tool': { en: 'People are', ar: 'الناس هم' },
  'best_tool': { en: 'best tool.', ar: 'أفضل أداة.' },
  'equal_exchange_title': { en: 'Equal exchange', ar: 'تبادل متكافئ' },
  'equal_exchange_desc': { en: 'One hour of your time is worth one hour of theirs. Simple, fair, human.', ar: 'ساعة من وقتك تساوي ساعة من وقتهم. بسيط، عادل، إنساني.' },
  'endless_curiosity': { en: 'Endless curiosity', ar: 'فضول لا ينتهي' },
  'endless_curiosity_desc': { en: 'Every swap opens a door to a new skill, a new perspective, or a new friend.', ar: 'كل تبادل يفتح بابًا لمهارة جديدة أو منظور جديد أو صديق جديد.' },
  'how_it_works_title': { en: 'How it works', ar: 'كيف يعمل' },
  'three_moves': { en: 'Three moves.', ar: 'ثلاث خطوات.' },
  'big_ripple_title': { en: 'Big ripple.', ar: 'أثر كبير.' },
  'next_favorite_skill': { en: "Your next favorite skill is probably sitting in someone else's head.", ar: 'مهارتك المفضلة القادمة على الأرجح في رأس شخص آخر.' },
  'share_a_skill': { en: 'Share a skill', ar: 'شارك مهارة' },
  'share_a_skill_desc': { en: 'Put your practical magic out into the world.', ar: 'ضع مهارتك العملية في العالم.' },
  'find_your_person': { en: 'Find your person', ar: 'اعثر على شخصك' },
  'find_your_person_desc': { en: 'Meet someone who wants what you know and knows what you want.', ar: 'قابل شخصًا يريد ما تعرفه ويعرف ما تريده.' },
  'make_the_swap': { en: 'Make the swap', ar: 'قم بالتبادل' },
  'make_the_swap_desc': { en: 'Spend time learning, teaching, and building something together.', ar: 'اقضِ وقتًا في التعلم والتدريس وبناء شيء معًا.' },
  'bring_your_weird': { en: 'Bring your weird,', ar: 'أحضر شيئك الغريب،' },
  'wonderful_thing': { en: 'wonderful', ar: 'رائع' },
  'thing': { en: 'thing.', ar: 'شيء.' },
  'community_blurb': { en: 'Pottery, Python, piano, photography, Portuguese — there is no wrong answer. If you know it, someone wants to learn it.', ar: 'فخار، بايثون، بيانو، تصوير، برتغالي — لا إجابة خاطئة. إذا كنت تعرفها، هناك من يريد تعلمها.' },
  'make_first_swap_btn': { en: 'Make your first swap', ar: 'قم بأول تبادل' },
  'dark_mode': { en: 'Dark mode', ar: 'الوضع الداكن' },
  'light_mode': { en: 'Light mode', ar: 'الوضع الفاتح' },
  'language': { en: 'Language', ar: 'اللغة' },
  'english': { en: 'English', ar: 'الإنجليزية' },
  'arabic': { en: 'Arabic', ar: 'العربية' },

  // Profile - extra
  'no_reviews_yet_short': { en: 'No reviews yet', ar: 'لا توجد تقييمات' },
  'your_name_placeholder': { en: 'Your name', ar: 'اسمك' },
  'bio_placeholder': { en: 'Tell others about yourself...', ar: 'أخبر الآخرين عن نفسك...' },
  'location_placeholder': { en: 'City, State', ar: 'المدينة، الدولة' },
  'add_btn': { en: 'Add', ar: 'إضافة' },
  'more': { en: 'more', ar: 'أخرى' },

  // Swap detail - extra
  'swap_word': { en: 'swap', ar: 'تبادل' },
  'review_optional': { en: '(optional)', ar: '(اختياري)' },
  '30_min': { en: '30 min', ar: '30 دقيقة' },
  '1_hour': { en: '1 hour', ar: 'ساعة' },
  '1.5_hours': { en: '1.5 hours', ar: '1.5 ساعة' },
  '2_hours': { en: '2 hours', ar: 'ساعتان' },

  // Categories
  'cat_creative': { en: 'Creative', ar: 'إبداعي' },
  'cat_technology': { en: 'Technology', ar: 'تقنية' },
  'cat_languages': { en: 'Languages', ar: 'لغات' },
  'cat_music': { en: 'Music', ar: 'موسيقى' },
  'cat_business': { en: 'Business', ar: 'أعمال' },
  'cat_lifestyle': { en: 'Lifestyle', ar: 'نمط حياة' },
  'cat_all': { en: 'All', ar: 'الكل' },

  // Common
  'loading': { en: 'Loading Swap...', ar: 'جارٍ تحميل سواب...' },
};

interface I18nContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: (key: string) => string;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('swap-lang') as Lang | null;
    return stored === 'ar' || stored === 'en' ? stored : 'en';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem('swap-lang', lang);
  }, [lang, dir]);

  const t = (key: string): string => {
    const entry = T[key];
    if (!entry) return key;
    return entry[lang];
  };

  const setLang = (l: Lang) => setLangState(l);
  const toggleLang = () => setLangState((prev) => (prev === 'en' ? 'ar' : 'en'));

  return <I18nContext.Provider value={{ lang, dir, t, setLang, toggleLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
