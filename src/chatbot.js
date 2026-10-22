/* Nahem chatbot v2 — the customer assistant for nahem24.com.
   Add to any page with:  <script src="/chatbot.js" defer></script>
   Arabic by default; the customer can switch to English from the chat header or by typing "English".

   Two answer engines:
   1. Built-in (always on, free, instant): menu, prices, branches, hours, offers, ordering, groups,
      budgets, recommendations, comparisons, complaints, companies, events and more, with typo
      tolerance. It reads live prices/branches from the admin panel's cache, else the v15 data below.
   2. AI (optional): when config.js has chatUrl (the Nahem chatbot Apps Script, see Code.gs), each
      question is answered by Gemini from the live menu. If the AI is busy or unreachable, the
      built-in engine answers instead, so a customer is never left without a reply. */
(function () {
  'use strict';
  if (window.NahemChat) return;

  var SCRIPT = document.currentScript;
  function attr(n) { return SCRIPT ? SCRIPT.getAttribute(n) : null; }
  var OPT = {
    lang: attr('data-lang'),                         /* force 'ar' or 'en' */
    open: attr('data-open') === 'true',              /* open on load (demo) */
    base: attr('data-base') || '',                   /* prefix for site links, e.g. https://nahem24.com */
    ai: attr('data-ai'),                             /* chatbot server URL; otherwise config.js chatUrl */
    logo: attr('data-logo') || '/assets/chat-logo.png',
    thumbs: attr('data-thumbs') || '/assets/chat/',   /* folder of the 160px food photos */
    side: attr('data-side')                           /* 'left' or 'right' to pin the chat; default follows the language */
  };

  /* ================================================================
     DATA (mirrors nahem24.com v15; live admin content overrides it)
     ================================================================ */
  var PHOTOS = {
    'دبل سماش لحم': 'smash-beef', 'دبل سماش دجاج': 'smash-chicken', 'برجر دجاج زنجر': 'zinger', 'ديناميت دجاج': 'dynamite', 'وجبة استربس': 'strips',
    'وجبة نهم': 'meal-nahem', 'كومبو نهم': 'combo-nahem', 'ساندوتش بيج نهم': 'big-nahem', 'ساندوتش دجاج فاهيتا': 'fajita', 'راب تويستر': 'twister',
    'راب دونر تركي': 'doner', 'تشكن فرايز': 'chicken-fries', 'ساندوتش بيض': 'breakfast-egg', 'ساندوتش تونة': 'breakfast-tuna', 'ساندوتش فاهيتا للفطور': 'breakfast-fajita',
    'ساندوتش فلافل': 'breakfast-falafel', 'ساندوتش جبنتين': 'breakfast-cheese', 'ساندوتش مليس': 'breakfast-malis', 'وجبة الإفطار': 'breakfast-meal', 'بوكس الخفايف': 'snack-box',
    'بوكس البرجر': 'burger-box', 'بطاطس': 'fries-real2', 'سلطة ملفوف': 'coleslaw-real2', 'سلطة سيزر': 'caesar-real2', 'كوكيز نهم': 'cookies', 'حيسة نهم': 'heisa',
    'عرض الحلى': 'heisa-drink', 'مشروب غازي': 'soft-drinks', 'ماء': 'water', 'كرك': 'karak', 'شاي': 'tea', 'قهوة سعودية': 'saudi-coffee', 'الصوصات': 'sauces'
  };
  /* Calories per item. "false" = printed on the Nahem menu; "true" = an ESTIMATE for the demo,
     shown to customers as approximate. Replace every estimate with the real figure before going live. */
  var CALORIES = {
    'برجر دجاج زنجر': [610, false], 'دبل سماش دجاج': [610, false], 'دبل سماش لحم': [490, false], 'ساندوتش بيج نهم': [440, false],
    'ساندوتش دجاج فاهيتا': [340, false], 'راب دونر تركي': [360, false], 'راب تويستر': [480, false], 'ساندوتش تونة': [290, false],
    'ساندوتش فاهيتا للفطور': [300, false], 'ساندوتش فلافل': [360, false], 'ساندوتش جبنتين': [300, false], 'ساندوتش بيض': [340, false],
    'ساندوتش مليس': [340, false], 'حيسة نهم': [480, false], 'كوكيز نهم': [390, false],
    'ديناميت دجاج': [480, true], 'وجبة استربس': [950, true], 'وجبة نهم': [1100, true], 'كومبو نهم': [1400, true],
    'تشكن فرايز': [650, true], 'وجبة الإفطار': [700, true], 'بوكس الخفايف': [2400, true], 'بوكس البرجر': [3200, true],
    'بطاطس': [320, true], 'سلطة ملفوف': [150, true], 'سلطة سيزر': [350, true], 'عرض الحلى': [560, true],
    'مشروب غازي': [140, true], 'ماء': [0, true], 'كرك': [150, true], 'شاي': [60, true], 'قهوة سعودية': [5, true], 'الصوصات': [100, true]
  };
  function kcalOf(i) { var c = i && CALORIES[i.ar]; return c ? { n: c[0], est: c[1] } : null; }
  function photo(i) {
    if (!i || !i.img) return '';
    return /^(https?:|\/|data:)/.test(i.img) ? i.img : OPT.thumbs + i.img + '.webp';
  }

  var DATA = {
    settings: {
      orderUrl: 'https://nahem.interflow.sa/ar',
      whatsapp: '966555331674',
      supportWhatsapp: '966550181255',
      open24h: true,
      rating: '4.7',
      reviewsUrl: 'https://maps.app.goo.gl/5HtnR6rhHZGxVBaDA',
      appCode: 'Nhm24',
      appStore: 'https://apps.apple.com/sa/app/%D9%85%D8%B7%D8%B9%D9%85-%D9%86%D9%87%D9%85-nahem24/id6814492574',
      googlePlay: 'https://play.google.com/store/apps/details?id=sa.interflow.nahem',
      franchiseUrl: 'https://joyful-ganache-dd47e4.netlify.app/',
      careersEmail: 'Nahem24@yamihub.com',
      companiesDiscount: 15,
      companiesFreeFrom: 50,
      instagram: 'https://www.instagram.com/nahem_24',
      tiktok: 'https://www.tiktok.com/@nahem_24',
      snapchat: 'https://www.snapchat.com/@nahem_24',
      x: 'https://x.com/Nahem_24',
      facebook: 'https://www.facebook.com/Nahem24'
    },
    branches: [
      { id: 'qaswa', ar: 'القصواء', en: 'Al Qaswa', addrAr: 'ممشى القصواء · المدينة المنورة', addrEn: 'Al Qaswa Walk · Madinah', maps: 'https://maps.app.goo.gl/5HtnR6rhHZGxVBaDA', slug: 'al-qaswa', keys: ['قصواء', 'قصوا', 'qaswa', 'qaswaa', 'ممشي'] },
      { id: 'ared', ar: 'العريض', en: 'Al Ared', addrAr: 'حريث بن زيد · المدينة المنورة', addrEn: 'Hurayth Bin Zaid St · Madinah', maps: 'https://maps.app.goo.gl/R7pG3eWtTpZhqzqE9?g_st=ac', slug: 'al-areed', keys: ['عريض', 'ared', 'areed', 'arid', 'حريث'] }
    ],
    /* [category, price, Arabic name, English name, Arabic description, English description, tags] */
    items: [
      ['burger', 19, 'دبل سماش لحم', 'Double Beef Smash', 'قطعتان لحم طازج مع الجبن والصوص الخاص وبطاطس', 'Two fresh beef patties, cheese, house sauce and fries', 'beef fries filling popular'],
      ['burger', 18, 'دبل سماش دجاج', 'Double Chicken Smash', 'قطعتان دجاج طازج مع الجبن والصوص الخاص وبطاطس', 'Two fresh chicken patties, cheese, house sauce and fries', 'chicken fries filling'],
      ['burger', 16, 'برجر دجاج زنجر', 'Zinger Chicken Burger', 'دجاج زنجر مقرمش مع الخس والجبن والصوص وبطاطس', 'Crunchy zinger chicken, lettuce, cheese, house sauce and fries', 'chicken fries crispy'],
      ['special', 13, 'ديناميت دجاج', 'Dynamite Chicken', 'بطاطس مقرمشة وقطع دجاج كرانشي وصوصات وهلابينو', 'Crispy fries, crunchy chicken bites, sauces and jalapeño', 'chicken spicy fries crispy'],
      ['special', 18, 'وجبة استربس', 'Strips Meal', '٤ قطع استربس + خبز + بطاطس + صوص', '4 chicken strips + bread + fries + dip', 'chicken fries kids crispy'],
      ['special', 28, 'وجبة نهم', 'Nahem Meal', 'برجر من اختيارك + بطاطس + قطعة استربس + مشروب', 'Any burger + fries + 1 strip + soft drink', 'meal fries drink filling value'],
      ['special', 34, 'كومبو نهم', 'Nahem Combo', 'ساندوتش اسبيشل + برجر + بطاطس + مشروب', 'Special sandwich + burger + fries + soft drink', 'meal fries drink filling'],
      ['special', 14, 'ساندوتش بيج نهم', 'Big Nahem Sandwich', 'دجاج استربس وصوصات خاصة وجبن أمريكي في بريوش', 'Chicken strips, house sauces and American cheese in brioche', 'chicken crispy'],
      ['special', 11, 'ساندوتش دجاج فاهيتا', 'Chicken Fajita Sandwich', 'دجاج فاهيتا وفلفل ألوان وإضافات خاصة في بريوش', 'Fajita chicken, bell peppers and special extras in brioche', 'chicken'],
      ['special', 14, 'راب تويستر', 'Twister Wrap', 'ساندوتش دجاج طازج وصوص خاص في خبز التورتيلا', 'Fresh chicken and special sauce in a tortilla wrap', 'chicken wrap'],
      ['special', 13, 'راب دونر تركي', 'Turkish Doner Wrap', 'شرائح لحم طازجة متبلة مع خبز طازج وصوص خاص', 'Seasoned fresh beef slices, fresh bread and special sauce', 'beef wrap'],
      ['special', 11, 'تشكن فرايز', 'Chicken Fries', 'بطاطس مع قطع دجاج استربس وصوصات خاصة', 'Fries loaded with chicken strips and special sauces', 'chicken fries kids'],
      ['breakfast', 5, 'ساندوتش بيض', 'Egg Sandwich', 'بيض طازج مع إضافات نهم داخل خبز بريوش', 'Fresh egg with Nahem toppings in brioche bread', 'veg kids'],
      ['breakfast', 7, 'ساندوتش تونة', 'Tuna Sandwich', 'خلطة تونة خاصة داخل خبز بريوش', 'Tuna with our special mix in brioche bread', 'light fish'],
      ['breakfast', 9, 'ساندوتش فاهيتا للفطور', 'Breakfast Fajita Sandwich', 'فاهيتا متبلة وإضافات خاصة داخل خبز بريوش', 'Seasoned fajita with special toppings in brioche bread', ''],
      ['breakfast', 5, 'ساندوتش فلافل', 'Falafel Sandwich', 'فلافل مقرمشة مع خضار وصوص طحينة', 'Crispy falafel, fresh vegetables and tahini sauce', 'veg light'],
      ['breakfast', 4, 'ساندوتش جبنتين', 'Two Cheese Sandwich', 'مزيج من جبنتين سايحة داخل خبز بريوش', 'Two melted cheeses in brioche bread', 'veg kids'],
      ['breakfast', 5, 'ساندوتش مليس', 'Malis Sandwich', 'بيض مع جبنة سائلة وتتبيلة خاصة', 'Egg, smooth cheese and a special seasoning', 'veg'],
      ['breakfast', 11, 'وجبة الإفطار', 'Breakfast Meal', 'ساندوتشان من اختيارك + شاي', 'Two sandwiches of your choice + tea', 'drink value'],
      ['boxes', 49, 'بوكس الخفايف', 'Snack Box', '٥ ساندوتشات من اختيارك + ٤ صوص — يكفي نحو 5 أشخاص', '5 sandwiches of your choice + 4 dips — feeds about 5', 'share popular value'],
      ['boxes', 79, 'بوكس البرجر', 'Burger Box', '٤ برجر من اختيارك + ملفوف + بطاطس + ٤ صوص + ٢ استربس — يكفي نحو 4 أشخاص', '4 burgers of your choice + coleslaw, fries, 4 dips and 2 strips — feeds about 4', 'share popular fries'],
      ['sides', 5, 'بطاطس', 'Fries', 'بطاطس مقلية ذهبية ومقرمشة', 'Golden crispy fries', 'veg kids side'],
      ['sides', 5, 'سلطة ملفوف', 'Coleslaw', 'سلطة ملفوف طازجة', 'Fresh coleslaw', 'veg light side'],
      ['sides', 13, 'سلطة سيزر', 'Caesar Salad', 'خس طازج مع صوص سيزر وقطع دجاج وجبنة بارميزان', 'Fresh lettuce, Caesar dressing, chicken and parmesan', 'chicken light'],
      ['sides', 9, 'كوكيز نهم', 'Nahem Cookies', 'كوكيز بالشوكولاتة الذائبة', 'Cookies with molten chocolate', 'sweet kids'],
      ['sides', 8, 'حيسة نهم', 'Heisa Nahem', 'حيسة مدينية بطابع نهم', 'Madinah-style heisa dessert', 'sweet'],
      ['sides', 12, 'عرض الحلى', 'Dessert Offer', 'حيسة أو كوكيز + مشروب من اختيارك', 'Heisa or cookies + a drink of your choice', 'sweet drink value'],
      ['drinks', 3, 'مشروب غازي', 'Soft Drink', 'بيبسي، سفن، برتقال، ديو أو كينزا', 'Pepsi, 7UP, orange, Dew or Kinza', 'cold'],
      ['drinks', 1, 'ماء', 'Water', 'مياه معدنية', 'Bottled water', 'cold'],
      ['drinks', 4, 'كرك', 'Karak', 'شاي كرك ساخن', 'Hot karak tea', 'hot'],
      ['drinks', 4, 'شاي', 'Tea', 'شاي ساخن', 'Hot tea', 'hot'],
      ['drinks', 5, 'قهوة سعودية', 'Saudi Coffee', 'قهوة سعودية ساخنة', 'Hot Saudi coffee', 'hot'],
      ['sauces', 2, 'الصوصات', 'Sauces', 'ثوم، حراق، كوكتيل أو سيزر', 'Garlic, spicy, cocktail or Caesar', 'sauce']
    ].map(function (r) { return { cat: r[0], price: r[1], ar: r[2], en: r[3], dAr: r[4], dEn: r[5], tags: r[6], img: PHOTOS[r[2]] || '' }; })
  };

  /* Facts the website does not state yet. Fill one in ({ ar: '…', en: '…' }) and the bot answers it;
     while it is null the bot says it has no confirmed answer and hands over to WhatsApp, never guessing. */
  var FACTS = {
    payment: null,     /* e.g. { ar: 'نقبل مدى وفيزا وأبل باي والكاش.', en: 'We accept mada, Visa, Apple Pay and cash.' } */
    delivery: null,    /* delivery for individual customers */
    dineIn: null,      /* seating inside the branches */
    parking: null,
    calories: null,
    nutrition: null,  /* fat, protein, carbs, sugar, salt: e.g. { ar: '…', en: '…' } once the restaurant has the figures */
    allergens: null,
    halal: null,
    prepTime: null,    /* e.g. { ar: 'طلبك يجهز عادة خلال 10–15 دقيقة.', en: 'Orders are usually ready in 10–15 minutes.' } */
    breakfastHours: null,
    vat: null
  };

  var CATS = {
    burger:    { ar: 'البرجر', en: 'Burgers', icon: '🍔', keys: ['برجر', 'برقر', 'همبرجر', 'سماش', 'burger', 'burgers', 'smash'] },
    special:   { ar: 'نهم اسبيشل', en: 'Nahem Specials', icon: '⭐', keys: ['اسبيشل', 'سبيشل', 'special', 'specials', 'ساندوتشات', 'سندويشات', 'ساندويتشات', '=ساندويتش', '=ساندوتش', '=سندويتش', '=سندويش', 'sandwiches', '=sandwich', 'راب', 'wrap', 'wraps'] },
    breakfast: { ar: 'الفطور', en: 'Breakfast', icon: '🍳', keys: ['فطور', 'افطار', 'ريوق', 'فطار', 'breakfast', 'morning'] },
    boxes:     { ar: 'البوكسات', en: 'Boxes', icon: '📦', keys: ['بوكسات', 'بوكس', 'box', 'boxes', 'مشاركه', 'sharing'] },
    sides:     { ar: 'جانبيات وحلى', en: 'Sides & desserts', icon: '🍟', keys: ['جانبي', 'جانبيات', 'سلطه', 'سلطات', 'side', 'sides', 'salad', 'salads'] },
    drinks:    { ar: 'المشروبات', en: 'Drinks', icon: '🥤', keys: ['مشروب', 'مشروبات', 'drink', 'drinks', 'beverage', 'beverages'] },
    sauces:    { ar: 'الصوصات', en: 'Sauces', icon: '🥫', keys: ['صوص', 'صوصات', 'sauce', 'sauces', 'dip', 'dips'] }
  };

  /* ================================================================
     LIVE CONTENT (same cache app.js writes after each admin "publish")
     ================================================================ */
  function liveData() {
    var d = { settings: Object.assign({}, DATA.settings), branches: DATA.branches, items: DATA.items, popular: null, dayparts: [] };
    var c = null;
    try { var r = JSON.parse(localStorage.getItem('nahem-content-v1') || 'null'); c = r && r.data; } catch (e) {}
    if (!c || !c.settings) return d;
    var s = c.settings;
    ['orderUrl', 'whatsapp', 'supportWhatsapp', 'rating', 'appCode', 'careersEmail', 'tiktok', 'snapchat', 'x'].forEach(function (k) { if (s[k]) d.settings[k] = s[k]; });
    if (s.companiesDiscount != null && s.companiesDiscount !== '') d.settings.companiesDiscount = s.companiesDiscount;
    if (s.companiesFreeFrom != null && s.companiesFreeFrom !== '') d.settings.companiesFreeFrom = s.companiesFreeFrom;
    if (typeof s.open24h === 'boolean') d.settings.open24h = s.open24h;
    if (Array.isArray(c.branches) && c.branches.length) {
      d.branches = c.branches.filter(function (b) { return b.visible !== false && b.ar; }).map(function (b) {
        var known = DATA.branches.filter(function (k) { return norm(k.ar) === norm(b.ar); })[0];
        return { id: b.id, ar: plain(b.ar), en: plain(b.en || b.ar), addrAr: plain(b.addrAr || ''), addrEn: plain(b.addrEn || b.addrAr || ''), maps: b.maps || (known && known.maps) || '',
          slug: b.slug, opens: b.opens, closes: b.closes, keys: (known ? known.keys : []).concat([norm(b.ar).replace(/^ال/, ''), String(b.en || '').toLowerCase()]) };
      });
    }
    if (Array.isArray(c.items) && c.items.length) {
      var byId = {};
      d.items = c.items.filter(function (i) { return i.visible !== false && i.ar && isFinite(Number(i.price)); }).map(function (i) {
        var known = DATA.items.filter(function (k) { return norm(k.ar) === norm(plain(i.ar)); })[0];
        var it = { cat: known ? known.cat : null, price: Number(i.price), ar: plain(i.ar), en: plain(i.en || i.ar), dAr: plain(i.dAr || ''), dEn: plain(i.dEn || i.dAr || ''), tags: known ? known.tags : '',
          img: known ? known.img : (typeof i.img === 'string' && /^(https:|\/)/.test(i.img) ? i.img : '') };
        if (i.id != null) byId[i.id] = it;
        return it;
      });
      if (Array.isArray(c.offers)) {
        var pop = c.offers.map(function (o) { return byId[o.item]; }).filter(Boolean);
        if (pop.length) d.popular = pop;
      }
    }
    if (s.daypartEnabled !== false && Array.isArray(c.dayparts)) d.dayparts = c.dayparts.filter(function (p) { return p.enabled !== false; });
    return d;
  }
  function plain(s) { var t = document.createElement('div'); t.innerHTML = String(s || ''); return t.textContent.trim(); }

  /* ================================================================
     TEXT MATCHING (Arabic + English, typo tolerant)
     ================================================================ */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
      .replace(/(.)\1{2,}/g, '$1')                     /* "فرووووع" → "فروع" */
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function skel(s) { return s.replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1'); }
  function lev(a, b) {
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function has(q, words, noTypos) {
    var i, w;
    for (i = 0; i < words.length; i++) {
      var exact = words[i].charAt(0) === '=';
      w = norm(exact ? words[i].slice(1) : words[i]);
      if (!w) continue;
      /* Latin, very short and "=" words match whole words ("كم" is not inside "عليكم") */
      if (exact || /^[a-z0-9 ]+$/.test(w) || w.length <= 2) { if (new RegExp('(^|\\s)' + w + (exact ? '' : '(s|es)?') + '($|\\s)').test(q)) return true; }
      /* Arabic words match at a word start, after an attached prefix (و ب ل ف ك ال…), with any ending:
         "فروعكم" and "بالدجاج" match, but "ايسكريم" does not contain "يسكر" */
      else if (new RegExp('(^|\\s)(و|ف|ب|ل|ك|ال|وال|بال|فال|لل|كال)?' + w).test(q)) return true;
    }
    if (noTypos) return false;
    /* typo pass for single longer words; same first letter keeps near-misses apart */
    var qw = q.split(' ');
    for (i = 0; i < words.length; i++) {
      w = norm(words[i]);
      if (words[i].charAt(0) === '=') continue;
      var latin = /^[a-z]+$/.test(w);
      if (w.indexOf(' ') !== -1 || w.length < (latin ? 4 : 5)) continue;
      var max = latin && w.length >= 7 ? 2 : 1;
      for (var n = 0; n < qw.length; n++) {
        var u = qw[n];
        if (u.length < 4 || u[0] !== w[0] || Math.abs(u.length - w.length) > 2) continue;
        if (w.length === 4 && u.length !== 5) continue;   /* "menue" is "menu", "wher" is not "when" */
        if (lev(u, w) <= max) return true;
        /* consonant skeleton only for long words: "reccomeed" ≈ "recommend", but "what" is not "where" */
        if (latin && w.length >= 7 && u.length >= 6 && lev(u, w) <= 3 && lev(skel(u), skel(w)) <= 1) return true;
      }
    }
    return false;
  }
  var GENERIC = ['ساندوتش', 'سندويش', 'برجر', 'راب', 'نهم', 'sandwich', 'burger', 'wrap', 'nahem', 'من', 'في', 'مع', 'the', 'of'];
  function stem(t) { return t.length > 4 ? t.replace(/^(ال|بال|وال|لل)/, '') : t; }
  var SYN = {
    'مشروب غازي': ['بيبسي', 'سفن', 'سفن اب', 'ديو', 'كينزا', 'كولا', 'غازيات', 'pepsi', '7up', 'dew', 'cola', 'soda', 'soft drinks'],
    'ماء': ['مويه', 'مياه', 'موية'], 'بطاطس': ['فرايز', 'بطاطا', 'french fries'], 'الصوصات': ['ثوم', 'كوكتيل', 'garlic', 'dips'],
    'قهوة سعودية': ['قهوه', 'قهوه عربيه', 'coffee', 'arabic coffee'], 'وجبة استربس': ['استربس', 'strips', 'tenders'],
    'بوكس الخفايف': ['خفايف'], 'حيسة نهم': ['حيسه'], 'كوكيز نهم': ['كوكيز', 'cookie'], 'ساندوتش جبنتين': ['جبنتين', 'cheese sandwich'],
    'كومبو نهم': ['combo', 'كومبو'], 'سلطة سيزر': ['سيزر', 'caesar'], 'سلطة ملفوف': ['ملفوف', 'coleslaw']
  };
  function itemScore(item, q, qwords) {
    if (SYN[item.ar] && has(q, SYN[item.ar], true)) return 1;   /* synonyms must be spelled right: "خفيف" is not "خفايف" */
    var best = 0;
    [item.ar, item.en].forEach(function (name) {
      var toks = norm(name).split(' ').map(stem).filter(Boolean);
      var dist = toks.filter(function (t) { return GENERIC.indexOf(t) === -1; });
      if (!dist.length) dist = toks;
      var hit = dist.filter(function (t) {
        if (/^[a-z0-9]+$/.test(t)) return qwords.some(function (w) { return w === t || w === t + 's' || (w.length >= 4 && t.indexOf(w) === 0) || (t.length >= 5 && w[0] === t[0] && lev(w, t) <= 1); });
        return q.indexOf(t) !== -1 || qwords.some(function (w) { return w.length >= 3 && ((t.indexOf(w) === 0 && w.length >= t.length * 0.6) || w.indexOf(t) === 0); });
      }).length;
      best = Math.max(best, hit / dist.length);
    });
    return best;
  }
  function findItems(d, q) {
    var qwords = q.split(' ').map(stem);
    var all = d.items.map(function (i) { return { i: i, s: itemScore(i, q, qwords) }; }).filter(function (x) { return x.s >= 0.33; });
    all.sort(function (a, b) { return b.s - a.s; });
    var scored = all.filter(function (x) { return x.s >= 0.5; });
    scored.sort(function (a, b) { return b.s - a.s; });
    var list = [];
    if (scored.length) {
      var top = scored[0].s;
      list = scored.filter(function (x) { return x.s >= top - 0.01 || x.s >= 0.99; }).slice(0, 6).map(function (x) { return x.i; });
      list.exact = top >= 0.99;
      list.exactCount = scored.filter(function (x) { return x.s >= 0.99; }).length;
      list.second = scored[1] && scored[1].s >= 0.6 ? scored[1].i : null;
      list.near = all.slice(1).map(function (x) { return x.i; });
    }
    return list;
  }
  function byNames(d, names) {
    return names.map(function (n) { return d.items.filter(function (i) { return norm(i.ar) === norm(n); })[0]; }).filter(Boolean);
  }
  function tagged(d, tag) { return d.items.filter(function (i) { return (' ' + (i.tags || '') + ' ').indexOf(' ' + tag + ' ') !== -1; }); }
  function findBranch(d, q) {
    return d.branches.filter(function (b) { return has(q, (b.keys || []).concat([b.ar, b.en])); })[0] || null;
  }
  function findCat(q) {
    for (var k in CATS) if (has(q, CATS[k].keys)) return k;
    return null;
  }
  var NUMWORDS = { 'واحد': 1, 'اثنين': 2, 'ثنين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'ثمان': 8, 'ثمانيه': 8, 'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10, 'عشرين': 20, 'عشرون': 20, 'ثلاثين': 30, 'ثلاثون': 30, 'اربعين': 40, 'اربعون': 40, 'خمسين': 50, 'خمسون': 50, 'ستين': 60, 'ستون': 60, 'سبعين': 70, 'سبعون': 70, 'ثمانين': 80, 'ثمانون': 80, 'تسعين': 90, 'تسعون': 90, 'ميه': 100, 'مئه': 100, 'ميتين': 200, 'مئتين': 200, 'مئتان': 200,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'twelve': 12, 'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50 };
  var PEOPLE = '(شخص|اشخاص|شخصا|نفر|انفار|افراد|فرد|ضيف|ضيوف|موظف|موظفين|طالب|طلاب|people|persons|person|guests|guest|pax|ppl|of us)';
  var MONEY = /(ريال|ريالات|sar|riyal|riyals|rial)/;
  function peopleCount(q) {
    if (/(^|\s)(ل)?(شخصين|نفرين)($|\s)/.test(q)) return 2;
    var m = q.match(new RegExp('(\\d+)\\s*' + PEOPLE));
    if (m) return Math.min(999, Number(m[1]));
    var m2 = q.match(/(^|\s)(و)?(نحن|احنا|حنا|we are|we re|for|family of|party of|group of|عايله|عائله|عيله)\s*(من)?\s*(\d+)($|\s)(\S*)/);
    if (m2) m2 = [m2[0], '', '', m2[5], '', m2[7]];
    if (m2 && !MONEY.test(m2[5] || '')) return Math.min(999, Number(m2[3]));
    var w = q.match(new RegExp('(^|\\s)([^\\s]+)\\s*' + PEOPLE));
    if (w && NUMWORDS[w[2]] != null) return NUMWORDS[w[2]];
    var w2 = q.match(/(^|\s)(نحن|احنا|حنا|we are|for)\s+([^\s]+)/);
    if (w2 && NUMWORDS[w2[3]] != null) return NUMWORDS[w2[3]];
    return 0;
  }
  function qtyIn(q) {
    var m = q.match(/(^|\s)(\d{1,2})(\s|$)/);
    if (m && Number(m[2]) > 0 && Number(m[2]) <= 50) return Number(m[2]);
    if (/(^|\s)(حبتين|اثنين|ثنتين|two)(\s|$)/.test(q)) return 2;
    var w = q.split(' ').filter(function (t) { return NUMWORDS[t] != null && NUMWORDS[t] <= 20; })[0];
    return w ? NUMWORDS[w] : 0;
  }
  function budget(q) {
    var cur = '(ريال|ريالا|ريالات|رس|sar|sr|riyal|riyals|rial)';
    var m = q.match(new RegExp('(\\d+)\\s*' + cur + '($|\\s)')) || q.match(/(ميزانيتي|ميزانيتنا|ميزانيه|معي|معاي|معنا|عندي|عندنا|لدي|لدينا|املك|نملك|بحدود|budget|have|got|under|max)\s*(\d+)\s*(ريال\S*|sar)?($|\s)/);
    if (!m) {
      /* written-out amounts: "خمسين ريال", "ميزانيتي عشرون ريالا" */
      var w = q.match(new RegExp('(^|\\s)([^\\s]+)\\s*' + cur + '($|\\s)'));
      if (w && NUMWORDS[w[2]] != null && NUMWORDS[w[2]] >= 3) return NUMWORDS[w[2]];
      return 0;
    }
    var v = Number(m[1]) || Number(m[2]);
    return v > 0 && v < 100000 ? v : 0;
  }
  function riyadhHour() {
    return new Date(Date.now() + (new Date().getTimezoneOffset() + 180) * 60000).getHours();
  }

  /* ================================================================
     ANSWERS
     ================================================================ */
  function utm(url, tag) { return url + (url.indexOf('?') === -1 ? '?' : '&') + 'utm_source=nahem24&utm_medium=chatbot&utm_campaign=order&utm_content=' + tag; }
  function wa(num, text) { return 'https://wa.me/' + String(num).replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function site(path) { return OPT.base + path; }
  function fmt(n) { return Math.round(n * 10) / 10; }
  function phone(n) { n = String(n).replace(/\D/g, '').replace(/^966/, '0'); return n.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4'); }

  var CTX = { last: [], topic: null };   /* remembers the last items for follow-ups ("كم سعره؟", "و 10؟") */

  function answer(raw, lang) {
    var X = function (ar, en) { return lang === 'en' ? en : ar; };
    var d = liveData(), s = d.settings, q = norm(raw);
    var N = function (i) { return lang === 'en' ? i.en : i.ar; };
    var SAR = X('ريال', 'SAR');
    var B = {
      order: { label: X('اطلب الآن', 'Order now'), href: utm(s.orderUrl, 'chatbot'), primary: true },
      wa: { label: X('واتساب الطلبات', 'WhatsApp orders'), href: wa(s.whatsapp, X('السلام عليكم، عندي استفسار', 'Hello, I have a question')) },
      support: { label: X('واتساب الدعم', 'WhatsApp support'), href: wa(s.supportWhatsapp, X('بلاغ نهم: ', 'Nahem support: ')), primary: true },
      menu: { label: X('المنيو الكامل', 'Full menu'), href: site('/#menu') },
      menuImg: { label: X('صورة المنيو', 'Menu image'), href: site('/assets/menu-nahem-full.jpg') },
      events: { label: X('حاسبة المناسبات', 'Events calculator'), href: site('/events/'), primary: true },
      companies: { label: X('سجّل شركتك', 'Register your company'), href: site('/companies/'), primary: true },
      ios: { label: 'App Store', href: s.appStore }, android: { label: 'Google Play', href: s.googlePlay },
      reviews: { label: X('تقييماتنا على Google', 'Google reviews'), href: s.reviewsUrl, primary: true }
    };
    var R = function (o) { o.lang = lang; CTX.topic = o.topic || null; return o; };
    var catName = function (k) { return CATS[k] ? CATS[k][lang === 'en' ? 'en' : 'ar'] : ''; };
    var popular = d.popular || byNames(d, ['بوكس البرجر', 'بوكس الخفايف', 'دبل سماش لحم']);
    var branchB = findBranch(d, q);
    var found = findItems(d, q);
    var words = q.split(' ').length;
    var waNum = phone(s.whatsapp), supNum = phone(s.supportWhatsapp);
    var HOURWORDS = ['ساعات', 'دوام', 'دوامكم', 'مفتوح', 'مفتوحين', 'فاتحين', 'تفتح', 'تفتحون', 'يفتح', 'تقفل', 'تقفلون', 'تسكر', 'تسكرون', 'يسكر', 'hours', 'open', 'opening', 'close', 'closing', 'closed'];

    if (!q) return R({ text: X('اكتب سؤالك وأنا حاضر 😊', "Type your question and I'm on it 😊") });

    /* ---------------- small talk ---------------- */
    if (/^(h+e*l+o+|h+i+|h+e+y+|hw?e+l+o+|yo|hola|salam|السلام عليكم|سلام|هلا|هلا والله|هلا وغلا|مرحبا|اهلا|اهلين|هاي|صباح الخير|مساء الخير|صباح النور|مساء النور|hello there|hi there|good morning|good evening)( .*)?$/.test(q) && words <= 4 && !found.length && !findCat(q))
      return R({ text: X('أهلًا وسهلًا فيك في نهم 👋\nوش تشتهي اليوم؟ أقدر أقترح لك وجبة، أوريك المنيو والأسعار، أحسب طلب لمجموعة، أو أجهّز طلبك وترسله لنا على واتساب.', 'Hey, welcome to Nahem 👋\nWhat are you craving today? I can suggest a meal, show the menu and prices, plan an order for a group, or build your order and send it to us on WhatsApp.'),
        chips: X(['وش تنصحني؟', 'المنيو والأسعار', 'وين فروعكم؟', 'العروض'], ['What do you recommend?', 'Menu & prices', 'Where are you?', 'Offers']) });
    if (/^(ok|okay|k|kk|تمام|طيب|اوكي|اوك|ماشي|حلو|زين|حسنا|اها|ايوه|ايه|نعم|yes|yeah|yep|sure|cool|great|nice|perfect|تمام التمام|كويس)$/.test(q))
      return R({ text: X('تمام 👌 تبغى شي ثاني؟', 'Great 👌 Anything else?'), chips: X(['وش تنصحني؟', 'عرض الطلب', 'وين فروعكم؟'], ['Recommend something', 'View order', 'Where are you?']) });
    if (/^(لا|لا شكرا|لا مشكور|no|nope|nah|no thanks|no thank you|not now)$/.test(q))
      return R({ text: X('ولا يهمك، أنا هنا إذا احتجت أي شي 🧡', "No problem, I'm here if you need anything 🧡") });
    if (has(q, ['كيفك', 'كيف حالك', 'شلونك', 'علومك', 'how are you', 'how r u', 'hows it going']))
      return R({ text: X('الحمدلله بخير 😊 وأنت؟ جوعان؟ قل لي وش تحب وأقترح لك.', "I'm great, thanks 😊 Hungry? Tell me what you like and I'll suggest something."), chips: X(['وش تنصحني؟', 'شي دجاج', 'شي لحم'], ['Recommend something', 'Chicken', 'Beef']) });
    if (has(q, ['شكرا', 'مشكور', 'يعطيك العافيه', 'تسلم', 'جزاك الله', 'الله يسعدك', 'ما قصرت', 'thanks', 'thank you', 'thx', 'appreciate it']))
      return R({ text: X('العفو، بالعافية مقدمًا 😋 إذا احتجت أي شيء ثاني أنا هنا.', "You're welcome, enjoy your meal 😋 I'm here if you need anything else.") });
    if (has(q, ['مع السلامه', 'في امان الله', 'bye', 'goodbye', 'see you', 'see ya']) || /^باي$/.test(q))
      return R({ text: X('في أمان الله، ننتظرك في نهم 🧡', 'Take care, see you at Nahem 🧡') });

    /* language requests that reach the engine (the chat window switches on its own) */
    if (words <= 5 && has(q, ['انجليزي', 'بالانجليزي', 'انقليزي', 'english']) && has(q, ['تكلم', 'كلمني', 'رد', 'حول', 'speak', 'talk', 'reply', 'switch', 'english']))
      return R({ text: 'Sure! Switching to English 👇 Ask me anything.', switchLang: 'en' });
    if (words <= 5 && has(q, ['عربي', 'بالعربي', 'arabic']) && has(q, ['تكلم', 'كلمني', 'رد', 'حول', 'speak', 'talk', 'reply', 'switch', 'عربي', 'arabic']))
      return R({ text: 'أكيد! حوّلت للعربي 👇 اسألني أي شي.', switchLang: 'ar' });

    /* "help me order": how many people, then chicken / beef / mix, then a ready basket */
    var wizNum = (CTX.topic === 'wiz1') && (q.match(/^(\d{1,3})( .*)?$/) || []) [1];
    if (CTX.topic === 'wiz1' && !wizNum && /^(شخص واحد|واحد|لحالي|one|just me)$/.test(q)) wizNum = '1';
    if (wizNum) {
      CTX.wiz = Math.max(1, Math.min(200, Number(wizNum)));
      return R({ text: X('تمام، ' + (CTX.wiz === 1 ? 'لشخص واحد' : 'لـ ' + CTX.wiz + ' أشخاص') + ' 👌 وش تفضّلون؟', 'Got it, ' + CTX.wiz + (CTX.wiz === 1 ? ' person' : ' people') + ' 👌 What do you prefer?'),
        chips: X(['دجاج 🍗', 'لحم 🥩', 'منوّع 🤝'], ['Chicken 🍗', 'Beef 🥩', 'A mix 🤝']), topic: 'wiz2' });
    }
    if (CTX.topic === 'wiz2' && CTX.wiz) {
      var taste = has(q, ['دجاج', 'chicken']) ? 'chicken' : has(q, ['لحم', 'beef', 'meat']) ? 'beef' : has(q, ['منوع', 'مشكل', 'الاثنين', 'اي شي', 'مو مهم', 'mix', 'both', 'any', 'whatever']) ? 'mix' : '';
      if (taste) return wizardPlan(d, CTX.wiz, taste, X, N, B, R);
    }
    if (has(q, ['غير العدد', 'change the number']) || has(q, ['ساعدني اطلب', 'ساعدني في الطلب', 'ساعدني بالطلب', 'رتب لي طلب', 'رتبلي طلب', 'جهز لي طلب', 'جهزلي طلب', 'ما ادري وش اطلب', 'مو عارف وش اطلب', 'مدري وش اطلب', 'help me order', 'help me choose', 'build my order', 'plan my order', 'make me an order', 'order for me']))
      return R({ text: X('أبشر! نرتّب طلبك بخطوتين 👌\nكم شخص؟', 'Happy to! Two quick questions 👌\nHow many people?'), chips: ['1', '2', '3', '4', '5', '6', '8', '10'], topic: 'wiz1' });

    /* what the assistant can do */
    if (has(q, ['وش تقدر تسوي', 'وش تسوي', 'ايش تقدر', 'وش تقدر', 'كيف استخدمك', 'كيف اتعامل معك', 'كيف تشتغل', 'ساعدني', 'مساعده', 'وش اسالك', '=help', 'what can you do', 'what can u do', 'what do you do', 'how does this work', 'how do you work', 'how can you help', 'what can i ask', 'can you help', 'help me', 'what is this chatbot', 'what is this']))
      return R({ text: X('أقدر أساعدك في كل شي يخص نهم 😊\n• أقترح لك وجبة حسب وقتك وذوقك وميزانيتك\n• أوريك المنيو والأسعار مع الصور\n• أحسب طلب لمجموعة أو مناسبة\n• أجهّز طلبك هنا (اضغط + على أي صنف) وترسله لنا على واتساب\n• الفروع والخرائط وساعات العمل\n• العروض وكود التطبيق وعرض الشركات\n• الشكاوى، وأوصلك بفريقنا\nجرّب تكتب: «احنا 6 أشخاص» أو «عندي 25 ريال» أو «أضف بوكس البرجر».', 'I can help with anything about Nahem 😊\n• Suggest a meal for your time, taste and budget\n• Show the menu and prices with photos\n• Plan an order for a group or event\n• Build your order here (tap + on any item) and send it to us on WhatsApp\n• Branches, maps and opening hours\n• Offers, the app code and the company offer\n• Complaints, and connecting you to our team\nTry: "we are 6 people", "I have 25 SAR" or "add a Burger Box".'),
        chips: X(['وش تنصحني؟', 'احنا 6 أشخاص', 'عندي 25 ريال', 'أضف بوكس البرجر'], ['What do you recommend?', 'We are 6 people', 'I have 25 SAR', 'Add a Burger Box']) });
    if (has(q, ['مين انت', 'من انت', 'وش انت', 'انت بوت', 'انت روبوت', 'انت انسان', 'ذكاء اصطناعي', 'اسمك', 'who are you', 'are you a bot', 'are you human', 'your name', 'are you real', 'chatgpt', '=gpt', '=ai', 'robot']))
      return R({ text: X('أنا مساعد نهم الآلي 🤖 أرد فورًا على أسئلتك عن المنيو والأسعار والفروع، وأجهّز طلبك. وإذا تبغى تكلم موظف، فريقنا موجود على واتساب.', "I'm Nahem's automated assistant 🤖 I answer instantly about the menu, prices and branches, and I can build your order. To talk to a person, our team is on WhatsApp."), buttons: [B.wa] });
    if (has(q, ['نكته', 'نكت', 'ضحكني', 'joke', 'funny', 'make me laugh']))
      return R({ text: X('مرة برجر دخل مسابقة جري… وفاز لأنه «دبل سماش» 😂\nتبي تجرب الفايز؟', 'Why did the burger win the race? It was a double smash 😂\nWant to try the winner?'), cards: byNames(d, ['دبل سماش لحم']), buttons: [B.order] });
    if (has(q, ['احبكم', 'نحبكم', 'يجنن', 'يجنون', 'رهيب', 'خرافي', 'تحفه', 'اسطوري', 'فنان', 'i love', 'love nahem', 'love you', 'amazing', 'awesome', 'delicious food', 'great food', 'best restaurant']))
      return R({ text: X('يا هلا! كلامك أسعدنا كثير 🧡 ويسعدنا أكثر لو تكتب رأيك في تقييم Google، يفرق معنا.', 'That made our day 🧡 We would love it if you shared that in a Google review. It really helps us.'), buttons: [B.reviews] });
    if (has(q, ['كلم موظف', 'اكلم موظف', 'ابي موظف', 'ابغى موظف', 'ابغي موظف', 'شخص حقيقي', 'خدمه العملاء', 'خدمه عملاء', 'اكلم احد', 'ابي اكلم', 'ابغى اكلم', 'المدير', 'مدير', 'مسؤول', 'التحدث مع', 'اتحدث مع', 'التواصل مع موظف', 'اتواصل مع موظف', 'موظف خدمه', 'talk to a person', 'talk to someone', 'speak to', 'human', 'agent', 'real person', 'customer service', 'manager', 'supervisor']))
      return R({ text: X('أكيد! فريق نهم يرد عليك على واتساب:\n• للطلبات والاستفسارات: ' + waNum + '\n• للشكاوى والدعم: ' + supNum, 'Of course! The Nahem team answers on WhatsApp:\n• Orders and questions: ' + waNum + '\n• Complaints and support: ' + supNum), buttons: [Object.assign({}, B.wa, { primary: true }), B.support] });

    /* ---------------- problems with an order ---------------- */
    if (has(q, ['الغاء', 'الغي', 'كنسل', 'cancel', 'تعديل الطلب', 'اعدل الطلب', 'اعدل طلبي', 'عدل طلبي', 'تعديل طلبي', 'اغير الطلب', 'اغير طلبي', 'modify', 'change my order', 'وين طلبي', 'تاخر طلبي', 'طلبي متاخر', 'تتبع', 'track', 'where is my order', 'استرجاع', 'استرجع', 'استرداد', 'فلوسي', 'refund', 'money back']))
      return R({ text: X('ما أقدر أشوف الطلبات أو أعدّلها من هنا 🙏\nلإلغاء طلب أو تعديله أو متابعته أو استرجاع مبلغ، راسل فريق الدعم على واتساب ' + supNum + ' واكتب رقم الطلب واسمك، ويتابعونه معك مباشرة.', "I can't see or change orders from here 🙏\nTo cancel, change, track or get a refund, message support on WhatsApp " + supNum + ' with your order number and name, and they will handle it directly.'), buttons: [B.support] });
    if (has(q, ['كم ياخذ', 'كم يستغرق', 'مده التجهيز', 'وقت التجهيز', 'متي يجهز', 'متي يكون جاهز', 'يتاخر', 'كم دقيقه', 'how long', 'preparation time', 'prep time', 'wait time', 'how fast', 'how quickly', 'ready in']))
      return R({ text: FACTS.prepTime ? X(FACTS.prepTime.ar, FACTS.prepTime.en) : X('ما عندي وقت تجهيز ثابت أقدر أأكده لك 🙏 منصة الطلب توضح لك وقت الاستلام عند الطلب. ولو طلبك مستعجل أو تأخر، راسل فريق الدعم على واتساب ' + supNum + '.', "I don't have a fixed preparation time I can confirm 🙏 The ordering platform shows your pickup time when you order. If you're in a hurry or your order is late, message support on WhatsApp " + supNum + '.'), buttons: [B.order, B.support] });
    var coldFood = has(q, ['بارد', 'بارده', 'cold']) && has(q, ['اكل', 'الاكل', 'طلب', 'الطلب', 'وصل', 'وصلني', 'food', 'order', 'was', 'arrived', 'burger', 'برجر']) && !has(q, ['مشروب', 'drink', 'drinks']);
    if (coldFood || has(q, ['شكوي', 'شكاوي', 'اشتكي', 'مشكله', 'متاخر', 'غلط', 'بلاغ', 'ناقص', 'سيء', 'سيئ', 'خايس', 'زعلان', 'وصلني', 'مو زين', 'ما عجبني', 'شعره', 'complaint', 'complain', 'problem', 'issue', 'wrong', 'not good', 'awful', '=bad', 'missing', 'terrible', 'disappointed', 'disgusting']))
      return R({ text: X('نعتذر منك جدًا على هالتجربة 🙏 رأيك يهمنا.\nأرسل لفريق الدعم على واتساب ' + supNum + ':\n• رقم الطلب\n• الفرع ووقت الطلب\n• وش صار (وصورة لو أمكن)\nويتابعونه معك بأسرع وقت.', "We're really sorry about this 🙏 Your feedback matters.\nSend our support team on WhatsApp " + supNum + ':\n• your order number\n• the branch and time\n• what happened (a photo helps)\nand they will follow up quickly.'), buttons: [B.support] });

    /* ---------------- the chat order basket ---------------- */
    if (has(q, ['امسح السله', 'فضي السله', 'امسح الطلب', 'امسح طلبي', 'ابدا من جديد', 'clear cart', 'empty cart', 'clear my order', 'clear basket', 'start over']))
      return R({ text: X('تم تفريغ طلبك 🧺 أضف أصناف جديدة متى ما حبيت.', 'Your order is cleared 🧺 Add new items any time.'), clearCart: true });
    if (has(q, ['شيل', 'احذف', 'نزل', '=امسح', '=remove', 'delete', 'take off', 'take out']) && found.length && (found.exact || found.length === 1))
      return R({ text: X('تم حذف ' + N(found[0]) + ' من طلبك ✅', 'Removed ' + N(found[0]) + ' from your order ✅'), removeFromCart: [found[0]], showCart: true });
    if (has(q, ['سلتي', 'السله', 'سله الطلب', 'وش في طلبي', 'طلبي الحالي', 'عرض الطلب', 'راجع الطلب', 'ارسل الطلب', 'ارسل طلبي', 'اكمل الطلب', 'اكمل طلبي', 'كم صار', 'المجموع', '=خلصت', 'بس كذا', 'my cart', 'cart', 'basket', 'view order', 'my order so far', 'checkout', 'send my order', 'send order', '=total', 'thats all', 'that s all', '=done', 'how much is my order']))
      return R({ text: X('طلبك 🛒', 'Your order 🛒'), showCart: true });

    /* ---------------- business enquiries ---------------- */
    if (has(q, ['امتياز', 'فرنشايز', 'فرانشايز', 'فرانشيز', 'franchise', 'شراكه', 'استثمار', 'افتح فرع', 'فتح فرع', 'invest', 'investment', 'open a branch', 'own branch']))
      return R({ text: X('يسعدنا اهتمامك بامتياز نهم 🤝\nقدّم طلب الفرنشايز من الرابط، وفريق التطوير يتواصل معك ويشرح لك الشروط والخطوات.', 'Glad you are interested in a Nahem franchise 🤝\nApply through the link and the development team will contact you with the terms and next steps.'), buttons: [{ label: X('طلب الفرنشايز', 'Franchise application'), href: s.franchiseUrl, primary: true }] });
    if (has(q, ['وظيفه', 'وظائف', 'توظيف', 'سيره ذاتيه', 'سي في', 'اتوظف', 'اشتغل عندكم', 'ابي اشتغل', 'ابغى اشتغل', 'دوام جزئي', 'job', 'jobs', 'career', 'careers', 'cv', 'resume', 'hiring', 'vacancy', 'work for you', 'work with you', 'work at nahem']))
      return R({ text: X('حيّاك في فريق نهم 💪\nأرسل سيرتك الذاتية على البريد: ' + s.careersEmail + '\nواكتب في العنوان الوظيفة اللي تبغاها.', 'Join the Nahem team 💪\nEmail your CV to ' + s.careersEmail + ' and put the role you want in the subject.') });
    if (has(q, ['شركه', 'شركات', 'شركتي', 'شركتنا', 'موظفين', 'موظفينا', 'خصم للموظفين', 'company', 'companies', 'corporate', 'employees', 'office', 'staff']) && !peopleCount(q))
      return R({ text: X('برنامج نهم للشركات 🏢\n• خصم ' + s.companiesDiscount + '% لكل موظفي الشركة المشتركة\n• توصيل مجاني للطلبات من ' + s.companiesFreeFrom + ' ريال فأكثر بعد الخصم\n• فطور وغداء وسناك وضيافة اجتماعات\n• الاشتراك مجاني، وتوصلكم بطاقة رقمية على واتساب فورًا\nالتسجيل ياخذ دقيقة من صفحة الشركات.', 'Nahem for Companies 🏢\n• ' + s.companiesDiscount + '% off for all staff of a registered company\n• Free delivery on orders of ' + s.companiesFreeFrom + ' SAR or more after the discount\n• Breakfast, lunch, snacks and meeting hospitality\n• Free to join; your digital card arrives on WhatsApp instantly\nRegistering takes a minute on the companies page.'), buttons: [B.companies, B.wa] });

    /* ---------------- groups and budgets ---------------- */
    var people = peopleCount(q) || (CTX.topic === 'group' && /^(و |and )?(ل|for )?\s*\d+\s*$/.test(q) ? Number(q.replace(/\D/g, '')) : 0);
    var money = budget(q);
    var breakfast = has(q, CATS.breakfast.keys);
    if (people >= 2) return groupPlan(d, people, money, X, N, SAR, B, R, breakfast);
    if (people === 1 && !money) return recommend(d, X, B, R, popular, X('لشخص واحد، هذي أفضل اختياراتي 👇', 'For one person, these are my top picks 👇'));

    /* ---------------- adding to the basket: "ابي 2 زنجر", "3 بوكس برجر و 2 خفايف" ---------------- */
    var addVerb = has(q, ['=اضف', '=ضيف', '=زيد', '=حط', '=ابي', '=ابغي', '=ابغا', '=اريد', '=بطلب', '=عطني', '=بغيت', '=ودي', 'add', 'i want', 'ill have', 'i ll have', 'i will have', 'give me', 'get me', 'ill take', 'i ll take', 'i d like'])
      && !has(q, ['سعر', '=كم', '=بكم', '=وش', '=ايش', 'مكونات', 'اعرف', 'how much', 'price', 'what is', 'whats', 'know']);
    var segs = q.split(/\s+و\s+|\s+و(?=\d)|\s+and\s+/).map(function (seg) {
      var f = findItems(d, seg), n = qtyIn(seg);
      var ok = f.length && (f.exact ? f.exactCount === 1 : (n && f.length === 1));
      return ok ? [n || 1, f[0]] : null;
    });
    var picked = segs.filter(Boolean);
    if (picked.length && picked.length === segs.length && (addVerb || segs.every(function (x, i) { return qtyIn(q.split(/\s+و\s+|\s+و(?=\d)|\s+and\s+/)[i]); }))) {
      CTX.last = picked.map(function (x) { return x[1]; });
      return R({ text: X('تمت إضافة ', 'Added ') + picked.map(function (x) { return x[0] + ' × ' + N(x[1]); }).join(X(' و', ' and ')) + X(' لطلبك ✅', ' to your order ✅'), addToCart: picked, showCart: true });
    }

    /* ---------------- events ---------------- */
    if (has(q, ['مناسبه', 'مناسبات', 'حفله', 'حفلات', 'جمعه', 'جمعات', 'عزيمه', 'عزومه', 'استراحه', 'اجتماع', 'كميات', 'طلب كبير', 'لمجموعه', 'مجموعه', 'event', 'events', 'party', 'catering', 'gathering', 'bulk', 'large order', 'group', 'for a group']) && !has(q, HOURWORDS))
      return R({ text: X('للمناسبات والجمعات عندنا بوكسات مصممة للمشاركة 🎉\n• بوكس البرجر 79 ريال: يكفي نحو 4 أشخاص\n• بوكس الخفايف 49 ريال: يكفي نحو 5 أشخاص\nقل لي كم عددكم (مثلًا "احنا 12") وأحسب لك الكمية والسعر، أو استخدم حاسبة المناسبات وأرسل الطلب جاهز على واتساب. نؤكد لك السعر النهائي وموعد الاستلام، وكل ما كان الطلب أبكر كان التجهيز أريح.', 'For events and gatherings we have sharing boxes 🎉\n• Burger Box 79 SAR: feeds about 4\n• Snack Box 49 SAR: feeds about 5\nTell me how many you are (e.g. "we are 12") and I will work out the quantities and price, or use the events calculator and send the order on WhatsApp. We confirm the final price and pickup time; earlier is better for big orders.'),
        cards: byNames(d, ['بوكس البرجر', 'بوكس الخفايف']), buttons: [B.events, B.wa], chips: X(['احنا 10', 'احنا 25', 'احنا 50'], ['We are 10', 'We are 25', 'We are 50']), topic: 'group' });
    if (has(q, ['احجز', 'حجز', 'مسبق', 'مسبقا', 'قبل بيوم', 'بكره', 'باكر', 'in advance', 'reserve', 'reservation', 'pre order', 'preorder', 'schedule', 'tomorrow']))
      return R({ text: X('أكيد تقدر تطلب مسبقًا 👍\n• للطلبات العادية: اطلب من منصة نهم، أو أرسل طلبك على واتساب مع الوقت اللي يناسبك\n• للمناسبات والكميات: أرسل لنا التاريخ والوقت والعدد على واتساب، ونأكد معك. وكل ما كان أبكر كان أريح 👌', 'Yes, you can order ahead 👍\n• Regular orders: order on the Nahem platform, or send your order on WhatsApp with the time that suits you\n• Events and large orders: send us the date, time and headcount on WhatsApp and we will confirm. The earlier, the better 👌'), buttons: [B.wa, B.events] });

    /* ---------------- offers, app, club, prices ---------------- */
    if (has(q, ['كيف استخدم الكود', 'وين احط الكود', 'وين اكتب الكود', 'كيف احط الكود', 'how do i use the code', 'where do i enter', 'use the code']))
      return R({ text: X('حمّل تطبيق نهم، أضف أصنافك للسلة، وقبل الدفع اكتب الكود ' + s.appCode + ' في خانة كود الخصم، ويطلع لك خصم 10% 🎉', 'Download the Nahem app, add your items, and before paying enter ' + s.appCode + ' in the discount code field for 10% off 🎉'), buttons: [Object.assign({}, B.ios, { primary: true }), B.android] });
    var offersText = X('• خصم 10% على طلبك من تطبيق نهم بكود: ' + s.appCode + '\n• عرض السعودية سماش: أضف سماش دجاج بـ 3 ريال مع أي برجر\n• عرض الحلى: حيسة أو كوكيز + مشروب بـ 12 ريال\n• الشركات: خصم ' + s.companiesDiscount + '% للموظفين وتوصيل مجاني', '• 10% off in the Nahem app with code: ' + s.appCode + '\n• Saudi Smash: add a chicken smash for 3 SAR with any burger\n• Dessert offer: heisa or cookies + a drink for 12 SAR\n• Companies: ' + s.companiesDiscount + '% staff discount and free delivery');
    var discountWords = ['عرض', 'عروض', 'خصم', 'خصومات', 'تخفيض', 'كوبون', 'كود', 'برومو', 'offer', 'offers', 'discount', 'promo', 'coupon', 'code', 'deal', 'deals', 'sale'];
    if (has(q, ['طالب', 'طلاب', 'جامعه', 'جامعي', 'student', 'students', 'university']) && has(q, discountWords))
      return R({ text: X('ما عندنا حاليًا عرض خاص للطلاب معلن 🙏 لكن تقدر تستفيد من:\n', "We don't have a student discount right now 🙏 but you can use:\n") + offersText, buttons: [B.ios, B.android] });
    if (has(q, discountWords) && !found.exact) {
      var dp = activeDaypart(d, lang);
      return R({ text: X('عروض نهم الحالية 🔥\n', 'Current Nahem offers 🔥\n') + offersText + (dp ? X('\n• متاح الآن: ', '\n• Available now: ') + dp : '') + X('\nالعروض تتجدد، وأحدثها يظهر أعلى الموقع.', '\nOffers change; the latest is shown at the top of the site.'),
        buttons: [B.order, B.ios, B.android], chips: X(['كيف أستخدم الكود؟', 'عرض الشركات', 'الأكثر طلبًا'], ['How do I use the code?', 'Company offer', 'Best sellers']) });
    }
    var deliveryApps = has(q, ['هنقرستيشن', 'هنقر', 'مرسول', 'كيتا', 'تويو', 'نينجا', 'hungerstation', 'jahez', 'keeta', 'toyou', 'ninja', 'mrsool', 'talabat', 'careem', 'كريم']) || /(في|على|من|تطبيق) جاهز/.test(q);
    if (has(q, ['ليش السعر', 'السعر غير', 'السعر مختلف', 'الاسعار مختلفه', 'سعر مختلف', 'اختلاف السعر', 'different price', 'price different', 'prices differ', 'prices are different', 'price is different']))
      return R({ text: X('الأسعار اللي في موقعنا هي أسعار الفرع ومنصة نهم 👌 تطبيقات التوصيل الخارجية تحدد أسعارها بنفسها، عشان كذا ممكن تختلف.\nأوفر طريقة تطلب فيها: تطبيق نهم بخصم 10% (كود ' + s.appCode + ')، أو منصة نهم والاستلام من الفرع.', 'The prices on our site are branch prices and the Nahem platform 👌 Outside delivery apps set their own prices, so they can differ.\nThe best-value way to order: the Nahem app with 10% off (code ' + s.appCode + '), or the Nahem platform with branch pickup.'), buttons: [B.order, B.ios, B.android] });
    if (has(q, ['تطبيق', 'app', 'application', 'download', 'ايفون', 'اندرويد', 'iphone', 'android', 'play store', 'app store']) && !deliveryApps)
      return R({ text: X('تطبيق نهم 📱\n• خصم 10% على طلبك بكود ' + s.appCode + '\n• توصلك العروض والكوبونات أول\n• تحفظ طلباتك وتعيدها بضغطة\nمتوفر على App Store و Google Play.', 'The Nahem app 📱\n• 10% off with code ' + s.appCode + '\n• Get offers and coupons first\n• Save your orders and reorder in one tap\nOn the App Store and Google Play.'), buttons: [Object.assign({}, B.ios, { primary: true }), B.android] });
    if (has(q, ['نادي نهم', 'النادي', 'club', 'membership', 'عضويه']))
      return R({ text: X('انضم لنادي نهم على واتساب، وخلك أول واحد يعرف عن العروض والكوبونات 🧡', 'Join Nahem Club on WhatsApp and be the first to hear about offers and coupons 🧡'), buttons: [{ label: X('انضم لنادي نهم', 'Join Nahem Club'), href: wa(s.whatsapp, 'أبغى أنضم لنادي نهم'), primary: true }] });
    if (has(q, ['غالي', 'غاليه', 'غاليين', 'مكلف', 'اسعاركم مرتفعه', 'expensive', '=pricey', 'overpriced', 'too much money']))
      return R({ text: X('نفهمك 🙏 وعشان كذا عندنا خيارات توفّر عليك:\n• خصم 10% من تطبيق نهم بكود ' + s.appCode + '\n• بوكس الخفايف 49 ريال يكفي 5 (نحو 10 ريال للشخص)\n• ساندوتشات الفطور تبدأ من 4 ريال\n• وجبة نهم 28 ريال: برجر + بطاطس + استربس + مشروب', "We hear you 🙏 That's why we have ways to save:\n• 10% off in the Nahem app with code " + s.appCode + '\n• Snack Box 49 SAR feeds 5 (about 10 SAR each)\n• Breakfast sandwiches from 4 SAR\n• Nahem Meal 28 SAR: burger + fries + strip + drink'),
        cards: byNames(d, ['بوكس الخفايف', 'وجبة نهم', 'ساندوتش جبنتين']), buttons: [B.order, B.ios] });

    /* ---------------- facts the site does not state ---------------- */
    /* fat, protein, carbs, sugar, salt: not published; give the calories we have and hand over */
    if (has(q, ['دهون', 'الدهون', 'بروتين', 'البروتين', 'كربوهيدرات', 'كارب', 'سكريات', '=السكر', '=سكر', 'صوديوم', '=ملح', 'الملح', 'قيمه غذائيه', 'القيم الغذائيه', 'الياف', '=fat', '=fats', 'protein', 'carbs', 'carb', 'carbohydrates', '=sugar', 'sodium', '=salt', 'nutrition', 'nutritional', 'macros', 'fiber', 'fibre', 'cholesterol'])) {
      if (FACTS.nutrition) return R({ text: X(FACTS.nutrition.ar, FACTS.nutrition.en), buttons: [B.order] });
      var nItems = found.length && (found.exact || found.length <= 3) ? found.slice(0, 3) : CTX.last.slice(0, 3);
      var kLines = nItems.map(function (i) { var c = kcalOf(i); return c ? '• ' + N(i) + ': ' + (c.est ? X('نحو ', 'about ') : '') + c.n + X(' سعرة', ' kcal') : null; }).filter(Boolean);
      return R({ text: X('ما عندي حاليًا تفاصيل الدهون والبروتين والكربوهيدرات والسكر لأصنافنا، وما أبغى أعطيك أرقام غير دقيقة 🙏', "I don't have fat, protein, carb or sugar figures for our items yet, and I don't want to give you inaccurate numbers 🙏")
          + (kLines.length ? X('\nاللي أقدر أعطيك إياه هو السعرات:\n', '\nWhat I can give you is the calories:\n') + kLines.join('\n') : X('\nأقدر أعطيك السعرات الحرارية لأي صنف، مثلًا: «كم سعرات الزنجر؟»', '\nI can give you the calories of any item, e.g. "calories in the zinger".'))
          + X('\nولتفاصيل غذائية أكثر، فريقنا على واتساب ' + waNum + '.', '\nFor more nutrition details, our team is on WhatsApp ' + waNum + '.'),
        cards: nItems.length ? nItems : null, buttons: [B.wa], chips: X(['أخف الأصناف', 'أقل من 400 سعرة'], ['Lightest items', 'Under 400 kcal']) });
    }

    /* calories: exact from the menu, estimates marked as approximate */
    /* "سعره" alone also means "its price", so it only counts as calories after a number ("500 سعرة") */
    if (!FACTS.calories && (has(q, ['سعرات', 'كالوري', 'كالوريز', 'calorie', 'calories', 'kcal', '=cal', 'low calorie', 'low cal', 'اخف الاصناف', 'lightest items']) || /\d+\s*(سعره|kcal|cal)($|\s)/.test(q))) {
      var calLine = function (i) { var c = kcalOf(i); return c ? '• ' + N(i) + ': ' + (c.est ? X('نحو ', 'about ') : '') + c.n + X(' سعرة', ' kcal') : null; };
      var anyEst = function (list) { return list.some(function (i) { var c = kcalOf(i); return c && c.est; }); };
      var estNote = X('\n(الأرقام اللي قبلها «نحو» تقديرية، والباقي من منيو نهم.)', '\n(Figures marked "about" are estimates; the others are from the Nahem menu.)');
      var limit = (q.match(/(اقل من|تحت|under|less than|below|max)\s*(\d{2,4})/) || [])[2];
      if (limit) {
        var under = d.items.filter(function (i) { var c = kcalOf(i); return c && c.n > 0 && c.n <= Number(limit) && ['drinks', 'sauces'].indexOf(i.cat) === -1; }).sort(function (a, b) { return kcalOf(a).n - kcalOf(b).n; });
        if (!under.length) return R({ text: X('ما عندنا صنف أقل من ' + limit + ' سعرة 🙏 أخف شي عندنا ساندوتش التونة (290 سعرة).', 'Nothing on the menu is under ' + limit + ' kcal 🙏 Our lightest is the Tuna Sandwich (290 kcal).'), cards: byNames(d, ['ساندوتش تونة']), buttons: [B.order] });
        CTX.last = under.slice(0, 3);
        return R({ text: X('أصناف أقل من ' + limit + ' سعرة 🥗\n', 'Items under ' + limit + ' kcal 🥗\n') + under.slice(0, 8).map(calLine).join('\n') + (anyEst(under) ? estNote : ''), cards: under.slice(0, 6), buttons: [B.order] });
      }
      var calItems = found.length && (found.exact || found.length <= 3) ? found.slice(0, 3) : (CTX.last.length && /(^|\s)(سعراته|سعراتها|سعراتهم|its calories|calories in it|their calories)($|\s)/.test(q) ? CTX.last : []);
      if (calItems.length) {
        CTX.last = calItems;
        return R({ text: X('السعرات الحرارية 🔥\n', 'Calories 🔥\n') + calItems.map(calLine).filter(Boolean).join('\n') + (anyEst(calItems) ? estNote : ''), cards: calItems, buttons: [B.order] });
      }
      var light = d.items.filter(function (i) { var c = kcalOf(i); return c && c.n >= 200 && ['drinks', 'sauces', 'boxes'].indexOf(i.cat) === -1; }).sort(function (a, b) { return kcalOf(a).n - kcalOf(b).n; });
      CTX.last = light.slice(0, 3);
      return R({ text: X('أخف الأصناف بالسعرات 🥗\n', 'Our lightest items by calories 🥗\n') + light.slice(0, 6).map(calLine).join('\n') + (anyEst(light.slice(0, 6)) ? estNote : '') + X('\nاسألني عن أي صنف، مثلًا: «كم سعرات الزنجر؟»', '\nAsk me about any item, e.g. "calories in the zinger".'),
        cards: light.slice(0, 4), buttons: [B.order], chips: X(['أقل من 400 سعرة', 'كم سعرات الزنجر؟', 'سعرات بوكس البرجر'], ['Under 400 kcal', 'Calories in the zinger', 'Burger Box calories']) });
    }
    var factTopics = [
      ['payment', ['دفع', 'ادفع', 'الدفع', '=مدي', '=بمدي', 'فيزا', 'كاش', 'نقدا', 'ابل باي', 'تمارا', 'تابي', 'stc pay', 'بطاقه', '=pay', 'payment', '=card', '=cash', 'apple pay', 'visa', 'mada', 'tabby', 'tamara'], ['طرق الدفع', 'payment methods'], X('\nوطرق الدفع المتاحة تظهر لك في منصة الطلب قبل ما تأكد طلبك.', '\nThe available payment methods are shown on the ordering platform before you confirm.')],
      ['dineIn', ['جلسات', 'جلسه', 'اجلس', 'نجلس', 'صاله', 'داخلي', 'عائلات', 'عوائل', 'dine in', 'seating', 'sit inside', 'tables', 'eat there', 'eat in'], ['الجلسات داخل الفروع', 'seating in the branches'], ''],
      ['parking', ['مواقف', 'موقف سيارات', 'باركنق', 'parking'], ['المواقف', 'parking'], ''],
      ['calories', ['سعرات', 'كالوري', 'كالوريز', 'calorie', 'calories', 'kcal'], ['السعرات الحرارية', 'calories'], X('\nوإذا تبي شي أخف، جرّب السلطات أو ساندوتش التونة أو الفلافل.', '\nFor something lighter, try the salads or the tuna or falafel sandwich.')],
      ['allergens', ['حساسيه', 'جلوتين', 'قلوتين', 'مكسرات', 'لاكتوز', 'فول سوداني', 'allergy', 'allergic', 'allergen', 'allergens', 'gluten', 'nuts', 'peanut', 'lactose'], ['مسببات الحساسية', 'allergens'], ''],
      ['halal', ['حلال', 'مذبوح', 'halal'], ['مصدر اللحوم والدجاج', 'meat and chicken sourcing'], ''],
      ['vat', ['ضريبه', 'القيمه المضافه', '=vat', '=tax'], ['الضريبة في الأسعار', 'VAT in the prices'], '']
    ];
    for (var f = 0; f < factTopics.length; f++) {
      var ft = factTopics[f];
      if (has(q, ft[1])) {
        var fact = FACTS[ft[0]];
        if (fact) return R({ text: X(fact.ar, fact.en), buttons: [B.order] });
        var extra = ft[0] === 'allergens' && found.exact ? X('\nمكونات ' + N(found[0]) + ' حسب المنيو: ' + found[0].dAr + '.', '\n' + N(found[0]) + ' per the menu: ' + found[0].dEn + '.') : '';
        return R({ text: X('ما عندي معلومة مؤكدة عن ' + ft[2][0] + ' حاليًا، وما أبغى أعطيك معلومة غلط 🙏' + extra + ft[3] + '\nفريقنا يجاوبك بدقة على واتساب ' + waNum + '.', "I don't have confirmed information about " + ft[2][1] + " yet, and I don't want to guess 🙏" + extra + ft[3] + '\nOur team will answer exactly on WhatsApp ' + waNum + '.'), buttons: [B.wa] });
      }
    }
    if (has(q, ['بدون', 'زياده', 'اضافي', 'اكسترا', 'extra', 'without', 'no cheese', 'no onion', 'no sauce', 'no pickles', 'customize', 'customise']) && !has(q, ['بدون لحم', 'بدون دجاج', 'no meat', 'without meat']))
      return R({ text: X('أكيد تقدر تعدّل طلبك 👌 (مثل بدون جبن، أو صوص زيادة)\nاكتب ملاحظتك مع الطلب، أو أرسلها لنا مع طلبك على واتساب ' + waNum + '. والصوصات الإضافية بـ 2 ريال (ثوم، حراق، كوكتيل أو سيزر).', 'Sure, you can customise your order 👌 (e.g. no cheese, or extra sauce)\nAdd a note with your order, or send it with your order on WhatsApp ' + waNum + '. Extra sauces are 2 SAR (garlic, spicy, cocktail or Caesar).'), buttons: [B.wa, B.order] });

    /* ---------------- delivery ---------------- */
    if (deliveryApps)
      return R({ text: X('أسعار تطبيقات التوصيل الخارجية تختلف عن أسعار الفرع 👀 وللتأكد إذا نهم متوفر في تطبيق معيّن، راسلنا على واتساب ' + waNum + '.\nوالأوفر لك: تطبيق نهم بخصم 10% (كود ' + s.appCode + ')، أو منصة نهم والاستلام من الفرع.', 'Prices on outside delivery apps differ from branch prices 👀 To check whether Nahem is on a specific app, message us on WhatsApp ' + waNum + '.\nBest value: the Nahem app with 10% off (code ' + s.appCode + '), or the Nahem platform with branch pickup.'), buttons: [B.ios, B.order, B.wa] });
    if (has(q, ['توصيل', 'توصلون', 'يوصل', 'دليفري', 'ديليفري', 'delivery', 'deliver', 'delivering']))
      return R({ text: FACTS.delivery ? X(FACTS.delivery.ar, FACTS.delivery.en) : X('الطلب من منصة نهم يكون مع الاستلام من الفرع اللي تختاره 🚗 تطلب قبل ما توصل وتستلمه جاهز.\nلمعرفة توفر التوصيل لموقعك ورسومه، راسلنا على واتساب ' + waNum + '.\nوللشركات المشتركة: توصيل مجاني للطلبات من ' + s.companiesFreeFrom + ' ريال فأكثر.', 'Orders on the Nahem platform are picked up from the branch you choose 🚗 Order before you arrive and collect it ready.\nTo check delivery to your area and its fee, message us on WhatsApp ' + waNum + '.\nRegistered companies get free delivery on orders of ' + s.companiesFreeFrom + ' SAR or more.'),
        buttons: [B.order, B.wa] });

    /* ---------------- about Nahem and the food ---------------- */
    if (has(q, ['وش نهم', 'وش هو نهم', 'ايش نهم', 'ما هو نهم', 'وش هو مطعم', 'مطعم نهم', 'عن نهم', 'عن مطعمكم', 'نوع الاكل', 'وش تقدمون', 'وش تبيعون', 'what is nahem', 'who is nahem', 'about nahem', 'what kind of food', 'what type of food', 'what food', 'what do you serve', 'what do you sell', 'tell me about']))
      return R({ text: X('نهم مطعم برجر وساندوتشات فريش في المدينة المنورة 🍔\nعندنا سماش برجر، ساندوتشات بريوش، راب، فطور، بوكسات للمشاركة، وحيسة نهم المدينية. الخبز والصوصات تتجهز يوميًا، ومفتوحين 24 ساعة في فرعين: القصواء والعريض.\nوهذي الأكثر طلبًا:', 'Nahem is a fresh burger and sandwich restaurant in Madinah 🍔\nWe serve smash burgers, brioche sandwiches, wraps, breakfast, sharing boxes and our Madinah-style heisa. Bread and sauces are made daily, and we are open 24 hours at two branches: Al Qaswa and Al Ared.\nOur most ordered:'),
        cards: popular, buttons: [B.menu, B.order], chips: X(['المنيو والأسعار', 'وش تنصحني؟', 'وين فروعكم؟'], ['Menu & prices', 'Recommend something', 'Where are you?']) });
    if (has(q, ['زين', 'حلو', 'لذيذ', 'طيب', 'يستاهل', '=good', 'tasty', 'worth']) && has(q, ['اكل', 'اكلكم', 'الاكل', 'مطعمكم', 'برجركم', 'food', 'burgers', 'restaurant', 'place']))
      return R({ text: X('عملاؤنا يقيّمونا ' + s.rating + ' من 5 على Google ⭐ ومن تعليقاتهم: «من أفضل مطاعم البرجر في المدينة من ناحية السعر والطعم والجودة». جرّب الأكثر طلبًا واحكم بنفسك 😋', 'Our customers rate us ' + s.rating + ' / 5 on Google ⭐ One wrote: "one of the best burger places in Madinah for price, taste and quality". Try our best sellers and judge for yourself 😋'),
        cards: popular, buttons: [B.reviews, B.order] });

    /* ---------------- where and when ---------------- */
    var cities = ['جده', 'الرياض', 'مكه', 'الدمام', 'الخبر', 'تبوك', 'ينبع', 'الطايف', 'الطائف', 'ابها', 'القصيم', 'حايل', 'حائل', 'جازان', 'الاحساء', 'الكويت', 'دبي', 'jeddah', 'riyadh', 'mecca', 'makkah', 'dammam', 'khobar', 'tabuk', 'yanbu', 'taif', 'abha', 'dubai'];
    if (has(q, cities) && !has(q, ['مدينه', 'madinah', 'medina']))
      return R({ text: X('فروع نهم حاليًا في المدينة المنورة فقط (القصواء والعريض) 📍\nوإذا تحب نهم يكون في مدينتك، تقدر تقدم على الامتياز التجاري 🤝', 'Nahem is currently only in Madinah (Al Qaswa and Al Ared) 📍\nIf you would like Nahem in your city, you can apply for a franchise 🤝'), buttons: [{ label: X('طلب الفرنشايز', 'Franchise'), href: s.franchiseUrl }] });
    if (has(q, ['اطلب', 'طلب', 'order', 'buy']) && has(q, ['الموقع', 'من الموقع', 'موقعكم الالكتروني', 'اونلاين', 'النت', 'website', 'online', 'site', 'by phone', 'بالجوال', 'اتصل']))
      return orderHow();
    if (breakfast && has(q, ['متي', 'لين', 'وقت', 'ساعات', 'طول اليوم', 'متوفر', 'يوقف', 'hours', 'available', 'until', 'all day', 'time', 'when']))
      return R({ text: FACTS.breakfastHours ? X(FACTS.breakfastHours.ar, FACTS.breakfastHours.en) : X('الفطور جزء من منيو نهم، ونهم مفتوح 24 ساعة ☀️ ما عندي وقت مؤكد لتوقف أصناف الفطور، فإذا تبغاه في وقت متأخر تأكد من منصة الطلب أو راسلنا على واتساب ' + waNum + '.', 'Breakfast is part of the Nahem menu, and Nahem is open 24 hours ☀️ I don\'t have a confirmed cut-off time for breakfast items, so for a late breakfast check the ordering platform or message us on WhatsApp ' + waNum + '.'),
        cards: byNames(d, ['وجبة الإفطار', 'ساندوتش مليس', 'كرك']), buttons: [B.order, B.wa] });
    var askBranch = has(q, ['فرع', 'فروع', 'فروعكم', 'وين', 'موقع', 'موقعكم', 'مكان', 'مكانكم', 'لوكيشن', 'خريطه', 'عنوان', 'اقرب', 'اوصل لكم', 'كيف اوصل', 'الحرم', '=اين', 'تقع', 'branch', 'branches', 'where', 'location', 'locations', 'address', 'map', 'nearest', 'directions', 'get there', 'haram']);
    var askHours = has(q, HOURWORDS.concat(['رمضان', 'العيد', 'ramadan', 'eid'])) || (!askBranch && has(q, ['متي', 'الحين', 'الان', '24', 'الجمعه', 'when', 'now', 'friday', 'tonight', '3am']));
    if (askHours && !found.exact) return hours(d, branchB, q, X, B, R);
    if (branchB || askBranch) return branches(d, branchB, q, X, B, R);

    /* ---------------- budget, box sizes ---------------- */
    if (money) return budgetPlan(d, money, X, N, B, R);
    if (has(q, ['يكفي', 'تكفي', 'يشبع كم', 'كم شخص', 'كم نفر', 'feeds', 'feed', 'serves', 'how many people', 'enough for']))
      return R({ text: X('• بوكس البرجر (79 ريال) يكفي نحو 4 أشخاص\n• بوكس الخفايف (49 ريال) يكفي نحو 5 أشخاص\nقل لي عددكم وأحسب لك الطلب كامل 👌', '• Burger Box (79 SAR) feeds about 4\n• Snack Box (49 SAR) feeds about 5\nTell me how many you are and I will work out the order 👌'),
        cards: byNames(d, ['بوكس البرجر', 'بوكس الخفايف']), chips: X(['احنا 8', 'احنا 15', 'احنا 30'], ['We are 8', 'We are 15', 'We are 30']), topic: 'group' });

    /* ---------------- best sellers and superlatives ---------------- */
    var superWords = ['احلى', 'الذ', 'افضل', 'احسن', 'اطعم', 'best', 'tastiest', 'most delicious', 'top'];
    var cat = findCat(q);
    if (cat && has(q, superWords) && !found.exact) {
      var inCat = d.items.filter(function (i) { return i.cat === cat; });
      inCat.sort(function (a, b) { return (/popular|filling/.test(b.tags) ? 1 : 0) - (/popular|filling/.test(a.tags) ? 1 : 0); });
      CTX.last = inCat.slice(0, 1);
      return R({ text: X('أنصحك بـ ' + N(inCat[0]) + ' 👌 من أكثر الأصناف طلبًا في ' + catName(cat) + '. وهذي بقية الخيارات:', 'Go for the ' + N(inCat[0]) + ' 👌 one of the most ordered in ' + catName(cat) + '. The other options:'), cards: inCat.slice(0, 5), buttons: [B.order] });
    }
    if (has(q, ['الاكثر طلبا', 'الاكثر مبيعا', 'اكثر شي يطلب', 'الاشهر', 'اشهر', 'مشهور', 'المشهور', 'ترند', 'best seller', 'bestseller', 'best sellers', 'most popular', 'popular', 'most ordered', 'top seller', 'famous', 'signature']))
      return R({ text: X('الأكثر طلبًا في نهم 🏆', "Nahem's most ordered 🏆"), cards: popular, buttons: [B.order], chips: X(['وش تنصحني؟', 'لشخص واحد', 'لمجموعة'], ['Recommend something', 'For one person', 'For a group']) });
    if (has(q, ['وجبه كامله', 'وجبات كامله', 'full meal', 'complete meal', 'combo meal', 'cheapest full meal', 'وجبة كاملة بأقل سعر']))
      return R({ text: X('وجبات كاملة جاهزة 👌', 'Complete meals 👌'), cards: byNames(d, ['وجبة الإفطار', 'وجبة نهم', 'كومبو نهم']), buttons: [B.order] });
    if (has(q, ['ارخص', 'الارخص', 'رخيص', 'اقل سعر', 'على قد', 'اقتصادي', 'cheapest', 'cheap', 'cheaper', 'lowest price', 'budget friendly', 'affordable']))
      return R({ text: X('أوفر الخيارات في نهم 💸', 'The best-priced picks at Nahem 💸'), cards: d.items.filter(function (i) { return ['drinks', 'sauces'].indexOf(i.cat) === -1; }).sort(function (a, b) { return a.price - b.price; }).slice(0, 6),
        buttons: [B.order], chips: X(['وجبة كاملة بأقل سعر', 'عندي 20 ريال'], ['Cheapest full meal', 'I have 20 SAR']) });
    if (has(q, ['اغلي', 'الاغلي', 'most expensive', 'priciest']))
      return R({ text: X('أعلى الأصناف سعرًا:', 'Our highest-priced items:'), cards: d.items.slice().sort(function (a, b) { return b.price - a.price; }).slice(0, 4), buttons: [B.order] });
    if (has(q, ['اشبع', 'يشبع', 'جوعان مره', 'ميت جوع', 'ميته جوع', 'جوع شديد', 'اكبر وجبه', 'filling', 'very hungry', 'starving', 'biggest', 'big meal']))
      return R({ text: X('للجوع الحقيقي 😤 هذي أكثر شي يشبع:', 'For a serious appetite 😤 the most filling picks:'), cards: tagged(d, 'filling').sort(function (a, b) { return b.price - a.price; }), buttons: [B.order], chips: X(['لمجموعة', 'شي دجاج'], ['For a group', 'Chicken']) });
    if (has(q, ['افضل قيمه', 'قيمه مقابل', 'best value', 'value for money', 'worth it']))
      return R({ text: X('أفضل قيمة مقابل السعر 👌', 'Best value for money 👌'), cards: tagged(d, 'value'), buttons: [B.order] });
    if (has(q, ['سهره', 'للسهره', 'اخر الليل', 'بالليل', 'late night food', 'midnight snack', 'night snack']))
      return recommend(d, X, B, R, popular, null, 'night');

    /* ---------------- not on the menu (before items, so "قهوة لاتيه" is not Saudi coffee) ---------------- */
    var notOnMenu = [
      [['بيتزا', 'pizza'], ['دبل سماش لحم', 'كومبو نهم'], 'بيتزا', 'pizza'],
      [['شاورما', 'shawarma'], ['راب دونر تركي', 'راب تويستر'], 'شاورما', 'shawarma'],
      [['عصير', 'عصيرات', 'juice'], ['مشروب غازي', 'ماء'], 'عصيرات', 'juice'],
      [['ايسكريم', 'ايس كريم', 'ice cream', 'ميلك شيك', 'milkshake', 'كيك', '=cake'], ['حيسة نهم', 'كوكيز نهم', 'عرض الحلى'], 'هذا الصنف من الحلى', 'that dessert'],
      [['ناجتس', 'nuggets', 'اجنحه', 'جوانح', 'wings'], ['وجبة استربس', 'تشكن فرايز', 'ديناميت دجاج'], 'هذا الصنف', 'that item'],
      [['لاتيه', 'كابتشينو', 'اسبريسو', 'امريكانو', 'قهوه مختصه', 'latte', 'cappuccino', 'espresso', 'americano'], ['قهوة سعودية', 'كرك', 'شاي'], 'هذا النوع من القهوة', 'that coffee'],
      [['سمك', 'روبيان', '=fish', 'shrimp', 'seafood'], ['ساندوتش تونة'], 'المأكولات البحرية', 'seafood'],
      [['=رز', 'كبسه', 'مندي', 'مكرونه', 'باستا', '=rice', 'pasta', 'kabsa', 'mandi'], ['وجبة نهم', 'سلطة سيزر'], 'هذا الطبق', 'that dish'],
      [['هوت دوق', 'هوت دوج', 'hot dog', 'hotdog', 'ستيك', '=steak'], ['دبل سماش لحم', 'راب دونر تركي'], 'هذا الصنف', 'that item'],
      [['فيجن', '=vegan'], ['ساندوتش فلافل', 'سلطة ملفوف', 'بطاطس'], 'خيار نباتي صرف مؤكد', 'a confirmed vegan option']
    ];
    for (var k = 0; k < notOnMenu.length; k++) {
      if (has(q, notOnMenu[k][0]))
        return R({ text: X('ما عندنا ' + notOnMenu[k][2] + ' في منيو نهم حاليًا 🙏 لكن أظن بيعجبك:', "We don't have " + notOnMenu[k][3] + ' on the Nahem menu right now 🙏 but you might like:'), cards: byNames(d, notOnMenu[k][1]), buttons: [B.order, B.menu] });
    }

    /* ---------------- items, comparisons, taste filters, categories ---------------- */
    var followUp = CTX.last.length && !found.exact && /(^|\s)(سعره|سعرها|بكم هو|بكم هي|وش فيه|وش فيها|ايش فيه|مكوناته|مكوناتها|وش يناسبه|ايش يناسبه|how much is it|whats in it|what s in it|what goes with it|price of it|compare them|قارن بينهم)($|\s)/.test(q);
    var items = followUp ? CTX.last : found;
    var catItems = cat ? d.items.filter(function (i) { return i.cat === cat; }) : [];
    var filters = tasteFilters(q, X);
    if (cat === 'sides') filters = filters.filter(function (fl) { return fl.id !== 'sweet'; });
    var compareWords = has(q, ['فرق', 'الفرق', 'ولا', '=او', 'افضل', 'احسن', 'مقارنه', 'قارن', 'vs', 'versus', '=or', 'better', 'difference', 'compare']);
    if (compareWords && items.length && (items.exactCount >= 2 || items.second || (items.near && items.near.length && !filters.length) || (followUp && items.length >= 2))) {
      var a = items[0], b = items.exactCount >= 2 || followUp ? items[1] : (items.second || items.near[0]);
      CTX.last = [a, b];
      var cheap = a.price <= b.price ? a : b, dear = cheap === a ? b : a;
      return R({ text: X('مقارنة سريعة 👇\n' + (cheap.price === dear.price ? 'نفس السعر (' + cheap.price + ' ريال).' : N(cheap) + ' أرخص بـ ' + fmt(dear.price - cheap.price) + ' ريال.') + '\nإذا جوعك كبير خذ ' + N(dear) + '، وإذا تبي شي أخف أو أوفر خذ ' + N(cheap) + '.', 'Quick comparison 👇\n' + (cheap.price === dear.price ? 'Same price (' + cheap.price + ' SAR).' : N(cheap) + ' is ' + fmt(dear.price - cheap.price) + ' SAR cheaper.') + '\nVery hungry? Go for ' + N(dear) + '. Lighter or cheaper? ' + N(cheap) + '.'), cards: [a, b], buttons: [B.order] });
    }
    var meats = filters.filter(function (fl) { return fl.id === 'chicken' || fl.id === 'beef'; });
    if (items.length && (items.exact || followUp) && !(filters.length && !items.exact)) {
      CTX.last = items.slice(0, 3);
      var ask = has(q, ['مكونات', 'وش فيه', 'ايش فيه', 'وش هو', 'وش هي', 'وش يعني', 'ايش هو', 'ايش يعني', 'وصف', 'what is', 'whats in', 'what s in', 'ingredients', 'what does', 'describe']);
      if (/(يناسبه|goes with)/.test(q) && items[0]) return R({ text: itemDetail(items[0], d, X, N, true), cards: byNames(d, ['بطاطس', 'مشروب غازي', 'الصوصات']), buttons: [B.order] });
      if (items.length === 1 || items.exactCount === 1)
        return R({ text: itemDetail(items[0], d, X, N, ask || has(q, ['سعر', '=كم', 'بكم', 'how much', 'price', 'cost']), ask), cards: [items[0]], buttons: [B.order, B.menu], chips: pairChips(items[0], X) });
      return R({ text: X('هذي الأصناف اللي تطابق سؤالك:', 'These items match your question:'), cards: items, buttons: [B.order], chips: X(['قارن بينهم', 'وش تنصحني؟'], ['Compare them', 'What do you recommend?']) });
    }
    if (filters.length) {
      /* chicken OR beef when both are named ("البرجر لحم ولا دجاج"); every other filter narrows */
      var test = function (i) {
        return (meats.length ? meats.some(function (fl) { return fl.test(i); }) : true) && filters.every(function (fl) { return meats.indexOf(fl) !== -1 || fl.test(i); });
      };
      var pool = (catItems.length ? catItems : d.items).filter(test);
      if (!pool.length) pool = d.items.filter(test);
      if (pool.length) {
        CTX.last = pool.slice(0, 3);
        var notes = filters.filter(function (fl) { return fl.note; }).map(function (fl) { return fl.note; });
        var title = meats.length === 2 ? X('عندنا الاثنين 👇 لحم ودجاج:', 'We have both 👇 beef and chicken:') : filters.map(function (fl) { return fl.title; }).join(' · ');
        return R({ text: title + (notes.length ? '\n' + notes.join('\n') : ''), cards: pool.slice(0, 8), buttons: [B.order], chips: X(['الأكثر طلبًا', 'أرخص شي', 'لمجموعة'], ['Best sellers', 'Cheapest', 'For a group']) });
      }
      return R({ text: X('ما لقيت صنف يجمع كل اللي طلبته، لكن هذي أقرب الخيارات:', "I couldn't find one item with all of that, but these are the closest:"), cards: d.items.filter(function (i) { return filters[0].test(i); }).slice(0, 6), buttons: [B.order] });
    }
    if (catItems.length) {
      CTX.last = catItems.slice(0, 3);
      return R({ text: CATS[cat].icon + ' ' + catName(cat) + X(' — ' + catItems.length + ' أصناف:', ' — ' + catItems.length + ' items:'), cards: catItems, buttons: [B.order, B.menu], chips: X(['الأكثر طلبًا', 'أرخص شي', 'المنيو كامل'], ['Best sellers', 'Cheapest', 'Full menu']) });
    }

    /* ---------------- recommendations ---------------- */
    if (has(q, ['انصح', 'تنصح', 'تنصحني', 'نصيحه', 'اقترح', 'اقتراح', 'تقترح', 'وش اطلب', 'ايش اطلب', 'وش اخذ', 'ايش اخذ', 'وش اكل', 'ايش اكل', 'محتار', 'وش الزين', 'ايش الزين', 'وش الحلو', 'ايش الحلو', 'الافضل', 'افضل شي', 'احسن شي', 'الذ شي', 'احلى شي', 'اطعم شي', 'اول مره', 'جوعان', 'جوعانه', 'جيعان', 'لشخص واحد', 'افضل طبق', 'افضل وجبه', 'افضل صنف', 'ماذا تنصح', 'بماذا تنصح', 'ما تنصح', 'ماذا اطلب', 'ماذا اكل', 'recommend', 'recommendation', 'suggest', 'suggestion', 'what should', 'what to get', 'what to eat', 'best', 'first time', 'hungry', 'good here', 'tasty', 'delicious', 'for one person', 'tastiest']))
      return recommend(d, X, B, R, popular);
    if (items.length) {
      CTX.last = items.slice(0, 3);
      if (items.length === 1) return R({ text: itemDetail(items[0], d, X, N), cards: [items[0]], buttons: [B.order, B.menu], chips: pairChips(items[0], X) });
      return R({ text: X('تقصد واحد من هذي؟', 'Did you mean one of these?'), cards: items, buttons: [B.order] });
    }

    /* ---------------- ordering, contact, menu, reviews, story ---------------- */
    function orderHow() {
      return R({ text: X('تطلب من نهم بأكثر من طريقة 🛍️\n1. هنا في المحادثة: اضغط + على أي صنف، اختر الفرع، وأرسل الطلب لواتساب بضغطة\n2. منصة الطلب: اختر فرعك (القصواء أو العريض)، أضف أصنافك وادفع، واستلم من الفرع\n3. تطبيق نهم: نفس الخطوات + خصم 10% بكود ' + s.appCode + '\n4. واتساب: ' + waNum + '\nوللطلبات الكبيرة استخدم حاسبة المناسبات.', 'You can order from Nahem in a few ways 🛍️\n1. Right here: tap + on any item, pick a branch and send the order to WhatsApp in one tap\n2. Ordering platform: pick your branch (Al Qaswa or Al Ared), add items, pay, and pick up\n3. Nahem app: same steps + 10% off with code ' + s.appCode + '\n4. WhatsApp: ' + waNum + '\nFor big orders, use the events calculator.'),
        buttons: [B.order, B.wa, B.ios], chips: X(['وش تنصحني؟', 'الأكثر طلبًا', 'المنيو والأسعار'], ['Recommend something', 'Best sellers', 'Menu & prices']) });
    }
    if (has(q, ['اطلب', 'طلب', 'اطلبه', 'الطلب', 'نطلب', 'استلام', 'order', 'ordering', 'buy', 'pickup', 'pick up', 'takeaway', 'take away']))
      return orderHow();
    if (has(q, ['رقم', 'رقمكم', 'جوال', 'هاتف', 'تلفون', 'تواصل', 'اتصال', 'اتصل', 'واتساب', 'واتس', 'ايميل', 'بريد', 'انستقرام', 'انستا', 'سناب', 'تيك توك', 'تويتر', 'فيسبوك', 'حساباتكم', 'phone', 'number', 'contact', 'call', 'whatsapp', 'email', 'instagram', 'insta', 'snapchat', 'tiktok', 'twitter', 'facebook', 'social']))
      return R({ text: X('تواصل مع نهم 📞\n• واتساب الطلبات والاستفسارات: ' + waNum + '\n• الشكاوى والدعم: ' + supNum + '\n• انستقرام وتيك توك وسناب: nahem_24@\n• إكس: Nahem_24@ · فيسبوك: Nahem24\n• للتوظيف: ' + s.careersEmail, 'Contact Nahem 📞\n• WhatsApp orders and questions: ' + waNum + '\n• Complaints and support: ' + supNum + '\n• Instagram, TikTok, Snapchat: @nahem_24\n• X: @Nahem_24 · Facebook: Nahem24\n• Jobs: ' + s.careersEmail),
        buttons: [Object.assign({}, B.wa, { primary: true }), { label: 'Instagram', href: s.instagram }, { label: 'TikTok', href: s.tiktok }, { label: 'Snapchat', href: s.snapchat }] });
    if (has(q, ['منيو', 'المنيو', 'قائمه', 'اصناف', 'الاصناف', 'اكل', 'اكلات', 'وش عندكم', 'ايش عندكم', 'اسعار', 'الاسعار', 'سعر', '=كم', 'بكم', 'menu', 'food', 'price', 'prices', 'eat', 'what do you have', 'cost', 'how much']))
      return menu(d, X, B, R, catName);
    if (has(q, ['تقييم', 'تقييمات', 'تقييمكم', 'ريفيو', 'جوجل', 'قوقل', 'rating', 'ratings', 'review', 'reviews', 'google', 'stars']))
      return R({ text: X('تقييم نهم على Google: ' + s.rating + ' من 5 ⭐\nمن تعليقات عملائنا: «من أفضل مطاعم البرجر في المدينة من ناحية السعر والطعم والجودة».\nويسعدنا تقييمك بعد ما تجربنا 🧡', 'Nahem is rated ' + s.rating + ' / 5 ⭐ on Google.\nOne customer wrote: "one of the best burger places in Madinah for price, taste and quality".\nWe would love your review after your visit 🧡'), buttons: [B.reviews] });
    if (has(q, ['ليش نهم', 'وش يميز', 'يميزكم', 'مميز', 'فريش', 'طازج', 'طازه', 'جوده', 'قصتكم', 'من انتم', 'why nahem', 'fresh', 'quality', 'about you', 'your story', 'special about']))
      return R({ text: X('نهم براند مديني بطعم واضح وسعر يستاهل 🧡\n• خبز بريوش يومي من الفرن\n• صوصات تتحضّر يوميًا\n• لحوم ودجاج طازج\n• مفتوحين 24 ساعة: فطور، غداء، عشاء… أو جوع مفاجئ', 'Nahem is a Madinah brand with bold taste at a fair price 🧡\n• Brioche bread baked daily\n• Sauces made fresh every day\n• Fresh meat and chicken\n• Open 24 hours: breakfast, lunch, dinner… or a sudden craving'), buttons: [B.menu, B.order] });

    /* ---------------- fallback ---------------- */
    return R({ text: X('ما فهمت سؤالك تمامًا 🙏 جرّب تكتبه بطريقة ثانية، أو اختر من هنا. وتقدر تسأل فريقنا على واتساب:', "I didn't quite get that 🙏 Try asking another way, or pick one of these. You can also ask our team on WhatsApp:"),
      chips: X(['وش تقدر تسوي؟', 'وش تنصحني؟', 'المنيو والأسعار', 'وين فروعكم؟', 'العروض', 'كلّم موظف'], ['What can you do?', 'What do you recommend?', 'Menu & prices', 'Where are you?', 'Offers', 'Talk to a person']), buttons: [B.wa], fallback: true });
  }

  function activeDaypart(d, lang) {
    var h = riyadhHour();
    for (var i = 0; i < d.dayparts.length; i++) {
      var p = d.dayparts[i], from = Number(p.from), to = Number(p.to);
      var on = from === to || (from < to ? h >= from && h < to : h >= from || h < to);
      if (on) return plain(lang === 'en' ? (p.titleEn || p.titleAr || '') : (p.titleAr || '')) + (p.price ? ' (' + p.price + (lang === 'en' ? ' SAR)' : ' ريال)') : '');
    }
    return '';
  }

  function tasteFilters(q, X) {
    var out = [];
    var t = function (tag) { return function (i) { return (' ' + (i.tags || '') + ' ').indexOf(' ' + tag + ' ') !== -1; }; };
    var hotDrink = has(q, ['ساخن', 'ساخنه', 'دافي', 'hot drink', 'hot drinks', 'warm']) || (has(q, ['مشروب', 'مشروبات', 'drink']) && has(q, ['حار', 'حاره']));
    if (hotDrink) out.push({ id: 'hot', title: X('☕ مشروبات ساخنة', '☕ Hot drinks'), test: t('hot') });
    else if (has(q, ['حار', 'حاره', 'حراق', 'سبايسي', 'هلابينو', 'spicy', 'jalapeno', 'hot sauce', 'chili']))
      out.push({ id: 'spicy', title: X('🌶️ للي يحب الحار', '🌶️ For spice lovers'), test: function (i) { return /هلابينو|حراق|jalape|spicy/i.test(i.dAr + i.dEn); }, note: X('وتقدر تضيف صوص حراق (2 ريال) لأي طلب.', 'You can add spicy sauce (2 SAR) to any order.') });
    if (has(q, ['مشروب بارد', 'مشروبات بارده', 'شي بارد', 'cold drink', 'cold drinks', 'something cold'])) out.push({ id: 'cold', title: X('🧊 مشروبات باردة', '🧊 Cold drinks'), test: t('cold') });
    if (has(q, ['دجاج', 'فراخ', 'تشكن', 'chicken'])) out.push({ id: 'chicken', title: X('🍗 خيارات الدجاج', '🍗 Chicken options'), test: t('chicken') });
    if (has(q, ['لحم', 'لحوم', 'بيف', 'beef', 'meat'])) out.push({ id: 'beef', title: X('🥩 خيارات اللحم', '🥩 Beef options'), test: t('beef') });
    if (has(q, ['نباتي', 'نباتيه', 'بدون لحم', 'بدون دجاج', 'vegetarian', 'veggie', 'no meat', 'meatless']))
      out.push({ id: 'veg', title: X('🥗 خيارات بدون لحم أو دجاج', '🥗 Options without meat or chicken'), test: t('veg'), note: X('حسب مكونات المنيو. للتأكد من طريقة التحضير راسلنا على واتساب.', 'Based on menu ingredients. To confirm how they are prepared, message us on WhatsApp.') });
    if (has(q, ['خفيف', 'خفيفه', 'دايت', 'صحي', 'رجيم', 'سناك', 'سريع', 'على السريع', 'light', 'healthy', 'diet', 'snack', 'quick']))
      out.push({ id: 'light', title: X('🥗 خيارات أخف', '🥗 Lighter options'), test: t('light') });
    if (has(q, ['اطفال', 'طفل', 'عيال', 'بزران', 'صغار', 'ولدي', 'بنتي', 'kids', 'kid', 'child', 'children']))
      out.push({ id: 'kids', title: X('👧 يحبها الأطفال', '👧 Kids love these'), test: t('kids') });
    if (has(q, ['حلى', 'حلا', 'حلو', 'حلويات', 'تحليه', 'dessert', 'desserts', 'sweet', 'sweets']))
      out.push({ id: 'sweet', title: X('🍪 الحلى', '🍪 Desserts'), test: t('sweet') });
    if (has(q, ['مقرمش', 'كرانشي', 'crispy', 'crunchy'])) out.push({ id: 'crispy', title: X('😋 مقرمش', '😋 Crispy'), test: t('crispy') });
    return out;
  }

  /* the item card already shows name, description and price; the text adds what goes with it */
  function itemDetail(it, d, X, N, withName, withDesc) {
    var lines = withName ? [N(it) + ' — ' + it.price + ' ' + X('ريال', 'SAR')] : [];
    if (withDesc) lines.push(X(it.dAr, it.dEn));
    var tags = ' ' + (it.tags || '') + ' ';
    if (it.cat === 'boxes') lines.push(X('مناسب للمشاركة 👥 قل لي عددكم وأحسب لك كم بوكس تحتاج.', 'Made for sharing 👥 tell me how many you are and I will work out how many boxes you need.'));
    else if (['burger', 'special'].indexOf(it.cat) !== -1 && tags.indexOf(' drink ') === -1) {
      var drink = byNames(d, ['مشروب غازي'])[0], fries = byNames(d, ['بطاطس'])[0];
      var add = tags.indexOf(' fries ') === -1 && fries ? fries.price : 0;
      if (drink) lines.push(X('كمّلها بمشروب' + (add ? ' وبطاطس' : '') + ' وتصير ' + (it.price + drink.price + add) + ' ريال 👌', 'Add a drink' + (add ? ' and fries' : '') + ' for ' + (it.price + drink.price + add) + ' SAR total 👌'));
    } else if (it.cat === 'breakfast' && tags.indexOf(' drink ') === -1) lines.push(X('يمشي معه كرك أو شاي بـ 4 ريال ☕', 'Goes great with karak or tea, 4 SAR ☕'));
    if (/هلابينو|jalape/i.test(it.dAr + it.dEn)) lines.push(X('🌶️ فيه هلابينو، يعني فيه حرارة.', '🌶️ Has jalapeño, so it is spicy.'));
    if (it.ar === 'حيسة نهم') lines.push(X('حلا مديني أصيل، وتقدر تاخذه مع مشروب في عرض الحلى بـ 12 ريال 🍮', 'A Madinah classic; get it with a drink in the Dessert Offer for 12 SAR 🍮'));
    return lines.filter(Boolean).join('\n') || X(N(it) + ' بـ ' + it.price + ' ريال 👇', N(it) + ' is ' + it.price + ' SAR 👇');
  }
  function pairChips(it, X) {
    if (it.cat === 'boxes') return X(['احنا 8', 'احنا 12', 'كم يكفي؟'], ['We are 8', 'We are 12', 'How many does it feed?']);
    return X(['وش يناسبه؟', 'شي أرخص', 'الأكثر طلبًا'], ['What goes with it?', 'Something cheaper', 'Best sellers']);
  }

  function hours(d, b, q, X, B, R) {
    if (d.settings.open24h !== false) {
      var special = has(q, ['رمضان', 'العيد', 'ramadan', 'eid']);
      return R({ text: X((b ? 'فرع ' + b.ar : 'نهم') + ' مفتوح 24 ساعة، كل أيام الأسبوع ✅ يعني مفتوحين الحين!\nفطور، غداء، عشاء… وحتى الجوع المتأخر آخر الليل 🌙' + (special ? '\nفي رمضان والأعياد إذا تغيّرت الأوقات نعلن عنها في حساباتنا @nahem_24.' : ''), (b ? 'Our ' + b.en + ' branch is' : 'Nahem is') + ' open 24 hours, every day ✅ so we are open right now!\nBreakfast, lunch, dinner… and late-night cravings 🌙' + (special ? '\nIf hours change during Ramadan or Eid, we announce it on @nahem_24.' : '')),
        buttons: [B.order], chips: X(['وين فروعكم؟', 'وش تنصحني الحين؟'], ['Where are you?', 'What do you recommend now?']) });
    }
    var list = b ? [b] : d.branches;
    return R({ text: X('ساعات العمل:\n', 'Opening hours:\n') + list.map(function (x) { return '• ' + X(x.ar, x.en) + ': ' + (x.opens && x.closes ? x.opens + ' – ' + x.closes : '—'); }).join('\n'), buttons: [B.order] });
  }
  function branches(d, b, q, X, B, R) {
    var list = b ? [b] : d.branches;
    var open = d.settings.open24h !== false;
    var near = has(q, ['اقرب', 'قريب', 'nearest', 'closest', 'near me']);
    var text = (b ? '' : X('لنهم ' + (list.length === 2 ? 'فرعان' : list.length + ' فروع') + ' في المدينة المنورة 📍\n', 'Nahem has ' + list.length + ' branches in Madinah 📍\n')) + list.map(function (x) {
      var hrs = open ? X('مفتوح 24 ساعة', 'Open 24 hours') : (x.opens && x.closes ? x.opens + ' – ' + x.closes : '');
      return '• ' + X('فرع ' + x.ar, x.en) + '\n   ' + X(x.addrAr, x.addrEn) + (hrs ? '\n   ' + hrs : '');
    }).join('\n') + (near && !b ? X('\nما أقدر أعرف موقعك، افتح الخريطتين وشوف الأقرب لك 👇', "\nI can't see your location, so open both maps to see which is closer 👇") : '')
      + X('\nاستلام من الفرع + طلب عبر منصة نهم.', '\nPickup from the branch + ordering on the Nahem platform.');
    var buttons = list.filter(function (x) { return x.maps; }).map(function (x) { return { label: X('خريطة ' + x.ar, 'Map: ' + x.en), href: x.maps, primary: true }; });
    if (b && b.slug) buttons.push({ label: X('صفحة الفرع', 'Branch page'), href: site('/branches/' + b.slug + '/') });
    buttons.push(Object.assign({}, B.order, { primary: false }));
    return R({ text: text, buttons: buttons, chips: X(['متى تفتحون؟', 'كيف أطلب؟', 'وش تنصحني؟'], ['Opening hours', 'How to order', 'Recommend something']) });
  }
  function menu(d, X, B, R, catName) {
    var lines = Object.keys(CATS).map(function (k) {
      var list = d.items.filter(function (i) { return i.cat === k; });
      if (!list.length) return null;
      var min = Math.min.apply(null, list.map(function (i) { return i.price; })), max = Math.max.apply(null, list.map(function (i) { return i.price; }));
      return CATS[k].icon + ' ' + catName(k) + ' · ' + list.length + X(' أصناف · ', ' items · ') + (min === max ? min : min + '–' + max) + X(' ريال', ' SAR');
    }).filter(Boolean);
    return R({ text: X('منيو نهم 📋 (' + d.items.length + ' صنف)\n', 'The Nahem menu 📋 (' + d.items.length + ' items)\n') + lines.join('\n') + X('\nاختر قسم وأعرض لك أصنافه بالأسعار 👇', '\nPick a section and I will show its items and prices 👇'),
      buttons: [B.menu, B.menuImg, B.order], chips: Object.keys(CATS).filter(function (k) { return k !== 'sauces'; }).map(function (k) { return catName(k); }) });
  }
  function recommend(d, X, B, R, popular, intro, force) {
    var h = force === 'night' ? 1 : riyadhHour(), names, period;
    if (h >= 4 && h < 11) { period = X('وقت الفطور ☀️', "It's breakfast time ☀️"); names = ['وجبة الإفطار', 'ساندوتش مليس', 'ساندوتش فاهيتا للفطور', 'كرك']; }
    else if (h >= 11 && h < 16) { period = X('وقت الغداء 🍽️', "It's lunchtime 🍽️"); names = ['وجبة نهم', 'دبل سماش لحم', 'برجر دجاج زنجر']; }
    else if (h >= 16 && h < 23) { period = X('وقت العشاء 🌆', "It's dinner time 🌆"); names = ['كومبو نهم', 'دبل سماش لحم', 'ديناميت دجاج']; }
    else { period = X('سهران وجيعان؟ 🌙', 'Up late and hungry? 🌙'); names = ['ديناميت دجاج', 'تشكن فرايز', 'ساندوتش بيج نهم']; }
    var picks = byNames(d, names);
    if (!picks.length) picks = popular;
    CTX.last = picks.slice(0, 3);
    return R({ text: (intro || period + X(' هذي اقتراحاتي لك:', ' here are my picks:')) + X('\nوإذا معك ناس، بوكس البرجر (79) يكفي 4 وهو الأكثر طلبًا 🏆', '\nWith friends? The Burger Box (79) feeds 4 and is our best seller 🏆'),
      cards: picks, buttons: [B.order], chips: X(['شي دجاج', 'شي لحم', 'شي حار', 'أرخص شي', 'لمجموعة'], ['Chicken', 'Beef', 'Spicy', 'Cheapest', 'For a group']) });
  }
  function wizardPlan(d, n, taste, X, N, B, R) {
    var chicken = byNames(d, ['برجر دجاج زنجر'])[0], beef = byNames(d, ['دبل سماش لحم'])[0], meal = byNames(d, ['وجبة نهم'])[0];
    var bb = byNames(d, ['بوكس البرجر'])[0], sb = byNames(d, ['بوكس الخفايف'])[0], drink = byNames(d, ['مشروب غازي'])[0];
    var main = taste === 'chicken' ? chicken : beef, parts = [];
    if (n === 1) parts = taste === 'mix' && meal ? [[1, meal]] : [[1, main]];
    else if (n <= 3) parts = taste === 'mix' ? [[Math.ceil(n / 2), beef], [Math.floor(n / 2), chicken]] : [[n, main]];
    else {
      parts = [[Math.floor(n / 4), bb]];
      var rem = n % 4;
      if (rem === 3) parts.push([1, sb]); else if (rem) parts.push([rem, taste === 'mix' ? beef : main]);
    }
    if (drink && !(n === 1 && taste === 'mix')) parts.push([n, drink]);
    parts = parts.filter(function (x) { return x[0] > 0 && x[1]; });
    var total = parts.reduce(function (t, x) { return t + x[0] * x[1].price; }, 0);
    var boxNote = n >= 4 ? X('\nتختارون نوع البرجر داخل البوكس' + (taste === 'chicken' ? ' (اطلبوه دجاج)' : taste === 'beef' ? ' (اطلبوه لحم)' : ' (نص دجاج ونص لحم)') + '.', '\nYou pick the burgers inside the box' + (taste === 'chicken' ? ' (ask for chicken)' : taste === 'beef' ? ' (ask for beef)' : ' (half chicken, half beef)') + '.') : '';
    CTX.wiz = 0;
    return R({ text: X('هذا طلبك المقترح 👇\n', 'Here is your suggested order 👇\n') + parts.map(function (x) { return '• ' + x[0] + ' × ' + N(x[1]) + ' (' + x[0] * x[1].price + ')'; }).join('\n') + X('\nالمجموع: ' + total + ' ريال', '\nTotal: ' + total + ' SAR') + boxNote,
      cards: parts.map(function (x) { return x[1]; }).slice(0, 3), actions: [{ label: X('أضف هذا الطلب', 'Add this order'), add: parts }], buttons: [B.order],
      chips: X(['غيّر العدد', 'وش تنصحني؟'], ['Change the number', 'Recommend something']) });
  }
  function groupPlan(d, n, money, X, N, SAR, B, R, breakfast) {
    var bb = byNames(d, ['بوكس البرجر'])[0], sb = byNames(d, ['بوكس الخفايف'])[0], meal = byNames(d, ['وجبة نهم'])[0], drink = byNames(d, ['مشروب غازي'])[0];
    var bm = byNames(d, ['وجبة الإفطار'])[0], malis = byNames(d, ['ساندوتش مليس'])[0], karak = byNames(d, ['كرك'])[0];
    if (breakfast && bm) {
      var bp = [{ name: X('وجبة فطور لكل شخص ☀️', 'A breakfast meal each ☀️'), parts: [[n, bm]] }];
      if (malis && karak) bp.push({ name: X('خفيف وسريع ☕', 'Light and quick ☕'), parts: [[n, malis], [n, karak]] });
      bp.forEach(function (p) { p.total = p.parts.reduce(function (t, x) { return t + x[0] * x[1].price; }, 0); });
      return R({ text: X('فطور ' + (n === 2 ? 'لشخصين' : 'لـ ' + n + ' أشخاص') + ' ☀️\n', 'Breakfast for ' + n + ' ☀️\n') + bp.map(function (p) {
          return '▸ ' + p.name + '\n' + p.parts.map(function (x) { return '   ' + x[0] + ' × ' + N(x[1]) + ' (' + x[1].price + ')'; }).join('\n') + '\n   ' + X('المجموع ', 'Total ') + p.total + ' ' + SAR;
        }).join('\n') + X('\nوجبة الإفطار فيها ساندوتشين من اختيارك + شاي.', '\nEach Breakfast Meal is two sandwiches of your choice + tea.'),
        cards: [bm], actions: bp.map(function (p) { return { label: X('أضف ', 'Add ') + p.name.replace(/\s*\S+$/, ''), add: p.parts }; }), buttons: [B.order], topic: 'group' });
    }
    if (!bb || !sb || !meal) return R({ text: X('قل لنا عددكم على واتساب ونرتب لك الطلب.', 'Tell us your group size on WhatsApp and we will arrange it.'), buttons: [B.wa] });
    var plans = [];
    if (n <= 3) {
      plans.push({ name: X('وجبات فردية 🍔', 'Individual meals 🍔'), parts: [[n, meal]] });
      plans.push({ name: X('بوكس للمشاركة 📦', 'One sharing box 📦'), parts: [[1, n === 3 ? sb : bb]] });
    } else {
      var b1 = Math.floor(n / 4), rem = n - b1 * 4, p1 = [[b1, bb]];
      if (rem === 3) p1.push([1, sb]); else if (rem > 0) p1.push([rem, meal]);
      plans.push({ name: X('خيار البرجر 🍔', 'Burger plan 🍔'), parts: p1 });
      plans.push({ name: X('الخيار الاقتصادي 💸', 'Budget plan 💸'), parts: [[Math.ceil(n / 5), sb]] });
      if (n >= 7) {
        var hb = Math.max(1, Math.round(n / 8)), left = Math.max(0, n - hb * 4);
        var mix = [[hb, bb]]; if (left) mix.push([Math.ceil(left / 5), sb]);
        plans.push({ name: X('خيار مشكّل 🤝', 'Mixed plan 🤝'), parts: mix });
      }
    }
    plans.forEach(function (p) { p.total = p.parts.reduce(function (t, x) { return t + x[0] * x[1].price; }, 0); });
    var seen = {};
    plans = plans.filter(function (p) { var k = p.parts.map(function (x) { return x[0] + x[1].ar; }).join(); if (seen[k]) return false; seen[k] = 1; return true; });
    var within = money ? plans.filter(function (p) { return p.total <= money; }) : plans;
    var shown = within.length ? within : plans.slice().sort(function (a, b) { return a.total - b.total; }).slice(0, 1);
    var body = shown.map(function (p) {
      return '▸ ' + p.name + '\n' + p.parts.map(function (x) { return '   ' + x[0] + ' × ' + N(x[1]) + ' (' + x[1].price + ')'; }).join('\n') + '\n   ' + X('المجموع ', 'Total ') + p.total + ' ' + SAR + X(' · نحو ', ' · about ') + fmt(p.total / n) + ' ' + SAR + X(' للشخص', ' per person');
    }).join('\n');
    var head = X((n === 2 ? 'لشخصين' : 'لـ ' + n + ' ' + (n <= 10 ? 'أشخاص' : 'شخص')) + ' 👥 هذي اقتراحاتي:', 'For ' + n + ' people 👥 here are my suggestions:');
    var budgetNote = money ? (within.length ? X('\nكلها ضمن ميزانيتك (' + money + ' ريال) 👌', '\nAll within your ' + money + ' SAR budget 👌') : X('\nميزانية ' + money + ' ريال أقل من أوفر خيار؛ هذا الأقرب لها.', '\n' + money + ' SAR is below the cheapest plan; this is the closest.')) : '';
    var drinks = drink ? X('\n🥤 مشروبات للجميع: ' + n + ' × ' + drink.price + ' = ' + n * drink.price + ' ريال', '\n🥤 Drinks for everyone: ' + n + ' × ' + drink.price + ' = ' + n * drink.price + ' SAR') : '';
    var actions = shown.slice(0, 3).map(function (p) { return { label: X('أضف ', 'Add ') + p.name.replace(/\s*\S+$/, ''), add: p.parts }; });
    return R({ actions: actions, text: head + '\n' + body + budgetNote + drinks + X('\nالتقدير حسب شهية الضيوف، والسعر النهائي نأكده لك على واتساب.', '\nEstimates depend on appetite; we confirm the final price on WhatsApp.'),
      buttons: [B.events, B.wa], chips: X(['احنا ' + (n + 5), 'وش في بوكس البرجر؟', 'كيف أطلب؟'], ['We are ' + (n + 5), "What's in the Burger Box?", 'How to order']), topic: 'group' });
  }
  function budgetPlan(d, money, X, N, B, R) {
    var drink = byNames(d, ['مشروب غازي'])[0], fries = byNames(d, ['بطاطس'])[0], sweet = byNames(d, ['حيسة نهم'])[0];
    if (money < 4) return R({ text: X('بـ ' + money + ' ريال تقدر تاخذ ماء (1) أو مشروب غازي (3) 🥤', 'With ' + money + ' SAR you can get water (1) or a soft drink (3) 🥤'), buttons: [B.order] });
    var pool = d.items.filter(function (i) { return ['burger', 'special', 'breakfast'].indexOf(i.cat) !== -1; }).sort(function (a, b) { return b.price - a.price; });
    var main = pool.filter(function (i) { return i.price <= money - (drink ? drink.price : 0); })[0] || pool.filter(function (i) { return i.price <= money; })[0];
    if (!main) return R({ text: X('أقرب شي لميزانيتك:', 'The closest to your budget:'), cards: pool.slice(-3), buttons: [B.order] });
    var basket = [main], left = money - main.price, tags = ' ' + (main.tags || '') + ' ';
    if (drink && tags.indexOf(' drink ') === -1 && left >= drink.price) { basket.push(drink); left -= drink.price; }
    if (fries && tags.indexOf(' fries ') === -1 && main.cat !== 'breakfast' && left >= fries.price) { basket.push(fries); left -= fries.price; }
    if (sweet && left >= sweet.price) { basket.push(sweet); left -= sweet.price; }
    var total = money - left;
    var box = money >= 49 ? X('\nوإذا معك أحد: بوكس الخفايف (49) يكفي 5 أشخاص 👥', '\nSharing? The Snack Box (49) feeds 5 👥') : '';
    return R({ text: X('بميزانية ' + money + ' ريال، هذي أفضل وجبة لك 👌\n', 'With ' + money + ' SAR, here is your best meal 👌\n') + basket.map(function (i) { return '• ' + N(i) + ' — ' + i.price; }).join('\n') + X('\nالمجموع: ' + total + ' ريال (يتبقى ' + left + ')', '\nTotal: ' + total + ' SAR (' + left + ' left)') + box,
      actions: [{ label: X('أضف الوجبة لطلبي', 'Add this meal to my order'), add: basket.map(function (i) { return [1, i]; }) }],
      buttons: [B.order], chips: X(['عندي ' + (money + 10) + ' ريال', 'احنا 4'], ['I have ' + (money + 10) + ' SAR', 'We are 4']) });
  }

  /* ================================================================
     UI
     ================================================================ */
  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.wrap{--o:#ff6b1a;--o2:#e4560a;--os:#fff1e8;--ink:#1f1a16;--mut:#75695f;--bg:#ffffff;--bg2:#faf6f2;--bub:#f4efea;--card:#ffffff;--line:#ece3da;--ok:#16a34a;--wa:#1faa59;--shadow:0 24px 60px rgba(31,26,22,.22);font-family:"IBM Plex Sans Arabic","Tajawal","Segoe UI",Tahoma,system-ui,sans-serif;font-size:15px;line-height:1.65;color:var(--ink);-webkit-font-smoothing:antialiased}',
    '@media (prefers-color-scheme:dark){.wrap{--os:#3a2416;--ink:#f4ede6;--mut:#b8aca1;--bg:#191512;--bg2:#211c18;--bub:#2a231e;--card:#231d19;--line:#382f28;--shadow:0 24px 60px rgba(0,0,0,.5)}}',
    /* launcher + teaser */
    '.fab{position:fixed;bottom:calc(var(--lift,20px) + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:7px 20px 7px 7px;background:var(--o);color:#fff;font-family:inherit;font-weight:700;font-size:15px;line-height:1;cursor:pointer;box-shadow:0 10px 30px rgba(255,107,26,.45);transition:transform .15s,background .15s}',
    '.rtl .fab{padding:7px 7px 7px 20px}',
    '.fab:hover{background:var(--o2);transform:translateY(-2px)}',
    '.fab .av{width:38px;height:38px}',
    '.fab .dot{position:absolute;top:5px;width:11px;height:11px;border-radius:50%;background:var(--ok);border:2px solid var(--o)}',
    '.ltr .fab .dot{left:36px}.rtl .fab .dot{right:36px}',
    '.fab .cnt{position:absolute;top:-6px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#fff;color:var(--o2);font-size:12px;font-weight:800;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.2)}',
    '.ltr .fab .cnt{right:-4px}.rtl .fab .cnt{left:-4px}',
    '.fab .cnt[hidden]{display:none}',
    '.rtl .fab,.rtl .panel,.rtl .tease{left:calc(16px + env(safe-area-inset-left,0px))}',
    '.ltr .fab,.ltr .panel,.ltr .tease{right:calc(16px + env(safe-area-inset-right,0px))}',
    '.pin-right .fab,.pin-right .panel,.pin-right .tease{left:auto;right:calc(16px + env(safe-area-inset-right,0px))}',
    '.pin-left .fab,.pin-left .panel,.pin-left .tease{right:auto;left:calc(16px + env(safe-area-inset-left,0px))}',
    '.tease{position:fixed;bottom:calc(var(--lift,20px) + 64px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:250px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:12px 32px 12px 14px;box-shadow:var(--shadow);font-size:14px;line-height:1.5;cursor:pointer}',
    '.rtl .tease{padding:12px 14px 12px 32px}',
    '.tease[hidden]{display:none}',
    '.tease b{color:var(--o)}',
    '.tease .tx{position:absolute;top:6px;border:0;background:transparent;color:var(--mut);font-size:17px;line-height:1;cursor:pointer;padding:2px 4px}',
    '.ltr .tease .tx{right:6px}.rtl .tease .tx{left:6px}',
    /* panel */
    '.panel{position:fixed;bottom:calc(var(--lift,20px) + 64px + env(safe-area-inset-bottom,0px));z-index:2147483001;width:min(410px,calc(100vw - 32px));height:min(680px,calc(100vh - 110px));background:var(--bg);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);display:flex;flex-direction:column;overflow:hidden}',
    '.panel[hidden]{display:none}',
    '@media (max-width:480px){.panel{left:0!important;right:0!important;bottom:0;width:100%;height:100%;max-height:100%;border-radius:0;border:0;padding-top:env(safe-area-inset-top,0px)}}',
    '.head{display:flex;align-items:center;gap:10px;padding:14px 12px 24px 14px;background:linear-gradient(160deg,#ff7d33,var(--o) 60%,var(--o2));color:#fff}',
    '.av{width:42px;height:42px;border-radius:50%;background:#fff;flex:none;display:grid;place-items:center;overflow:hidden;color:var(--o);font-weight:800;font-size:19px}',
    '.head .av{box-shadow:0 0 0 3px rgba(255,255,255,.3)}',
    '.av img{width:100%;height:100%;object-fit:cover}',
    '.ttl{flex:1;min-width:0}',
    '.ttl b{display:block;font-size:16.5px;font-weight:700}',
    '.ttl small{display:flex;align-items:center;gap:6px;font-size:12.5px;opacity:.95}',
    '.ttl small i{width:8px;height:8px;border-radius:50%;background:#9ff5bf;box-shadow:0 0 0 3px rgba(159,245,191,.3)}',
    '.hb{border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.14);color:#fff;border-radius:999px;height:32px;padding:0 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    '.hb:hover{background:rgba(255,255,255,.26)}',
    '.ib{border:0;background:transparent;color:#fff;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none}',
    '.ib:hover{background:rgba(255,255,255,.2)}',
    '.ib svg{width:18px;height:18px}',
    /* messages */
    '.log{flex:1;overflow-y:auto;padding:14px 14px 16px;display:flex;flex-direction:column;gap:12px;background:var(--bg);margin-top:-12px;border-radius:16px 16px 0 0;position:relative}',
    '.row{display:flex;gap:8px;align-items:flex-end}',
    '.row.me{justify-content:flex-end}',
    '.row .av{width:28px;height:28px;font-size:13px;box-shadow:0 0 0 1px var(--line)}',
    '.row .sp{width:28px;flex:none}',
    '.col{display:flex;flex-direction:column;gap:4px;max-width:86%;min-width:0}',
    '.m{padding:10px 14px;border-radius:18px;white-space:pre-line;overflow-wrap:anywhere;font-size:14.5px}',
    '.me .m{max-width:86%}',
    '.bot .m{background:var(--bub)}',
    '.ltr .bot .m{border-bottom-left-radius:6px}.rtl .bot .m{border-bottom-right-radius:6px}',
    '.me .m{background:var(--o);color:#fff}',
    '.ltr .me .m{border-bottom-right-radius:6px}.rtl .me .m{border-bottom-left-radius:6px}',
    '.fb{display:flex;gap:2px;align-items:center;font-size:12px;color:var(--mut);padding:0 6px}',
    '.fb button{border:0;background:transparent;cursor:pointer;font-size:14px;padding:2px 5px;border-radius:8px;opacity:.55;filter:grayscale(1)}',
    '.fb button:hover{opacity:1;filter:none;background:var(--bg2)}',
    /* item cards */
    '.cards{display:flex;flex-direction:column;gap:6px;margin-top:10px;white-space:normal}',
    '.card{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px}',
    '.th{width:52px;height:52px;border-radius:11px;object-fit:cover;flex:none;background:var(--os)}',
    '.card .nm{flex:1;min-width:0}',
    '.card .nm b{display:block;font-size:14px;font-weight:700;line-height:1.35}',
    '.card .nm span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;color:var(--mut);line-height:1.45}',
    '.card .nm em{display:inline-block;margin-top:3px;font-style:normal;font-weight:800;font-size:13.5px;color:var(--o2);font-variant-numeric:tabular-nums}',
    '.add{flex:none;width:34px;height:34px;border-radius:50%;border:1.5px solid var(--o);background:var(--bg);color:var(--o);font:inherit;font-size:20px;font-weight:700;line-height:1;cursor:pointer;display:grid;place-items:center}',
    '.add:hover,.add.ok{background:var(--o);color:#fff}',
    /* buttons */
    '.btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;white-space:normal}',
    '.btns a,.btns button{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font:inherit;font-size:13px;font-weight:700;padding:7px 13px;border-radius:999px;border:1.5px solid var(--o);color:var(--o);background:var(--bg);cursor:pointer}',
    '.btns .p{background:var(--o);color:#fff}',
    '.btns .wa{background:var(--wa);border-color:var(--wa);color:#fff}',
    '.btns a:hover,.btns button:hover{filter:brightness(.95)}',
    /* order basket */
    '.cartv{margin-top:10px;display:flex;flex-direction:column;gap:8px;white-space:normal}',
    '.ci{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 8px}',
    '.ci .th{width:38px;height:38px;border-radius:9px}',
    '.ci .nm{flex:1;min-width:0;font-size:13.5px;font-weight:700;line-height:1.3}',
    '.ci .nm small{display:block;color:var(--mut);font-weight:600;font-variant-numeric:tabular-nums}',
    '.qty{display:flex;align-items:center;gap:4px;flex:none}',
    '.qty button{width:26px;height:26px;border-radius:50%;border:1px solid var(--line);background:var(--bg2);color:var(--ink);font:inherit;font-weight:800;cursor:pointer;line-height:1}',
    '.qty span{min-width:20px;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}',
    '.br{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;font-weight:700}',
    '.br button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    '.br button.on{border-color:var(--o);background:var(--os);color:var(--o2)}',
    '.br.need button{animation:shake .4s}',
    '@keyframes shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}',
    '.ups{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;color:var(--mut);font-weight:600}',
    '.ups button{border:1.5px dashed var(--o);background:transparent;color:var(--o2);border-radius:999px;padding:5px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}',
    '.ups button:hover{background:var(--os)}',
    '.tile.again{width:100%;margin-top:8px;justify-content:flex-start}',
    '.tot{display:flex;justify-content:space-between;font-weight:800;font-size:15px;padding:2px 4px;font-variant-numeric:tabular-nums}',
    '.cnote{font-size:12px;color:var(--mut)}',
    '.empty{color:var(--mut);font-size:13.5px}',
    '.bar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--os);border-top:1px solid var(--line);font-size:13.5px;font-weight:700;color:var(--o2)}',
    '.bar[hidden]{display:none}',
    '.bar span{flex:1;font-variant-numeric:tabular-nums}',
    '.bar button{border:0;background:var(--o);color:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    /* welcome */
    '.hello{background:var(--bg2);border:1px solid var(--line);border-radius:18px;padding:14px;white-space:normal;width:100%}',
    '.hello h3{margin:0 0 2px;font-size:17px}',
    '.hello p{margin:0 0 12px;color:var(--mut);font-size:13.5px;line-height:1.55}',
    '.tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.tile{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:14px;padding:10px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-align:start;line-height:1.3}',
    '.tile:hover{border-color:var(--o);color:var(--o)}',
    '.tile em{font-style:normal;font-size:18px}',
    /* typing */
    '.typing .m{display:flex;gap:4px;align-items:center;padding:14px 16px}',
    '.typing i{width:7px;height:7px;border-radius:50%;background:var(--mut);opacity:.5;animation:b 1s infinite}',
    '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes b{0%,60%,100%{transform:none;opacity:.4}30%{transform:translateY(-4px);opacity:1}}',
    /* chips + input */
    '.chips{display:flex;gap:6px;overflow-x:auto;padding:9px 14px 3px;scrollbar-width:none;border-top:1px solid var(--line);background:var(--bg)}',
    '.chips[hidden]{display:none}',
    '.chips::-webkit-scrollbar{display:none}',
    '.chips button{flex:none;border:1px solid var(--line);background:var(--bg2);color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}',
    '.chips button:hover{border-color:var(--o);color:var(--o)}',
    'form{display:flex;gap:8px;align-items:center;padding:8px 12px 6px;background:var(--bg)}',
    'input{flex:1;min-width:0;font:inherit;font-size:16px;padding:11px 16px;border:1.5px solid var(--line);border-radius:999px;background:var(--bg2);color:var(--ink);outline:none}',
    'input:focus{border-color:var(--o);background:var(--bg)}',
    '.send,.mic{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:var(--o);color:#fff;display:grid;place-items:center;cursor:pointer}',
    '.mic{background:var(--bg2);color:var(--ink);border:1.5px solid var(--line)}',
    '.mic[hidden]{display:none}',
    '.mic.rec{background:#e11d48;color:#fff;border-color:#e11d48;animation:pulse 1.2s infinite}',
    '@keyframes pulse{50%{box-shadow:0 0 0 8px rgba(225,29,72,.18)}}',
    '.send:disabled{opacity:.5;cursor:default}',
    '.send svg,.mic svg{width:20px;height:20px}',
    '.rtl .send svg{transform:scaleX(-1)}',
    '.foot{text-align:center;font-size:11px;color:var(--mut);padding:0 12px calc(8px + env(safe-area-inset-bottom,0px));background:var(--bg)}',
    'button:focus-visible,a:focus-visible{outline:2px solid var(--o);outline-offset:2px}',
    'input:focus-visible{outline:none;box-shadow:0 0 0 3px var(--os)}',
    '@media (prefers-reduced-motion:no-preference){.row{animation:in .22s ease-out}.panel:not([hidden]){animation:pop .2s ease-out}.tease:not([hidden]){animation:in .3s ease-out}@keyframes in{from{opacity:0;transform:translateY(6px)}}@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.98)}}}'
  ].join('\n');

  var ICONS = {
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
  };

  var UI = {
    ar: { dir: 'rtl', title: 'مساعد نهم', status: 'متصل الآن · يرد فورًا', toggle: 'English', open: 'اسأل نهم', close: 'إغلاق', reset: 'محادثة جديدة', placeholder: 'اكتب سؤالك…', send: 'إرسال', mic: 'تكلّم بدل الكتابة', listening: 'أسمعك… تكلّم الحين',
      helloT: 'أهلًا فيك في نهم 👋', helloP: 'اسألني عن أي شيء: المنيو، الأسعار، الفروع، العروض. أقدر أقترح لك وجبة، وتقدر تجهّز طلبك هنا وترسله لنا على واتساب.',
      tiles: [['🍔', 'وش تنصحني؟'], ['📋', 'المنيو والأسعار'], ['📍', 'وين فروعكم؟'], ['🔥', 'العروض']],
      chips: ['ساعدني أطلب', 'الأكثر طلبًا', 'احنا 6 أشخاص', 'عندي 25 ريال', 'متى تفتحون؟'], morning: 'منيو الفطور', night: 'شي للسهرة 🌙', again: '🔁 اطلب طلبك السابق', againT: function (s) { return 'طلبك السابق: ' + s; }, noLast: 'ما لقيت طلب سابق محفوظ في هذا الجهاز.',
      ups: 'يكمّل طلبك:',
      foot: 'مساعد نهم الآلي · نهم المدينة المنورة', aiFoot: 'مدعوم بالذكاء الاصطناعي · قد يخطئ أحيانًا', waText: 'السلام عليكم، عندي استفسار', waBtn: 'واتساب الطلبات',
      sar: 'ريال', add: 'أضف للطلب', added: 'تمت الإضافة ✅', cartBar: function (n, t) { return '🛒 ' + n + (n === 1 ? ' صنف' : ' أصناف') + ' · ' + t + ' ريال'; }, viewCart: 'عرض الطلب',
      cartT: 'طلبك 🛒', cartEmpty: 'طلبك فاضي. اضغط + على أي صنف لإضافته.', branch: 'الفرع:', total: 'المجموع التقريبي', sendWa: 'أرسل الطلب على واتساب', platform: 'أو اطلب من المنصة', clear: 'امسح الطلب',
      cartNote: 'يوصل طلبك لفريق نهم على واتساب، ويأكدون معك السعر النهائي ووقت الاستلام.', pickBranch: 'اختر الفرع أول 👆',
      waOrder: function (b, lines, t) { return 'السلام عليكم 👋 أبغى أطلب من نهم\n📍 الفرع: ' + b + '\n\n' + lines.join('\n') + '\n\nالمجموع التقريبي: ' + t + ' ريال\n(الطلب من مساعد موقع نهم)'; },
      helpful: 'مفيد؟', thanks: 'شكرًا على رأيك 🧡', sorry: 'آسفين! بنحسّن الإجابة. تقدر تسأل فريقنا على واتساب.', askItem: '💬 اسأل المساعد عن هذا الصنف', askItemQ: function (n) { return 'وش في ' + n; } },
    en: { dir: 'ltr', title: 'Nahem Assistant', status: 'Online · replies instantly', toggle: 'عربي', open: 'Ask Nahem', close: 'Close', reset: 'New chat', placeholder: 'Type your question…', send: 'Send', mic: 'Speak instead of typing', listening: 'Listening… speak now',
      helloT: 'Welcome to Nahem 👋', helloP: 'Ask me anything: menu, prices, branches, offers. I can suggest a meal, and you can build your order here and send it to us on WhatsApp.',
      tiles: [['🍔', 'What do you recommend?'], ['📋', 'Menu & prices'], ['📍', 'Where are you?'], ['🔥', 'Offers']],
      chips: ['Help me order', 'Best sellers', 'We are 6 people', 'I have 25 SAR', 'Opening hours'], morning: 'Breakfast menu', night: 'Late-night food 🌙', again: '🔁 Order my last order again', againT: function (s) { return 'Your last order: ' + s; }, noLast: "I couldn't find a saved previous order on this device.",
      ups: 'Goes well with your order:',
      foot: "Nahem's automated assistant · Madinah", aiFoot: 'AI-powered · may occasionally be wrong', waText: 'Hello, I have a question', waBtn: 'WhatsApp orders',
      sar: 'SAR', add: 'Add to order', added: 'Added ✅', cartBar: function (n, t) { return '🛒 ' + n + (n === 1 ? ' item' : ' items') + ' · ' + t + ' SAR'; }, viewCart: 'View order',
      cartT: 'Your order 🛒', cartEmpty: 'Your order is empty. Tap + on any item to add it.', branch: 'Branch:', total: 'Estimated total', sendWa: 'Send order on WhatsApp', platform: 'Or order on the platform', clear: 'Clear order',
      cartNote: 'Your order goes to the Nahem team on WhatsApp, who confirm the final price and pickup time.', pickBranch: 'Pick a branch first 👆',
      waOrder: function (b, lines, t) { return 'Hello 👋 I would like to order from Nahem\n📍 Branch: ' + b + '\n\n' + lines.join('\n') + '\n\nEstimated total: ' + t + ' SAR\n(order from the Nahem website assistant)'; },
      helpful: 'Helpful?', thanks: 'Thanks for the feedback 🧡', sorry: "Sorry about that! We'll improve this answer. You can also ask our team on WhatsApp.", askItem: '💬 Ask the assistant about this item', askItemQ: function (n) { return "What's in " + n; } }
  };
  /* the teaser line changes with the time of day in Madinah */
  function teaseText(lang) {
    var h = riyadhHour(), ar = lang !== 'en';
    if (h >= 23 || h < 4) return ar ? '<b>سهران وجيعان؟</b> 🌙 نهم مفتوح الحين، اسألني وش تطلب' : '<b>Up late and hungry?</b> 🌙 Nahem is open now. Ask me what to get';
    if (h < 11) return ar ? '<b>صباح الخير ☀️</b> فطورك علينا: اسألني عن منيو الفطور' : '<b>Good morning ☀️</b> Ask me about our breakfast menu';
    if (h < 16) return ar ? '<b>جاك الجوع؟</b> 😋 اسألني وأقترح لك غداك' : "<b>Hungry?</b> 😋 Ask me and I'll pick your lunch";
    return ar ? '<b>وش العشاء الليلة؟</b> 🍔 اسألني وأقترح لك' : "<b>What's for dinner?</b> 🍔 Ask me for a suggestion";
  }

  function initialLang() {
    if (OPT.lang === 'en' || OPT.lang === 'ar') return OPT.lang;
    try { var l = localStorage.getItem('nahem-chat-lang'); if (l === 'en' || l === 'ar') return l; } catch (e) {}
    try { if (localStorage.getItem('nahem-lang') === 'en') return 'en'; } catch (e) {}
    return 'ar';
  }
  function load(key, fallback) { try { var v = JSON.parse(sessionStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function mount() {
    var host = document.createElement('div');
    host.id = 'nahem-chat';
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);

    var lang = initialLang();
    /* the chat and the order survive moving between pages of the site (per tab) */
    var history = load('nahem-chat-history', []);   /* [{who:'me', text} | {who:'bot', r}] */
    var cart = load('nahem-chat-cart', { items: [], branch: '' });   /* items: [{ar,en,price,img,qty}] */
    var aiOff = load('nahem-chat-aioff', false), logged = 0;   /* aiOff: the server has no AI key, so skip asking it this visit */

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function avatar() {
      var a = el('div', 'av');
      var img = new Image(); img.alt = ''; img.src = OPT.logo;
      img.onerror = function () { a.textContent = 'ن'; };
      a.appendChild(img);
      return a;
    }
    function thumb(i, cls) {
      var src = photo(i);
      if (!src) return null;
      var img = el('img', cls || 'th'); img.alt = ''; img.loading = 'lazy'; img.src = src;
      img.onerror = function () { img.remove(); };
      return img;
    }

    var wrap = el('div', 'wrap' + (OPT.side === 'right' ? ' pin-right' : OPT.side === 'left' ? ' pin-left' : ''));
    var fab = el('button', 'fab'); fab.type = 'button';
    var fabTx = el('span'), fabCnt = el('span', 'cnt');
    fab.append(avatar(), fabTx, el('span', 'dot'), fabCnt);
    var tease = el('div', 'tease'); tease.hidden = true;
    var teaseTx = el('span'), teaseX = el('button', 'tx', '×'); teaseX.type = 'button'; teaseX.setAttribute('aria-label', 'close');
    tease.append(teaseTx, teaseX);
    var panel = el('div', 'panel'); panel.hidden = true; panel.setAttribute('role', 'dialog');
    var head = el('div', 'head');
    var ttl = el('div', 'ttl'), tB = el('b'), tS = el('small');
    ttl.append(tB, tS);
    var langBtn = el('button', 'hb'); langBtn.type = 'button';
    var resetBtn = el('button', 'ib', ICONS.reset); resetBtn.type = 'button';
    var x = el('button', 'ib', ICONS.close); x.type = 'button';
    head.append(avatar(), ttl, langBtn, resetBtn, x);
    var log = el('div', 'log'); log.setAttribute('aria-live', 'polite');
    var bar = el('div', 'bar'), barTx = el('span'), barBtn = el('button'); barBtn.type = 'button';
    bar.append(barTx, barBtn);
    var chips = el('div', 'chips');
    var form = el('form'), input = el('input'), mic = el('button', 'mic', ICONS.mic), send = el('button', 'send', ICONS.send);
    input.autocomplete = 'off'; input.id = 'nahem-chat-input'; input.setAttribute('enterkeyhint', 'send'); send.type = 'submit'; mic.type = 'button';
    form.append(input, mic, send);
    var foot = el('div', 'foot');
    panel.append(head, log, bar, chips, form, foot);
    wrap.append(panel, tease, fab);
    root.appendChild(wrap);

    function T() { return UI[lang]; }
    function render() {
      var t = T();
      wrap.classList.toggle('rtl', t.dir === 'rtl'); wrap.classList.toggle('ltr', t.dir === 'ltr');
      wrap.setAttribute('dir', t.dir); wrap.setAttribute('lang', lang);
      fabTx.textContent = t.open; fab.setAttribute('aria-expanded', String(!panel.hidden)); fab.setAttribute('aria-label', t.open);
      tB.textContent = t.title; tS.innerHTML = '<i></i>' + t.status;
      langBtn.textContent = t.toggle; langBtn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
      resetBtn.title = t.reset; resetBtn.setAttribute('aria-label', t.reset);
      x.setAttribute('aria-label', t.close); panel.setAttribute('aria-label', t.title);
      input.placeholder = t.placeholder; input.setAttribute('aria-label', t.placeholder); send.setAttribute('aria-label', t.send);
      mic.title = t.mic; mic.setAttribute('aria-label', t.mic);
      teaseTx.innerHTML = teaseText(lang);
      foot.textContent = aiUrl() && !aiOff ? t.aiFoot : t.foot;
      renderBar();
    }
    function renderChips(list) {
      chips.textContent = '';
      (list || []).forEach(function (c) { var b = el('button'); b.type = 'button'; b.textContent = c; b.onclick = function () { ask(c); }; chips.appendChild(b); });
      chips.hidden = !(list && list.length);
    }
    function scroll() { log.scrollTop = log.scrollHeight; }
    function welcome() {
      var t = T();
      var row = el('div', 'row welcome'), box = el('div', 'hello'), h = el('h3'), p = el('p'), tiles = el('div', 'tiles');
      h.textContent = t.helloT; p.textContent = t.helloP;
      t.tiles.forEach(function (tl) { var b = el('button', 'tile'); b.type = 'button'; b.append(el('em', '', tl[0]), document.createTextNode(tl[1])); b.onclick = function () { ask(tl[1]); }; tiles.appendChild(b); });
      box.append(h, p, tiles);
      var last = lastOrder();
      if (last) {
        var again = el('button', 'tile again'); again.type = 'button';
        again.append(el('em', '', '🔁'), document.createTextNode(t.againT(last.items.map(function (i) { return i.qty + '× ' + (lang === 'en' ? i.en : i.ar); }).join('، ').slice(0, 60))));
        again.onclick = reorder;
        box.appendChild(again);
      }
      row.appendChild(box);
      log.appendChild(row);
      /* the first suggestion follows the time of day in Madinah */
      var h0 = riyadhHour(), first = h0 >= 4 && h0 < 11 ? t.morning : (h0 >= 23 || h0 < 4) ? t.night : null;
      renderChips((first ? [first] : []).concat(last ? [t.again] : []).concat(t.chips).slice(0, 6));
    }
    function lastOrder() { try { var o = JSON.parse(localStorage.getItem('nahem-chat-last-order') || 'null'); return o && o.items && o.items.length ? o : null; } catch (e) { return null; } }
    function reorder() {
      var last = lastOrder();
      if (!last) { botSay({ text: T().noLast, lang: lang }); return; }
      cart.items = last.items.map(function (i) { return Object.assign({}, i); }); cart.branch = last.branch || '';
      cartChanged(); track('nahem_chat_reorder', { items: cartCount() });
      if (panel.hidden) open();
      botSay(cartBubble());
    }

    /* ---------- the order basket ---------- */
    var cartViews = [];
    function cartCount() { return cart.items.reduce(function (n, i) { return n + i.qty; }, 0); }
    function cartTotal() { return cart.items.reduce(function (n, i) { return n + i.qty * i.price; }, 0); }
    function cartChanged() { save('nahem-chat-cart', cart); renderBar(); cartViews = cartViews.filter(function (v) { return v.isConnected; }); cartViews.forEach(fillCart); }
    function addItem(it, qty) {
      var row = cart.items.filter(function (c) { return c.ar === it.ar; })[0];
      if (row) row.qty = Math.min(99, row.qty + qty); else cart.items.push({ ar: it.ar, en: it.en, price: it.price, img: it.img || '', qty: qty });
      track('nahem_chat_add_to_cart', { item: it.ar, qty: qty });
      cartChanged();
    }
    function renderBar() {
      var n = cartCount();
      bar.hidden = !n; fabCnt.hidden = !n; fabCnt.textContent = n;
      barTx.textContent = T().cartBar(n, cartTotal()); barBtn.textContent = T().viewCart;
    }
    function fillCart(box) {
      var t = T(), d = liveData();
      box.textContent = '';
      if (!cart.items.length) { box.appendChild(el('div', 'empty')).textContent = t.cartEmpty; return; }
      cart.items.forEach(function (it) {
        var ci = el('div', 'ci'), nm = el('div', 'nm'), qty = el('div', 'qty'), minus = el('button', '', '−'), plus = el('button', '', '+'), n = el('span');
        minus.type = plus.type = 'button';
        nm.textContent = lang === 'en' ? it.en : it.ar;
        nm.appendChild(el('small')).textContent = it.price + ' × ' + it.qty + ' = ' + it.price * it.qty + ' ' + t.sar;
        n.textContent = it.qty;
        minus.onclick = function () { it.qty--; if (it.qty <= 0) cart.items.splice(cart.items.indexOf(it), 1); cartChanged(); };
        plus.onclick = function () { it.qty = Math.min(99, it.qty + 1); cartChanged(); };
        qty.append(minus, n, plus);
        var th = thumb(it); if (th) ci.appendChild(th);
        ci.append(nm, qty);
        box.appendChild(ci);
      });
      /* one-tap extras the order is missing */
      var full = function (ar) { return d.items.filter(function (i) { return i.ar === ar; })[0] || {}; };
      var inCart = cart.items.map(function (c) { return full(c.ar); });
      var hasMain = inCart.some(function (i) { return ['burger', 'special', 'boxes', 'breakfast'].indexOf(i.cat) !== -1; });
      var hasDrink = inCart.some(function (i) { return i.cat === 'drinks' || / drink /.test(' ' + (i.tags || '') + ' '); });
      var hasFries = inCart.some(function (i) { return / fries /.test(' ' + (i.tags || '') + ' ') || i.ar === 'بطاطس'; });
      var onlyBreakfast = inCart.every(function (i) { return i.cat === 'breakfast' || i.cat === 'drinks'; });
      var ups = [];
      if (hasMain && !hasDrink) ups.push(onlyBreakfast ? 'كرك' : 'مشروب غازي');
      if (hasMain && !hasFries && !onlyBreakfast) ups.push('بطاطس');
      if (hasMain && !inCart.some(function (i) { return i.cat === 'sauces'; }) && ups.length < 2 && !onlyBreakfast) ups.push('الصوصات');
      ups = ups.map(function (n) { return d.items.filter(function (i) { return i.ar === n; })[0]; }).filter(Boolean).slice(0, 2);
      if (ups.length) {
        var up = el('div', 'ups'); up.appendChild(el('span', '', t.ups));
        ups.forEach(function (i) {
          var b = el('button'); b.type = 'button'; b.textContent = '+ ' + (lang === 'en' ? i.en : i.ar) + ' · ' + i.price + ' ' + t.sar;
          b.onclick = function () { addItem(i, 1); track('nahem_chat_upsell', { item: i.ar }); };
          up.appendChild(b);
        });
        box.appendChild(up);
      }
      var br = el('div', 'br'); br.appendChild(document.createTextNode(t.branch));
      d.branches.forEach(function (b) {
        var bt = el('button', cart.branch === b.ar ? 'on' : ''); bt.type = 'button'; bt.textContent = lang === 'en' ? b.en : b.ar;
        bt.onclick = function () { cart.branch = b.ar; cartChanged(); };
        br.appendChild(bt);
      });
      var tot = el('div', 'tot'); tot.append(el('span', '', t.total), el('span', '', cartTotal() + ' ' + t.sar));
      var note = el('div', 'cnote'); note.textContent = t.cartNote;
      var btns = el('div', 'btns');
      var waBtn = el('a', 'wa'); waBtn.innerHTML = ICONS.wa; waBtn.appendChild(document.createTextNode(t.sendWa));
      waBtn.href = '#'; waBtn.target = '_blank'; waBtn.rel = 'noopener';
      var branch = d.branches.filter(function (b) { return b.ar === cart.branch; })[0];
      if (branch) waBtn.href = wa(d.settings.whatsapp, t.waOrder(lang === 'en' ? branch.en : branch.ar, cart.items.map(function (i) { return '• ' + i.qty + ' × ' + (lang === 'en' ? i.en : i.ar) + ' (' + i.qty * i.price + ' ' + t.sar + ')'; }), cartTotal()));
      waBtn.onclick = function (e) {
        if (!branch) { e.preventDefault(); br.classList.remove('need'); void br.offsetWidth; br.classList.add('need'); note.textContent = t.pickBranch; return; }
        track('nahem_chat_whatsapp_order', { total: cartTotal(), items: cartCount(), branch: cart.branch });
        try { localStorage.setItem('nahem-chat-last-order', JSON.stringify({ items: cart.items, branch: cart.branch, at: Date.now() })); } catch (err) {}
        report('order', { q: cart.items.map(function (i) { return i.qty + 'x ' + i.ar; }).join(', '), total: cartTotal(), branch: cart.branch });
      };
      var plat = el('a'); plat.href = utm(d.settings.orderUrl, 'chatbot_cart'); plat.target = '_blank'; plat.rel = 'noopener'; plat.textContent = t.platform;
      var clr = el('button'); clr.type = 'button'; clr.textContent = t.clear; clr.onclick = function () { cart.items = []; cartChanged(); };
      btns.append(waBtn, plat, clr);
      box.append(br, tot, note, btns);
    }
    function cartBubble() { return { text: T().cartT, showCart: true, lang: lang }; }

    /* ---------- messages ---------- */
    function bubble(who, r, live) {
      var row = el('div', 'row ' + (who === 'me' ? 'me' : 'bot'));
      if (who !== 'me') { var last = log.lastElementChild; row.appendChild(last && last.classList.contains('bot') ? el('div', 'sp') : avatar()); }
      var m = el('div', 'm'); m.setAttribute('dir', 'auto');
      m.appendChild(document.createTextNode(r.text || ''));
      var rl = r.lang || lang, t = UI[rl];
      if (r.cards && r.cards.length) {
        var cards = el('div', 'cards'); cards.setAttribute('dir', t.dir);
        r.cards.forEach(function (i) {
          var c = el('div', 'card'), nm = el('div', 'nm'), b = el('b'), sp = el('span'), pr = el('em'), add = el('button', 'add', '+');
          b.textContent = rl === 'en' ? i.en : i.ar; sp.textContent = rl === 'en' ? i.dEn : i.dAr; var kc = kcalOf(i); pr.textContent = i.price + ' ' + t.sar + (kc && kc.n ? ' · ' + (kc.est ? '~' : '') + kc.n + (rl === 'en' ? ' kcal' : ' سعرة') : '');
          add.type = 'button'; add.title = t.add; add.setAttribute('aria-label', t.add + ': ' + b.textContent);
          add.onclick = function () { addItem(i, 1); add.textContent = '✓'; add.classList.add('ok'); setTimeout(function () { add.textContent = '+'; add.classList.remove('ok'); }, 1200); };
          var th = thumb(i); if (th) c.appendChild(th);
          nm.append(b, sp, pr); c.append(nm, add); cards.appendChild(c);
        });
        m.appendChild(cards);
      }
      /* cards, basket and buttons follow the chat's language direction, not the text above them */
      if (r.showCart) { var cv = el('div', 'cartv'); cv.setAttribute('dir', T().dir); fillCart(cv); cartViews.push(cv); m.appendChild(cv); }
      if ((r.actions && r.actions.length) || (r.buttons && r.buttons.length)) {
        var row2 = el('div', 'btns'); row2.setAttribute('dir', T().dir);
        (r.actions || []).forEach(function (a) {
          var bt = el('button', 'p'); bt.type = 'button'; bt.textContent = '🛒 ' + a.label;
          bt.onclick = function () { a.add.forEach(function (x) { addItem(x[1], x[0]); }); botSay(Object.assign(cartBubble(), { text: T().added })); };
          row2.appendChild(bt);
        });
        (r.buttons || []).forEach(function (b) {
          if (!b || !b.href) return;
          var a = el('a', b.primary && !(r.actions && r.actions.length) ? 'p' : ''); a.href = b.href; a.textContent = b.label;
          if (!/^\//.test(b.href) && b.href.indexOf(location.origin) !== 0) { a.target = '_blank'; a.rel = 'noopener'; }
          a.addEventListener('click', function () { track('nahem_chat_click', { cta: b.label, href: b.href }); });
          row2.appendChild(a);
        });
        m.appendChild(row2);
      }
      if (who === 'me') { row.appendChild(m); }
      else {
        var col = el('div', 'col'); col.appendChild(m);
        if (live && r.q) col.appendChild(feedback(r, t));
        row.appendChild(col);
      }
      log.appendChild(row); scroll();
      return row;
    }
    function feedback(r, t) {
      var fb = el('div', 'fb'), up = el('button', '', '👍'), down = el('button', '', '👎');
      up.type = down.type = 'button'; up.setAttribute('aria-label', '👍'); down.setAttribute('aria-label', '👎');
      fb.append(el('span', '', t.helpful), up, down);
      function done(good) {
        fb.textContent = good ? t.thanks : t.sorry;
        report('feedback', { q: r.q, a: (r.text || '').slice(0, 300), rating: good ? 'up' : 'down' });
        track('nahem_chat_feedback', { rating: good ? 'up' : 'down' });
      }
      up.onclick = function () { done(true); }; down.onclick = function () { done(false); };
      return fb;
    }
    function typing() {
      var last = log.lastElementChild;
      var row = el('div', 'row bot typing');
      row.append(last && last.classList.contains('bot') ? el('div', 'sp') : avatar(), el('div', 'm', '<i></i><i></i><i></i>'));
      log.appendChild(row); scroll();
      return row;
    }
    function remember(entry) { history.push(entry); save('nahem-chat-history', history.slice(-40)); }
    function botSay(r) {
      remember({ who: 'bot', r: r });
      bubble('bot', r, true);
      if (r.chips) renderChips(r.chips); else if (!r.showCart) renderChips(null);
    }

    /* ---------- asking ---------- */
    var busy = false;
    function ask(text) {
      text = String(text || '').trim();
      if (!text || busy) return;
      input.value = '';
      var n = norm(text);
      /* "English", "تكلم انجليزي", "speak arabic" switch the chat language */
      var lw = n.split(' ');
      var filler = /^(تكلم|كلمني|رد|ردي|تحدث|حول|غير|اللغه|لغه|الي|ل|في|speak|talk|reply|answer|switch|change|to|in|please|plz|language|lang|can|you|could|بال|لو|سمحت)$/;
      var langWord = function (re) { return lw.length <= 5 && lw.some(function (w) { return re.test(w); }) && lw.every(function (w) { return re.test(w) || filler.test(w); }); };
      var asLang = langWord(/^(english|انجليزي|بالانجليزي|انقليزي|بالانقليزي|الانجليزي|انجلش|english)$/) ? 'en' : langWord(/^(عربي|بالعربي|العربي|arabic)$/) ? 'ar' : null;
      if (asLang) { setLang(asLang); return; }
      remember({ who: 'me', text: text });
      bubble('me', { text: text });
      if (/(طلبي السابق|طلبك السابق|نفس الطلب|نفس طلبي|نفس المره الماضيه|اعيد الطلب|reorder|order again|last order|same as last time|same order)/.test(n)) { reorder(); return; }
      var dots = typing();
      track('nahem_chat_message', { language: lang });
      var local = answer(text, lang);
      local.q = text;
      /* basket actions the engine asked for */
      if (local.switchLang) { dots.remove(); setLang(local.switchLang); return; }
      if (local.clearCart) { cart.items = []; cartChanged(); }
      if (local.addToCart) local.addToCart.forEach(function (x) { addItem(x[1], x[0]); });
      if (local.removeFromCart) { local.removeFromCart.forEach(function (it) { cart.items = cart.items.filter(function (c) { return c.ar !== it.ar; }); }); cartChanged(); }
      if (local.fallback) { report('unanswered', { q: text }); track('nahem_chat_unanswered', { language: lang }); }
      var url = aiUrl();
      busy = true; send.disabled = true;
      var done = function (r) { dots.remove(); botSay(r); busy = false; send.disabled = false; };
      var direct = !url || aiOff || local.addToCart || local.clearCart || local.showCart;
      if (direct) { setTimeout(function () { done(local); }, 450 + Math.min(450, (local.text || '').length * 2)); return; }
      askAI(url).then(function (reply) {
        /* the AI writes the answer; the built-in engine adds its cards and buttons when it recognised the topic */
        var keep = !local.fallback;
        done({ q: text, text: reply, cards: keep && local.cards && local.cards.length <= 4 ? local.cards : null, actions: keep ? local.actions : null,
          buttons: keep ? local.buttons : [{ label: T().waBtn, href: wa(liveData().settings.whatsapp, T().waText) }], chips: local.chips, lang: lang });
      }, function (e) {
        if (e && /no_key|bad_action/.test(e.message)) { aiOff = true; save('nahem-chat-aioff', true); render(); }
        done(local);
      });
    }
    function aiUrl() {
      var u = OPT.ai || (window.NAHEM_CONFIG && window.NAHEM_CONFIG.chatUrl) || '';
      return /^(https:\/\/|http:\/\/localhost[:/])/.test(u) ? u : '';
    }
    function askAI(url) {
      var turns = history.slice(-10).map(function (h) { return { role: h.who === 'me' ? 'user' : 'assistant', text: h.who === 'me' ? h.text : (h.r && h.r.text) || '' }; });
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      /* text/plain keeps it a "simple" request, so Apps Script needs no CORS preflight */
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'chat', lang: lang, messages: turns }), signal: ctl && ctl.signal })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          clearTimeout(timer);
          if (!j || !j.ok || !j.reply) throw new Error((j && j.error) || 'no reply');
          return String(j.reply).replace(/\*\*/g, '');
        }, function (e) { clearTimeout(timer); throw e; });
    }
    /* unanswered questions, feedback and WhatsApp orders go to the owner's Google Sheet (see Code.gs) */
    function report(type, data) {
      var url = aiUrl();
      if (!url || logged >= 40) return;
      logged++;
      try {
        fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(Object.assign({ action: 'log', type: type, lang: lang, page: location.pathname }, data)) }).catch(function () {});
      } catch (e) {}
    }

    /* ---------- voice input (Arabic or English, where the browser supports it) ---------- */
    var Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = null;
    mic.hidden = !Speech;
    mic.onclick = function () {
      if (rec) { rec.stop(); return; }
      try { rec = new Speech(); } catch (e) { mic.hidden = true; return; }
      rec.lang = lang === 'en' ? 'en-US' : 'ar-SA';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      var said = '';
      rec.onresult = function (e) { said = Array.prototype.map.call(e.results, function (r) { return r[0].transcript; }).join(' '); input.value = said; };
      rec.onerror = function (e) {
        if (!/not-allowed|service-not-allowed|audio-capture/.test(e.error)) return;
        mic.hidden = true;
        botSay({ text: lang === 'en' ? "I couldn't reach your microphone 🎙️ Allow microphone access for this site in your browser settings, or just type your question." : 'ما قدرت أوصل للمايك 🎙️ اسمح للموقع باستخدام المايكروفون من إعدادات المتصفح، أو اكتب سؤالك عادي.', lang: lang });
      };
      rec.onend = function () { rec = null; mic.classList.remove('rec'); input.placeholder = T().placeholder; if (said.trim()) ask(said); };
      mic.classList.add('rec'); input.placeholder = T().listening; input.value = '';
      try { rec.start(); } catch (e) { rec = null; mic.classList.remove('rec'); }
      track('nahem_chat_voice', { language: lang });
    };

    function rebuild() {
      log.textContent = ''; cartViews = [];
      welcome();
      history.forEach(function (h) { bubble(h.who, h.who === 'me' ? { text: h.text } : h.r, false); });
    }
    function setLang(l) {
      lang = l;
      try { localStorage.setItem('nahem-chat-lang', l); } catch (e) {}
      render(); rebuild();
    }
    function reset() { history = []; save('nahem-chat-history', []); CTX.last = []; CTX.topic = null; rebuild(); input.focus(); }
    function open() {
      tease.hidden = true; markTeased();
      panel.hidden = false; fab.hidden = window.matchMedia('(max-width:480px)').matches; render();
      if (!log.childElementCount) rebuild();
      setTimeout(function () { input.focus(); scroll(); }, 60);
      track('nahem_chat_open', { language: lang });
    }
    function close() { if (rec) rec.stop(); panel.hidden = true; fab.hidden = false; render(); fab.focus(); }
    function markTeased() { try { sessionStorage.setItem('nahem-chat-teased', '1'); } catch (e) {} }
    function showCart() { if (panel.hidden) open(); botSay(cartBubble()); }

    fab.onclick = function () { panel.hidden ? open() : close(); };
    tease.onclick = function (e) { if (e.target === teaseX) { tease.hidden = true; markTeased(); return; } open(); };
    x.onclick = close;
    resetBtn.onclick = reset;
    barBtn.onclick = showCart;
    langBtn.onclick = function () { setLang(lang === 'ar' ? 'en' : 'ar'); };
    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    /* sit above the site's own bottom bar on phones (.mobile-actions on nahem24.com) */
    function lift() {
      var mb = document.querySelector('.mobile-actions'), px = 20;
      if (mb && getComputedStyle(mb).display !== 'none') {
        var rc = mb.getBoundingClientRect();
        if (rc.height) px = Math.max(20, Math.round(window.innerHeight - rc.top + 10));
      }
      wrap.style.setProperty('--lift', px + 'px');
    }
    lift();
    window.addEventListener('resize', lift);
    setTimeout(lift, 1500);

    /* "ask the assistant" inside the site's menu item pop-up */
    function hookItemModal() {
      var modal = document.getElementById('itemModal'), order = document.getElementById('itemModalOrder'), title = document.getElementById('itemModalTitle');
      if (!modal || !order || !title || document.getElementById('nahemAskItem')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'nahemAskItem';
      b.style.cssText = 'display:block;width:100%;margin-top:10px;padding:11px 16px;border-radius:999px;border:1.5px solid #ff6b1a;background:transparent;color:#ff6b1a;font:inherit;font-weight:700;cursor:pointer';
      var label = function () { return UI[document.documentElement.lang === 'en' ? 'en' : 'ar'].askItem; };
      b.textContent = label();
      new MutationObserver(function () { b.textContent = label(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      b.onclick = function () {
        var name = title.textContent.trim(), close = document.getElementById('itemModalClose');
        if (close) close.click();
        track('nahem_chat_ask_item', { item: name });
        window.NahemChat.ask(T().askItemQ(name));
      };
      order.insertAdjacentElement('afterend', b);
    }

    render();
    if (OPT.open) open();
    else {
      var teased = false; try { teased = sessionStorage.getItem('nahem-chat-teased') === '1'; } catch (e) {}
      if (!teased) setTimeout(function () { if (panel.hidden) { teaseTx.innerHTML = teaseText(lang); tease.hidden = false; } }, 5000);
    }
    window.NahemChat = { open: open, close: close, setLang: setLang, reset: reset, showCart: showCart, ask: function (q) { if (panel.hidden) open(); ask(q); }, answer: answer };
    hookItemModal();
  }

  function track(event, data) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, data));
      if (typeof window.gtag === 'function') window.gtag('event', event, data);
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
