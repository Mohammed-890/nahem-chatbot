# Going live: setup guide

Everything the restaurant needs to switch the assistant on, in order. Steps 1 and 4 are enough for the website chat; step 2 adds the AI answers, the natural voice and the Google Sheet report; step 3 is the in-store kiosk.

## 1. Add the chat to nahem24.com (Netlify)

1. In Netlify, open the nahem24 site, then **Deploys**.
2. Drag the site folder (with `chatbot.js`, `kiosk.html`, `assets/` and the updated `_headers`) onto the deploy box.
3. Open nahem24.com: the orange **اسأل نهم** button appears on every page.

To undo: in **Deploys**, open the previous deploy and choose **Publish deploy**.

If the site is edited by hand instead, the chat is one line before `</body>` on every page:

```html
<script src="/chatbot.js" defer></script>
```

and `_headers` must allow the microphone (and the camera, for the kiosk greeting): `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`.

## 2. AI answers, natural voice and the report (Google Apps Script + Gemini)

1. Go to [script.google.com](https://script.google.com), create a project and paste `server/Code.gs`.
2. Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com/apikey) (free tier).
3. In the project: **Project settings → Script properties**, add `GEMINI_API_KEY` = the key.
4. Run `setup()` once (it creates the Google Sheet for the report) and `testChat()` to check the key.
5. **Deploy → New deployment → Web app**, execute as *Me*, access *Anyone*. Copy the web app URL.
6. In the site's `config.js`, set `chatUrl` to that URL and deploy the site again.

What this switches on:

- **AI answers** for unusual questions, in Arabic, English or Urdu, using the live menu, the kitchen's nutrition table and the restaurant's facts.
- **The natural female voice** on the kiosk (Gemini text-to-speech, voice `Kore`; change it with the `GEMINI_TTS_VOICE` property). Without it, the kiosk uses the best voice installed on the device.
- **The report**: unanswered questions, 👍/👎 ratings and WhatsApp orders, in the Google Sheet.

Optional properties: `GEMINI_MODEL` (default `gemini-2.5-flash-lite`), `GEMINI_TTS_MODEL` (default `gemini-2.5-flash-preview-tts`).

## 3. The in-store kiosk (tablet or robot screen)

1. A 10–15 inch Android tablet on a floor stand is the simplest; any service robot with an Android screen that can open a web page also works (check with the supplier). In a noisy restaurant, a USB speaker-microphone makes voice much more reliable.
2. Open `https://nahem24.com/kiosk.html?branch=qaswa` (or `branch=ared`) in Chrome. For a locked screen, use Chrome's kiosk mode or an app such as Fully Kiosk Browser with that address.
3. Allow the microphone when asked. Turn on **Spoken replies** and, if wanted, the camera greeting: hold the top-left corner for 3 seconds to open the staff settings (branch, default language: Arabic, English or Urdu, voice, greeting).
4. The screen stays on by itself while the page is open. The assistant resets between customers.

For the best voice without the server, install the Google speech voices on the tablet (Settings → Text-to-speech → Google, Arabic and Urdu voice data).

## 4. Keeping it up to date

- **Prices, branches and items** come from the admin panel automatically.
- **Nutrition, ingredients and allergens** live in tables at the top of `chatbot.js`: `CALORIES`, `NUTRITION` (with `KITCHEN` listing the items whose figures come from the kitchen), `ING` and `RECIPE`. Copy any change to the same tables in `server/Code.gs`.
- **Restaurant facts** (payment, delivery, seating and so on) are in `FACTS`, and the free and paid add-ons in `MODS`.
- **Preparation videos**: add one line per item to `MEDIA`, e.g. `'برجر دجاج زنجر': { video: '/videos/zinger.mp4' }` (an .mp4 in the site folder, or a YouTube link). The video then plays on the item's page and when someone asks for it.
- **Urdu**: answers are translated in `UR_TEXT` (fixed phrases) and `UR_RULES` (phrases with names and numbers); Urdu questions are understood through `UR_IN`. Anything not listed is answered in English.
