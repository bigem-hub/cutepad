import type { Dict } from './index';

export const en: Dict = {
  'legal.back': '← back to Cutepad',
  'legal.meta':
    'Effective {effective} · {product} is operated by {operatedBy} ({country}). Questions: {email}',
  'legal.navLabel': 'Legal pages',
  'legal.navPrivacy': 'Privacy',
  'legal.navTerms': 'Terms',
  'legal.navCookies': 'Cookies',
  'legal.navRefunds': 'Refunds',
  'legal.you': 'you',
  'legal.your': 'your',

  'legal.p.title': 'Privacy Policy',
  'legal.p.shortLabel': 'The short version:',
  'legal.p.shortBody1':
    'Cutepad is a local-first app. Your notes, planner, tasks, flashcards, moods and settings stay on your own device. We run',
  'legal.p.shortStrong': 'no analytics, no tracking, no advertising and no sign-ups',
  'legal.p.shortBody2':
    ', and nothing leaves your device unless you switch on an optional cloud feature yourself. If you enable built-in sync, your data is stored under a private, device-only anonymous ID in our Firestore project — no personal account is ever created for you.',
  'legal.p.s1': '1. Who we are',
  'legal.p.who':
    '{product} is operated by {operatedBy}, {address}. Contact and data-grievance enquiries: {email}.',
  'legal.p.s2': '2. What we process — and only what is necessary',
  'legal.p.s2a': 'On your device (always)',
  'legal.p.s2b': 'Only if you turn on optional features',
  'legal.p.contentLabel': 'Your content:',
  'legal.p.contentBody1':
    "notes, drawings, planner blocks, tasks, flashcard decks, mood entries, documents, stickers/outfits and settings. Stored in your browser's local storage under the key",
  'legal.p.contentBody2': '. This is required for the app to work at all.',
  'legal.p.cfgLabel': 'Your optional configuration:',
  'legal.p.cfgBody1':
    'if you enable cloud sync or bring-your-own AI, any URL, key and name you enter are stored locally on your device so the app can talk to',
  'legal.p.cfgBody2': ' services. Built-in sync needs no entry — its project config ships with the app.',
  'legal.p.backupLabel': 'Desktop backups:',
  'legal.p.backupBody1': 'the desktop app writes local JSON backup files under',
  'legal.p.backupBody2': 'on your computer. Nothing leaves your machine.',
  'legal.p.cloudLabel': 'Cloud sync (built-in Firestore or your Supabase project):',
  'legal.p.cloudBody1': 'your data is sent to the cloud service you chose — the built-in Cutepad Firestore project (Google Cloud)',
  'legal.p.cloudBody2':
    'or the Supabase project you configured. Built-in sync keeps one private document per device under an anonymous ID, protected by security rules; Google processes it as our cloud provider. Self-hosted Supabase stays under your control — Supabase’s terms and privacy policy apply to your project.',
  'legal.p.pubLabel': 'Published notes:',
  'legal.p.pubBody':
    'when you press “publish”, the note’s content goes to your configured Supabase project and becomes readable by anyone who has the share link.',
  'legal.p.buddyLabel': 'Buddy / study group sharing:',
  'legal.p.buddyBody':
    'only the display name and study statistics you choose to share (daily minutes, streak, totals) are sent to your configured Supabase project and shown to people who have the same pair/group code.',
  'legal.p.aiLabel': 'Bring-your-own AI:',
  'legal.p.aiBody1':
    'note text you send for summarising/flashcards goes to the AI endpoint',
  'legal.p.aiBody2':
    'configured (e.g. your OpenAI account). The default engine runs fully offline on your device and sends nothing anywhere.',
  'legal.p.speechLabel': 'Speech features:',
  'legal.p.speechBody':
    "text-to-speech and dictation use your device's speech engine. In some browsers (notably Chrome), speech recognition is performed by the browser vendor and audio may be sent to that vendor — check your browser's settings if this matters to you. Nothing is sent by Cutepad itself.",
  'legal.p.s3': '3. What we never collect',
  'legal.p.never1': 'No accounts, no email addresses, no phone numbers.',
  'legal.p.never2': 'No analytics, telemetry, crash reporters, pixels or fingerprints.',
  'legal.p.never3':
    'No advertising identifiers and no sale or sharing of data for ads — we have no ad tech at all.',
  'legal.p.never4a': 'No cookies (see the',
  'legal.p.cookieLink': 'Cookie Policy',
  'legal.p.never5':
    'No location data, contacts, or access to your files beyond documents you explicitly import.',
  'legal.p.s4': '4. Legal basis & the Indian DPDP Act',
  'legal.p.dpdp':
    'For users in India, Cutepad follows the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025 (notified 13 November 2025, phased commencement). Where those rules require consent, we ask for it with a clear, specific checkbox before the related transmission happens (cloud sync, publishing a note, buddy/group sharing), state the purpose, and let you withdraw it just as easily — unchecking the box stops the corresponding processing immediately.',
  'legal.p.purposeLabel': 'Purpose limitation & minimisation:',
  'legal.p.purposeBody': 'each optional feature collects only what it needs (listed above) and nothing more.',
  'legal.p.storageLabel': 'Storage limitation:',
  'legal.p.storageBody':
    'we keep no copies of our own beyond what you choose to sync. Data on your device stays until you delete it — clear it any time via browser/site settings or the app’s “reset everything”. If you use built-in sync, one private document in our Firestore project persists until you withdraw consent and delete it there; if you use Supabase sync, rows in your project persist until you delete them there.',
  'legal.p.rightsLabel': 'Your rights:',
  'legal.p.rightsBody':
    'access, correction, erasure, withdrawal of consent, and nomination of another person to exercise your rights. Because your primary data lives on your own device, most of these are self-service (edit/delete in the app). For anything else, write to {email} — we aim to respond within the 90 days permitted by the Rules.',
  'legal.p.childrenLabel': 'Children:',
  'legal.p.childrenBody':
    "the app is not directed at children under 18. Under the DPDP Act processing a child's personal data needs verifiable parental consent, so minors may only use Cutepad under a parent or guardian's supervision and consent.",
  'legal.p.crossLabel': 'Cross-border transfer:',
  'legal.p.crossBody1': 'if you enable sync or BYO AI, data flows to the provider/region',
  'legal.p.crossBody2':
    'chose — built-in sync stores data in Google Cloud regions used by the Cutepad Firebase project, Supabase sync in your project’s location. We do not control that destination.',
  'legal.p.breachLabel': 'Breach notice:',
  'legal.p.breachBody':
    'if we ever learn of a breach affecting data we hold (nothing, by default — only a private per-device document if you enabled built-in sync), we will notify affected individuals and the Data Protection Board of India without delay, as required by the Rules.',
  'legal.p.s5': '5. Third parties',
  'legal.p.thirdBody1':
    'None by default. The website loads no external scripts, fonts, trackers or embeds — even the fonts are served from our own files. Third parties only appear when',
  'legal.p.thirdBody2':
    'configure them: Google Firebase/Cloud Firestore (built-in sync), Supabase (optional sync/sharing) and an AI provider endpoint (optional AI). The desktop operating system may process speech input for dictation/TTS.',
  'legal.p.s6': '6. Security',
  'legal.p.security':
    "Local-first design keeps your data off the internet by default. The app ships a Content-Security-Policy, sanitises HTML shown on public share pages, and does not include remote code. Honest caveat: anything stored in your browser's local storage is readable by anyone with access to your device or profile, so protect your machine (and your sync keys) accordingly.",
  'legal.p.s7': '7. Changes & contact',
  'legal.p.changes1':
    "We will update this policy if the app's data practices change and revise the effective date above. Contact:",
  'legal.p.changes2': 'for any privacy question, grievance or request.',

  'legal.t.title': 'Terms & Conditions',
  'legal.t.intro':
    'By using {product} (“the app”) you agree to these terms. If you do not agree, please do not use the app. The app is provided by {operatedBy} ({address}, {country}) at {email}.',
  'legal.t.s1': '1. Eligibility',
  'legal.t.s1Body':
    'You must be 18 years or older, or use the app under the supervision and with the consent of a parent or guardian. Under India’s DPDP Act, 2023 a person under 18 is a “child” whose personal data requires verifiable parental consent.',
  'legal.t.s2': '2. The service',
  'legal.t.s2Body':
    'Cutepad is a note-taking and study companion provided as-is, free of charge, without an account. Optional features (cloud sync, published pages, buddy/group sharing, BYO AI, speech) work only if you configure them and can be withdrawn at any time.',
  'legal.t.s3': '3. Your content',
  'legal.t.c1': 'You keep all rights to the notes, drawings, documents and other content you create.',
  'legal.t.c2':
    'You are responsible for your content. Do not store or publish material you are not allowed to share — including other people’s personal data, secrets, or content that infringes copyright or is unlawful.',
  'legal.t.c3':
    'Publishing a note makes it public to anyone with the link. Buddy/group codes share your chosen statistics with whoever you give the code to. Think before you share.',
  'legal.t.s4': '4. Acceptable use',
  'legal.t.s4Body':
    'Do not use the app to violate laws, infringe rights, distribute malware, or attempt to attack, scrape or overload the app or any services you connect to it. Reverse engineering is permitted to the extent the applicable law allows it (this app is your copy to inspect and adapt for personal use).',
  'legal.t.s5': '5. Optional AI features — not professional advice',
  'legal.t.s5Body1':
    'Summaries, quizzes, flashcards and schedule suggestions are generated by heuristics running on your device or by the AI provider',
  'legal.t.s5Body2':
    'configured. They can be wrong, incomplete or biased. Do not rely on them as medical, legal, academic-exam or other professional advice — always check the output yourself.',
  'legal.t.s6': '6. No warranty',
  'legal.t.s6Body':
    'The app is provided “as is” and “as available”, without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, and uninterrupted or error-free operation. Study tools (including spaced repetition and streaks) are productivity helpers, not guarantees of results.',
  'legal.t.s7': '7. Limitation of liability',
  'legal.t.s7Body':
    'To the maximum extent permitted by applicable law, the operator is not liable for any indirect, incidental, special or consequential damages, or any loss of data, profits or goodwill arising from your use of (or inability to use) the app — including data loss from your device, your sync project or your own configuration. Nothing in these terms limits liability that cannot be limited under applicable law.',
  'legal.t.s8': '8. Third-party services you connect',
  'legal.t.s8Body':
    'Google Firebase/Cloud Firestore (built-in sync), Supabase (sync/publishing), AI providers you configure, and your browser/OS speech services are governed by their own terms and privacy policies. You are responsible for your accounts with them.',
  'legal.t.s9': '9. Copyright',
  'legal.t.s9Body':
    'The app’s code, visual design, mascot artwork and text are owned by the operator or its licensors. The bundled typefaces (Fredoka, Nunito) are licensed under the SIL Open Font License 1.1 — you may use and redistribute them under that license. In-app emoji and generated patterns are original; user-imported images and documents remain yours.',
  'legal.t.s10': '10. Ending use',
  'legal.t.s10Body':
    'You can stop using the app at any time; delete local data from your browser/device settings (or use the app’s reset), and delete rows in your own sync project. We may update the app or these terms; continued use after an update means you accept the revised terms.',
  'legal.t.s11': '11. Governing law',
  'legal.t.s11Body':
    'These terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts of India, without prejudice to any consumer rights you have under applicable law.',

  'legal.c.title': 'Cookie Policy',
  'legal.c.shortStrong': 'Short answer: Cutepad does not use cookies.',
  'legal.c.shortBody':
    'There is no cookie banner on this site because there is nothing to consent to — we do not set advertising, analytics or any other non-essential cookies.',
  'legal.c.s1': '1. What we use instead',
  'legal.c.body1': 'Your notes and settings are saved in your browser’s',
  'legal.c.ls': 'local storage',
  'legal.c.keyLabel': 'key',
  'legal.c.body3':
    ', not in cookies. Local storage keeps the app working offline and is strictly necessary for core functionality — remembering your content between visits. The desktop app additionally writes local backup files on your own computer.',
  'legal.c.s2': '2. Cookies we set',
  'legal.c.s2Body1': 'None. You can verify this yourself: no',
  'legal.c.s2Body2': 'usage exists anywhere in the app.',
  'legal.c.s3': '3. Third parties',
  'legal.c.s3Body1':
    'None are loaded by us. Fonts are self-hosted; there are no trackers, embeds, or third-party scripts. If',
  'legal.c.s3Body2':
    'enable optional features, your configured or built-in services (e.g. Google Firebase, Supabase) may process your requests under their own policies — they do not set cookies through Cutepad.',
  'legal.c.s4': '4. Managing stored data',
  'legal.c.m1':
    'Website: browser settings → “Clear browsing data” (or site settings for this origin) removes local storage and all app data permanently.',
  'legal.c.m2Body1': 'Desktop: use the app’s “reset everything” action, and delete',
  'legal.c.m2Body2': 'if you want backups gone too.',
  'legal.c.s5': '5. Changes & contact',
  'legal.c.changes':
    'If we ever introduce non-essential storage or cookies, we will update this page and ask for consent first before setting them. Questions: {email}.',

  'legal.r.title': 'Refund Policy',
  'legal.r.shortStrong': 'Short answer: Cutepad is currently free, so there is nothing to refund.',
  'legal.r.s1': '1. No purchases are made in Cutepad',
  'legal.r.s1Body':
    'The app charges no money, processes no payments, stores no payment card details, and contains no in-app purchases, subscriptions or “premium unlocks” at this time. Therefore no fees are payable and no refunds arise.',
  'legal.r.s2': '2. If a paid version is introduced later',
  'legal.r.s2Body1':
    'Should Cutepad ever become a paid product, (a) this policy will be updated and the new price clearly shown',
  'legal.r.before': 'before',
  'legal.r.s2Body2':
    'any payment, and (b) refunds for the paid period will be handled under the applicable platform rules (e.g. Google Play / Microsoft Store refund windows) or directly by us where the app is distributed outside a store — within 14 days of a valid request, no questions asked for digital goods where such cancellation right applies.',
  'legal.r.s3': '3. Third-party costs',
  'legal.r.s3Body':
    'If you choose optional paid third-party services (for example your own Supabase plan or AI-provider usage), those are contracts between you and that provider. Contact them for refunds of their charges — we never see or keep any part of that money.',
  'legal.r.s4': '4. How to reach us',
  'legal.r.reach': 'Purchase or refund questions:',
};

export const es: Dict = {
  'legal.back': '← volver a Cutepad',
  'legal.meta':
    'En vigor desde {effective} · {product} es operado por {operatedBy} ({country}). Consultas: {email}',
  'legal.navLabel': 'Páginas legales',
  'legal.navPrivacy': 'Privacidad',
  'legal.navTerms': 'Términos',
  'legal.navCookies': 'Cookies',
  'legal.navRefunds': 'Reembolsos',
  'legal.you': 'tú',
  'legal.your': 'tus',

  'legal.p.title': 'Política de privacidad',
  'legal.p.shortLabel': 'Versión corta:',
  'legal.p.shortBody1':
    'Cutepad es una app local-first. Tus notas, planificador, tareas, flashcards, estados de ánimo y ajustes permanecen en tu propio dispositivo. No ejecutamos',
  'legal.p.shortStrong': 'ninguna analítica, ningún rastreo, ninguna publicidad y ningún registro',
  'legal.p.shortBody2':
    ', y nada sale de tu dispositivo salvo que actives tú mismo una función opcional en la nube. Si activas la sincronización integrada, tus datos se guardan con un ID anónimo privado, solo de este dispositivo, en nuestro proyecto Firestore — nunca se crea una cuenta personal para ti.',
  'legal.p.s1': '1. Quiénes somos',
  'legal.p.who':
    '{product} es operado por {operatedBy}, {address}. Contacto y reclamaciones de datos: {email}.',
  'legal.p.s2': '2. Qué procesamos — y solo lo necesario',
  'legal.p.s2a': 'En tu dispositivo (siempre)',
  'legal.p.s2b': 'Solo si activas funciones opcionales',
  'legal.p.contentLabel': 'Tu contenido:',
  'legal.p.contentBody1':
    'notas, dibujos, bloques del planificador, tareas, mazos de flashcards, registros de ánimo, documentos, pegatinas/outfits y ajustes. Se guarda en el almacenamiento local de tu navegador con la clave',
  'legal.p.contentBody2': '. Esto es necesario para que la app funcione.',
  'legal.p.cfgLabel': 'Tu configuración opcional:',
  'legal.p.cfgBody1':
    'si activas la sincronización en la nube o IA propia, cualquier URL, clave y nombre que introduces se guardan localmente en tu dispositivo para que la app pueda hablar con',
  'legal.p.cfgBody2': ' servicios. La sincronización integrada no requiere nada — su configuración viene con la app.',
  'legal.p.backupLabel': 'Copias de seguridad de escritorio:',
  'legal.p.backupBody1': 'la app de escritorio escribe copias JSON locales en',
  'legal.p.backupBody2': 'en tu ordenador. Nada sale de tu equipo.',
  'legal.p.cloudLabel': 'Sincronización en la nube (Firestore integrado o tu proyecto Supabase):',
  'legal.p.cloudBody1': 'tus datos se envían al servicio en la nube que elegiste — el proyecto Firestore integrado de Cutepad (Google Cloud)',
  'legal.p.cloudBody2':
    'o el proyecto Supabase que configuraste. La sincronización integrada guarda un documento privado por dispositivo bajo un ID anónimo, protegido por reglas de seguridad; Google lo procesa como nuestro proveedor en la nube. Supabase autoalojado sigue bajo tu control — aplican los términos y la política de privacidad de tu proyecto.',
  'legal.p.pubLabel': 'Notas publicadas:',
  'legal.p.pubBody':
    'cuando pulsas “publicar”, el contenido de la nota llega a tu proyecto Supabase configurado y cualquiera con el enlace de compartir puede leerla.',
  'legal.p.buddyLabel': 'Compartir con compañero / grupo de estudio:',
  'legal.p.buddyBody':
    'solo el nombre visible y las estadísticas de estudio que decides compartir (minutos diarios, racha, totales) se envían a tu proyecto Supabase configurado y se muestran a quienes tienen el mismo código de par/grupo.',
  'legal.p.aiLabel': 'IA propia (bring-your-own AI):',
  'legal.p.aiBody1': 'el texto de notas que envías para resumir/flashcards llega al endpoint de IA que',
  'legal.p.aiBody2':
    'configuraste (p. ej. tu cuenta de OpenAI). El motor predeterminado funciona sin conexión en tu dispositivo y no envía nada a ninguna parte.',
  'legal.p.speechLabel': 'Funciones de voz:',
  'legal.p.speechBody':
    'la lectura en voz alta y la dictada usan el motor de voz de tu dispositivo. En algunos navegadores (notadamente Chrome) el reconocimiento de voz lo realiza el proveedor del navegador y el audio puede enviarse a ese proveedor — revisa la configuración de tu navegador si eso te importa. Cutepad en sí no envía nada.',
  'legal.p.s3': '3. Qué nunca recopilamos',
  'legal.p.never1': 'Sin cuentas, sin direcciones de correo, sin números de teléfono.',
  'legal.p.never2': 'Sin analítica, telemetría, reportes de fallos, píxeles ni huellas digitales.',
  'legal.p.never3':
    'Sin identificadores publicitarios y sin venta ni cesión de datos para anuncios — no tenemos tecnología publicitaria alguna.',
  'legal.p.never4a': 'Sin cookies (véase la',
  'legal.p.cookieLink': 'Política de cookies',
  'legal.p.never5':
    'Sin datos de ubicación, contactos ni acceso a tus archivos más allá de los documentos que importas explícitamente.',
  'legal.p.s4': '4. Base legal y la Ley DPDP de la India',
  'legal.p.dpdp':
    'Para usuarios en la India, Cutepad cumple la Digital Personal Data Protection Act, 2023 y las Digital Personal Data Protection Rules, 2025 (notificadas el 13 de noviembre de 2025, entrada en vigor por fases). Donde esas normas exigen consentimiento, lo pedimos con una casilla clara y específica antes de que ocurra la transmisión correspondiente (sincronización en la nube, publicación de una nota, compartir con compañero/grupo), indicamos el propósito y te permitimos retirarlo igual de fácil — desmarcar la casilla detiene ese tratamiento de inmediato.',
  'legal.p.purposeLabel': 'Limitación de finalidad y minimización:',
  'legal.p.purposeBody':
    'cada función opcional recopila solo lo que necesita (lo indicado arriba) y nada más.',
  'legal.p.storageLabel': 'Limitación de conservación:',
  'legal.p.storageBody':
    'no guardamos copias propias más allá de lo que tú decidas sincronizar. Los datos en tu dispositivo permanecen hasta que los borras — elimínalos cuando quieras con la configuración del navegador/sitio o con el “reiniciar todo” de la app. Si usas la sincronización integrada, un documento privado en nuestro proyecto Firestore persiste hasta que retires el consentimiento y lo borres allí; si usas la de Supabase, las filas de tu proyecto persisten hasta que las borres allí.',
  'legal.p.rightsLabel': 'Tus derechos:',
  'legal.p.rightsBody':
    'acceso, rectificación, supresión, retirada del consentimiento y nombramiento de otra persona para ejercer tus derechos. Como tus datos viven principalmente en tu propio dispositivo, la mayoría son autoservicio (editar/borrar en la app). Para cualquier otra cosa, escribe a {email} — buscamos responder dentro de los 90 días que permiten las normas.',
  'legal.p.childrenLabel': 'Menores:',
  'legal.p.childrenBody':
    'la app no está dirigida a menores de 18 años. Bajo la Ley DPDP, procesar los datos personales de un menor exige consentimiento parental verificable, así que los menores solo pueden usar Cutepad bajo la supervisión y el consentimiento de un padre o tutor.',
  'legal.p.crossLabel': 'Transferencia transfronteriza:',
  'legal.p.crossBody1': 'si activas la sincronización o IA propia, los datos fluyen al proveedor/región que',
  'legal.p.crossBody2':
    'elegiste — la sincronización integrada guarda los datos en las regiones de Google Cloud usadas por el proyecto Firebase de Cutepad y la de Supabase en la ubicación de tu proyecto. No controlamos ese destino.',
  'legal.p.breachLabel': 'Aviso de brecha:',
  'legal.p.breachBody':
    'si alguna vez conocemos una brecha que afecte a datos que poseemos (ninguno, por defecto — solo un documento privado por dispositivo si activaste la sincronización integrada), notificaremos a las personas afectadas y a la Junta de Protección de Datos de India sin demora, como exigen las normas.',
  'legal.p.s5': '5. Terceros',
  'legal.p.thirdBody1':
    'Ninguno por defecto. El sitio no carga scripts, fuentes, rastreadores ni incrustaciones externas — incluso las tipografías se sirven desde nuestros propios archivos. Los terceros solo aparecen cuando',
  'legal.p.thirdBody2':
    'los configuras: Google Firebase/Cloud Firestore (sincronización integrada), Supabase (sincronización/compartir opcional) y un endpoint de proveedor de IA (IA opcional). El sistema operativo de escritorio puede procesar la entrada de voz para dictado/TTS.',
  'legal.p.s6': '6. Seguridad',
  'legal.p.security':
    'El diseño local-first mantiene tus datos fuera de internet por defecto. La app incluye una Content-Security-Policy, sanea el HTML que se muestra en las páginas públicas compartidas y no incluye código remoto. Advertencia honesta: cualquier cosa guardada en el almacenamiento local de tu navegador es legible por quien tenga acceso a tu dispositivo o perfil, así que protege tu equipo (y tus claves de sincronización) en consecuencia.',
  'legal.p.s7': '7. Cambios y contacto',
  'legal.p.changes1':
    'Actualizaremos esta política si cambian las prácticas de datos de la app y revisaremos la fecha de vigencia indicada arriba. Contacto:',
  'legal.p.changes2': 'para cualquier pregunta de privacidad, queja o solicitud.',

  'legal.t.title': 'Términos y condiciones',
  'legal.t.intro':
    'Al usar {product} (“la app”) aceptas estos términos. Si no estás de acuerdo, no uses la app. La app la proporciona {operatedBy} ({address}, {country}) en {email}.',
  'legal.t.s1': '1. Elegibilidad',
  'legal.t.s1Body':
    'Debes tener 18 años o más, o usar la app bajo la supervisión y con el consentimiento de un padre o tutor. Bajo la Ley DPDP de la India, 2023, una persona menor de 18 años es un “niño” cuyos datos personales requieren consentimiento parental verificable.',
  'legal.t.s2': '2. El servicio',
  'legal.t.s2Body':
    'Cutepad es un compañero de notas y de estudio proporcionado tal cual, de forma gratuita y sin cuenta. Las funciones opcionales (sincronización en la nube, páginas publicadas, compartir con compañero/grupo, IA propia, voz) solo funcionan si las configuras y pueden retirarse en cualquier momento.',
  'legal.t.s3': '3. Tu contenido',
  'legal.t.c1': 'Conservas todos los derechos sobre las notas, dibujos, documentos y demás contenido que creas.',
  'legal.t.c2':
    'Eres responsable de tu contenido. No guardes ni publiques material que no tengas derecho a compartir — incluidos datos personales de otras personas, secretos o contenido que infrinja derechos de autor o sea ilegal.',
  'legal.t.c3':
    'Publicar una nota la hace pública para cualquiera con el enlace. Los códigos de par/grupo comparten las estadísticas que elijas con quien se lo des. Piénsalo antes de compartir.',
  'legal.t.s4': '4. Uso aceptable',
  'legal.t.s4Body':
    'No uses la app para violar leyes, infringir derechos, distribuir malware ni intentar atacar, rastrear o sobrecargar la app o cualquier servicio que conectes a ella. La ingeniería inversa se permite en la medida en que la ley aplicable lo permita (esta app es tu copia para inspeccionar y adaptar para uso personal).',
  'legal.t.s5': '5. Funciones opcionales de IA — no son asesoramiento profesional',
  'legal.t.s5Body1':
    'Los resúmenes, cuestionarios, flashcards y sugerencias de horario los generan heurísticas que corren en tu dispositivo o el proveedor de IA que',
  'legal.t.s5Body2':
    'configuraste. Pueden ser erróneas, incompletas o sesgadas. No los uses como asesoramiento médico, legal, académico-exámen u otro profesional — comprueba siempre la salida tú mismo.',
  'legal.t.s6': '6. Sin garantía',
  'legal.t.s6Body':
    'La app se proporcion “tal cual” y “según disponibilidad”, sin garantías de ningún tipo, expresas o implícitas, incluidos la idoneidad para un propósito particular, la exactitud y el funcionamiento ininterrumpido o libre de errores. Las herramientas de estudio (incluida la repetición espaciado y las rachas) son ayudas de productividad, no garantías de resultados.',
  'legal.t.s7': '7. Limitación de responsabilidad',
  'legal.t.s7Body':
    'En la máxima medida permitida por la ley aplicable, el operador no responde de daños indirectos, incidentales, especiales o consecuentes, ni de pérdida de datos, beneficios o buena voluntad derivada de tu uso de (o imposibilidad de usar) la app — incluida la pérdida de datos de tu dispositivo, de tu proyecto de sincronización o de tu propia configuración. Nada en estos términos limita la responsabilidad que no pueda limitarse según la ley aplicable.',
  'legal.t.s8': '8. Servicios de terceros que conectas',
  'legal.t.s8Body':
    'Google Firebase/Cloud Firestore (sincronización integrada), Supabase (sincronización/publicación), los proveedores de IA que configures y los servicios de voz de tu navegador/SO se rigen por sus propios términos y políticas de privacidad. Tú eres responsable de tus cuentas con ellos.',
  'legal.t.s9': '9. Derechos de autor',
  'legal.t.s9Body':
    'El código, el diseño visual, la mascota y los textos de la app son del operador o de sus licenciantes. Las tipografías incluidas (Fredoka, Nunito) están licenciadas bajo la SIL Open Font License 1.1 — puedes usarlas y redistribuirlas bajo esa licencia. Los emoji y patrones generados en la app son originales; las imágenes y documentos importados por el usuario siguen siendo tuyos.',
  'legal.t.s10': '10. Fin del uso',
  'legal.t.s10Body':
    'Puedes dejar de usar la app cuando quieras; borra los datos locales desde la configuración del navegador/dispositivo (o usa el reinicio de la app) y borra las filas de tu propio proyecto de sincronización. Podemos actualizar la app o estos términos; continuar usándolos tras una actualización significa que aceptas los términos revisados.',
  'legal.t.s11': '11. Ley aplicable',
  'legal.t.s11Body':
    'Estos términos se rigen por las leyes de la India, y las disputas se someten a la jurisdicción exclusiva de los tribunales de la India, sin perjuicio de los derechos de consumidor que te correspongan según la ley aplicable.',

  'legal.c.title': 'Política de cookies',
  'legal.c.shortStrong': 'Respuesta corta: Cutepad no usa cookies.',
  'legal.c.shortBody':
    'No hay banner de cookies en este sitio porque no hay nada que consentir — no configuramos cookies publicitarias, analíticas ni de ningún otro tipo no esencial.',
  'legal.c.s1': '1. Qué usamos en su lugar',
  'legal.c.body1': 'Tus notas y ajustes se guardan en el',
  'legal.c.ls': 'almacenamiento local',
  'legal.c.keyLabel': 'clave',
  'legal.c.body3':
    'de tu navegador, no en cookies. El almacenamiento local mantiene la app funcionando sin conexión y es estrictamente necesario para la funcionalidad principal — recordar tu contenido entre visitas. La app de escritorio además escribe archivos de copia local en tu propio ordenador.',
  'legal.c.s2': '2. Cookies que configuramos',
  'legal.c.s2Body1': 'Ninguna. Puedes comprobarlo tú mismo: no existe',
  'legal.c.s2Body2': 'en ninguna parte de la app.',
  'legal.c.s3': '3. Terceros',
  'legal.c.s3Body1':
    'Ninguno cargado por nosotros. Las tipografías son propias; no hay rastreadores, incrustaciones ni scripts de terceros. Si',
  'legal.c.s3Body2':
    'activas funciones opcionales, tus servicios configurados o integrados (p. ej. Google Firebase, Supabase) pueden procesar tus solicitudes bajo sus propias políticas — no configuran cookies a través de Cutepad.',
  'legal.c.s4': '4. Gestionar los datos almacenados',
  'legal.c.m1':
    'Sitio: ajustes del navegador → “Borrar datos de navegación” (o los ajustes del sitio para este origen) elimina el almacenamiento local y todos los datos de la app de forma permanente.',
  'legal.c.m2Body1': 'Escritorio: usa la acción “reiniciar todo” de la app y borra',
  'legal.c.m2Body2': 'si también quieres eliminar las copias de seguridad.',
  'legal.c.s5': '5. Cambios y contacto',
  'legal.c.changes':
    'Si alguna vez introducimos almacenamiento o cookies no esenciales, actualizaremos esta página y pediremos consentimiento antes de configurarlos. Preguntas: {email}.',

  'legal.r.title': 'Política de reembolsos',
  'legal.r.shortStrong': 'Respuesta corta: Cutepad es gratuito, así que no hay nada que reembolsar.',
  'legal.r.s1': '1. No se realizan compras en Cutepad',
  'legal.r.s1Body':
    'La app no cobra dinero, no procesa pagos, no guarda datos de tarjetas y no contiene compras internas, suscripciones ni “desbloqueos premium” en este momento. Por tanto, no se abonan cuotas y no surgen reembolsos.',
  'legal.r.s2': '2. Si más adelante se introduce una versión de pago',
  'legal.r.s2Body1':
    'Si Cutepad llega a ser un producto de pago, (a) esta política se actualizará y el nuevo precio se mostrará claramente',
  'legal.r.before': 'antes de',
  'legal.r.s2Body2':
    'cualquier pago, y (b) los reembolsos del período de pago se gestionarán según las normas de plataforma aplicables (p. ej. plazos de reembolso de Google Play / Microsoft Store) o directamente por nosotros cuando la app se distribuya fuera de una tienda — dentro de los 14 días de una solicitud válida, sin preguntas para bienes digitales cuando exista ese derecho de desistimiento.',
  'legal.r.s3': '3. Costes de terceros',
  'legal.r.s3Body':
    'Si eliges servicios de terceros de pago opcionales (por ejemplo tu propio plan de Supabase o el uso de un proveedor de IA), esos son contratos entre tú y ese proveedor. Contacta con ellos para los reembolsos de sus cargos — nosotros nunca vemos ni guardamos ninguna parte de ese dinero.',
  'legal.r.s4': '4. Cómo contactarnos',
  'legal.r.reach': 'Consultas de compra o reembolso:',
};

export const ja: Dict = {
  'legal.back': '← Cutepad に戻る',
  'legal.meta':
    '発効日 {effective} · {product} の運営: {operatedBy}（{country}）。連絡先: {email}',
  'legal.navLabel': '法的情報',
  'legal.navPrivacy': 'プライバシー',
  'legal.navTerms': '利用規約',
  'legal.navCookies': 'Cookie',
  'legal.navRefunds': '返金',
  'legal.you': 'あなた',
  'legal.your': 'あなたの',

  'legal.p.title': 'プライバシーポリシー',
  'legal.p.shortLabel': '要約:',
  'legal.p.shortBody1':
    'Cutepad はローカルファーストのアプリです。ノート・プランナー・タスク・フラッシュカード・気持ち・設定はすべてあなたのデバイスに残ります。私たちが行うのは',
  'legal.p.shortStrong': '解析・追跡・広告・登録手続きの一切なし',
  'legal.p.shortBody2':
    '、あなた自身が任意のクラウド機能を有効にするまでデータはどこにも送信されません。内蔵同期を有効にした場合、データは当方の Firestore プロジェクトに、この端末専用の非公開な匿名 ID で保存されます — 個人アカウントが作られることは決してありません。',
  'legal.p.s1': '1. 運営者について',
  'legal.p.who':
    '{product} の運営は {operatedBy}（{address}）。連絡先・苦情窓口: {email}。',
  'legal.p.s2': '2. 処理するデータ — 必要なものだけ',
  'legal.p.s2a': 'デバイス内（常に）',
  'legal.p.s2b': '任意機能を有効にした場合のみ',
  'legal.p.contentLabel': 'あなたのコンテンツ:',
  'legal.p.contentBody1':
    'ノート、イラスト、プランナーのブロック、タスク、フラッシュカードデッキ、気持ちの記録、ドキュメント、ステッカー／服装、設定。ブラウザのローカルストレージにキー',
  'legal.p.contentBody2':
    ' で保存されます。アプリの動作にはこれが必要です。',
  'legal.p.cfgLabel': '任意の設定情報:',
  'legal.p.cfgBody1':
    'クラウド同期や独自の AI を有効にすると、入力した URL・キー・名前はデバイスのローカルに保存され、アプリが通信してよいのは',
  'legal.p.cfgBody2': 'サービスだけです。内蔵同期は入力不要 — 設定はアプリに同梱されています。',
  'legal.p.backupLabel': 'デスクトップのバックアップ:',
  'legal.p.backupBody1': 'デスクトップアプリはローカルの JSON バックアップを',
  'legal.p.backupBody2': 'に書き込みます。マシンの外に出るものは何もありません。',
  'legal.p.cloudLabel': 'クラウド同期（内蔵の Firestore またはあなたの Supabase プロジェクト）:',
  'legal.p.cloudBody1': 'データは、あなたが選んだクラウドサービス — Cutepad 内蔵の Firestore プロジェクト（Google Cloud）',
  'legal.p.cloudBody2':
    'またはあなたが設定した Supabase プロジェクトに送信されます。内蔵同期はセキュリティルールで保護された匿名 ID ごとの非公開ドキュメントとして保存され、Google が当方のクラウドプロバイダーとして処理します。セルフホストの Supabase はあなたの管理下にあり、そのプロジェクトには Supabase の利用規約とプライバシーポリシーが適用されます。',
  'legal.p.pubLabel': '公開したノート:',
  'legal.p.pubBody':
    '「公開」を押すと、ノートの内容は設定済みの Supabase プロジェクトに送られ、共有リンクを知るすべての人が読める状態になります。',
  'legal.p.buddyLabel': 'ビディ／学習グループでの共有:',
  'legal.p.buddyBody':
    '共有するのは、あなたが選んだ表示名と学習統計（毎日の分数・連続記録・合計）だけで、設定済みの Supabase プロジェクトに送られ、同じペア／グループコードを持つ人に表示されます。',
  'legal.p.aiLabel': '独自の AI:',
  'legal.p.aiBody1':
    '要約やフラッシュカードのために送るノートのテキストは',
  'legal.p.aiBody2':
    'が設定した AI エンドポイントに届きます（例: あなたの OpenAI アカウント）。デフォルトのエンジンはデバイス上で完全にオフラインで動作し、どこにも何も送信しません。',
  'legal.p.speechLabel': '音声機能:',
  'legal.p.speechBody':
    '読み上げと音声入力はデバイスの音声エンジンを使います。一部のブラウザ（特に Chrome）では音声認識がブラウザ提供元で実処理され、音声が同社に送られる場合があります — それが気になる場合はブラウザの設定を確認してください。Cutepad 自体は何も送信しません。',
  'legal.p.s3': '3. 決して収集しないもの',
  'legal.p.never1': 'アカウント、メールアドレス、電話番号はありません。',
  'legal.p.never2': '解析・テレメトリー・クラッシュレポート・ピクセル・フィンガープリントはありません。',
  'legal.p.never3':
    '広告識別子も、広告目的のデータ売買・提供もありません — 広告技術を一切持ちません。',
  'legal.p.never4a': 'Cookie はありません（',
  'legal.p.cookieLink': 'Cookie ポリシー',
  'legal.p.never5':
    '位置情報、連絡先、明示的にインポートしたドキュメント以外のファイルへのアクセスもありません。',
  'legal.p.s4': '4. 法的根拠とインドの DPDP 法',
  'legal.p.dpdp':
    'インドの利用者に対し、Cutepad は Digital Personal Data Protection Act, 2023 および Digital Personal Data Protection Rules, 2025（2025年11月13日公示・段階施行）に従います。これらの規則が同意を要求する場合、関連する送信（クラウド同期、ノートの公開、ビディ／グループ共有）の前に明確で具体的なチェックボックスで同意を求め、目的を示し、同样に簡単に撤回できます — チェックを外すと該当処理は直ちに停止します。',
  'legal.p.purposeLabel': '目的制限と最小化:',
  'legal.p.purposeBody':
    '各任意機能は必要なもの（上記）だけを収集し、それ以上は収集しません。',
  'legal.p.storageLabel': '保存期間の制限:',
  'legal.p.storageBody':
    '当方は、あなたが同期することを選んだもの以外、コピーを保持しません。デバイス上のデータはあなたが削除するまで残ります — ブラウザ／サイト設定またはアプリの「すべてリセット」でいつでも消去できます。内蔵同期を使う場合、当方の Firestore プロジェクト内の非公開ドキュメント 1 件は、同意を撤回してそこで削除するまで残ります。Supabase 同期を使う場合、そのプロジェクトの行はあなたが削除するまで残ります。',
  'legal.p.rightsLabel': 'あなたの権利:',
  'legal.p.rightsBody':
    'アクセス、訂正、削除、同意の撤回、および他者を権利行使のために指名する権利。主たるデータはあなたのデバイスにあるため、多くはセルフサービス（アプリ内での編集／削除）で行使できます。それ以外は {email} までご連絡ください — 規則で認められた 90 日以内の回答を目指します。',
  'legal.p.childrenLabel': '子どもについて:',
  'legal.p.childrenBody':
    '本アプリは 18 歳未満の子どもを対象としていません。DPDP 法では、子どもの個人データの処理には検証可能な親の同意が必要です。未成年者は親または保護者の監督と同意のもとでのみ Cutepad を利用できます。',
  'legal.p.crossLabel': '越境移転:',
  'legal.p.crossBody1':
    '同期や独自の AI を有効にすると、データが届くのは',
  'legal.p.crossBody2':
    'が選んだ先です — 内蔵同期は Cutepad の Firebase プロジェクトが使う Google Cloud のリージョンに、Supabase 同期はあなたのプロジェクトの所在地に保存されます。その行き先を当方は管理しません。',
  'legal.p.breachLabel': '漏えい通知:',
  'legal.p.breachBody':
    '当方が保有するデータ（デフォルトではゼロ。内蔵同期を有効にした場合は端末ごとの非公開ドキュメント 1 件のみ）に関わる漏えいを知った場合、規則の定めにより、影響を受ける個人とインドデータ保護委員会に遅滞なく通知します。',
  'legal.p.s5': '5. サードパーティ',
  'legal.p.thirdBody1':
    'デフォルトでは何もありません。サイトは外部スクリプト・フォント・トラッカー・埋め込みを読み込まず、フォントさえ自前のファイルから配信しています。サードパーティが現れるのは',
  'legal.p.thirdBody2':
    'が設定したときだけです: Google Firebase/Cloud Firestore（内蔵同期）、Supabase（任意の同期／共有）と AI プロバイダーのエンドポイント（任意の AI）。デスクトップの OS が音声入力（入力・読み上げ）を処理する場合があります。',
  'legal.p.s6': '6. セキュリティ',
  'legal.p.security':
    'ローカルファースト設計により、データはデフォルトでインターネットに出ません。アプリは Content-Security-Policy を備え、公開共有ページの HTML をサニタイズし、リモートコードを含めません。正直な注意: ブラウザのローカルストレージに保存されたものは、デバイスやプロファイルにアクセスできる誰でも読めるため、マシン（と同期キー）を適切に守ってください。',
  'legal.p.s7': '7. 変更と連絡先',
  'legal.p.changes1':
    'アプリのデータ取扱いが変更された場合は本ポリシーを更新し、上記の発効日を改訂します。連絡先:',
  'legal.p.changes2': '（プライバシーに関する質問・苦情・請求はすべてこちらへ）。',

  'legal.t.title': '利用規約',
  'legal.t.intro':
    '{product}（以下「アプリ」）を利用することで、これらの条項に同意したものとみなされます。同意しない場合は利用しないでください。アプリの提供者は {operatedBy}（{address}、{country}）、連絡先 {email} です。',
  'legal.t.s1': '1. 利用資格',
  'legal.t.s1Body':
    '18 歳以上であること、または親または保護者の監督と同意のもとで利用する必要があります。インドの DPDP 法（2023）では 18 歳未満は「子ども」にあたり、その個人データには検証可能な親の同意が必要です。',
  'legal.t.s2': '2. サービスについて',
  'legal.t.s2Body':
    'Cutepad は、現状有姿で・無料で・アカウント不要のノート＆学習コンパニオンです。任意機能（クラウド同期、公開ページ、ビディ／グループ共有、独自 AI、音声）はあなたが設定した場合にのみ動作し、いつでも取り下げできます。',
  'legal.t.s3': '3. あなたのコンテンツ',
  'legal.t.c1':
    '作成したノート・イラスト・ドキュメントなどのコンテンツの権利はすべてあなたに帰属します。',
  'legal.t.c2':
    'あなたのコンテンツについて責任はあなたにあります。共有する権限のない素材 — 他人の個人データ、秘密、著作権侵害または違法なコンテンツ — を保存・公開しないでください。',
  'legal.t.c3':
    'ノートを公開すると、リンクを持つすべての人に公開されます。ビディ／グループコードは、選んだ統計をコードを渡す相手と共有します。共有する前によく考えてください。',
  'legal.t.s4': '4. 許容される利用',
  'legal.t.s4Body':
    '法律の違反、権利の侵害、マルウェアの配布、アプリや接続先サービスへの攻撃・スクレイピング・過負荷の試みに本アプリを使わないでください。リバースエンジニアリングは適用法が認める範囲で可能です（本アプリは個人利用のための自分のコピーとして検査・改変できます）。',
  'legal.t.s5': '5. 任意の AI 機能 — 専門的助言ではありません',
  'legal.t.s5Body1':
    '要約・クイズ・フラッシュカード・スケジュール提案は、デバイス上で動くヒューリスティック、または',
  'legal.t.s5Body2':
    'が設定した AI プロバイダーによって生成されます。誤り・不完全・偏りがあり得ます。医療・法律・受験などの専門的助言として頼らず、出力は必ず自分で確認してください。',
  'legal.t.s6': '6. 保証の否認',
  'legal.t.s6Body':
    'アプリは「現状のまま」「利用可能なまま」提供され、特定目的への適合性、正確性、中断のない・エラーのない動作を含め、明示または黙示を問わず一切の保証がありません。学習ツール（間隔反復や連続記録を含む）は生産性の補助であり、結果の保証ではありません。',
  'legal.t.s7': '7. 責任の制限',
  'legal.t.s7Body':
    '適用法が許す最大限の範囲で、運営者は、アプリの利用（または利用不能）から生じる間接的・付随的・特別・結果的な損害、データ・利益・信用の喪失（デバイス、同期プロジェクト、あなた自身の設定からのデータ損失を含む）について責任を負いません。適用法により制限できない責任を、本条項で制限するものではありません。',
  'legal.t.s8': '8. 接続するサードパーティサービス',
  'legal.t.s8Body':
    'Google Firebase/Cloud Firestore（内蔵同期）、Supabase（同期／公開）、あなたが設定する AI プロバイダー、ブラウザ／OS の音声サービスは、それぞれの利用規約とプライバシーポリシーに従います。それらとのアカウントはあなたの責任です。',
  'legal.t.s9': '9. 著作権',
  'legal.t.s9Body':
    'アプリのコード、ビジュアルデザイン、マスコットのアート、テキストは運営者またはライセンサーに帰属します。同梱フォント（Fredoka、Nunito）は SIL Open Font License 1.1 の下でライセンスされており、このライセンスの範囲で使用・再配布できます。アプリ内の絵文字や生成パターンはオリジナルです。ユーザーがインポートした画像・ドキュメントはあなたのものです。',
  'legal.t.s10': '10. 利用の終了',
  'legal.t.s10Body':
    'いつでも利用を止められます。ブラウザ／デバイス設定（またはアプリのリセット）でローカルデータを削除し、自分の同期プロジェクトの行も削除してください。アプリまたは本条項を更新することがあります。更新後の継続利用は、改訂された条項に同意したものとみなされます。',
  'legal.t.s11': '11. 準拠法',
  'legal.t.s11Body':
    '本条項にはインド法が適用され、紛争はインド法院の専属的管轄に服します。ただし、適用法上の消費者の権利は害されません。',

  'legal.c.title': 'Cookie ポリシー',
  'legal.c.shortStrong': '短い答え: Cutepad は Cookie を使いません。',
  'legal.c.shortBody':
    '同意すべきものが何もないため、このサイトに Cookie バナーはありません — 広告・解析その他すべての非必須 Cookie を設定しません。',
  'legal.c.s1': '1. 代わりに使うもの',
  'legal.c.body1': 'ノートと設定はブラウザの',
  'legal.c.ls': 'ローカルストレージ',
  'legal.c.keyLabel': 'キー',
  'legal.c.body3':
    'に保存され、Cookie には使いません。ローカルストレージはオフラインでもアプリを動かすために不可欠で、コア機能（訪問間のコンテンツの記憶）に厳密に必要です。デスクトップアプリはさらに、自分のマシンにローカルのバックアップファイルを書き込みます。',
  'legal.c.s2': '2. 設定する Cookie',
  'legal.c.s2Body1': 'ありません。自分で確認できます。アプリ内のどこにも',
  'legal.c.s2Body2': 'の使用はありません。',
  'legal.c.s3': '3. サードパーティ',
  'legal.c.s3Body1':
    '当方が読み込むものは一切ありません。フォントは自前ホストで、トラッカー・埋め込み・サードパーティスクリプトはありません。もし',
  'legal.c.s3Body2':
    'が任意機能を有効にした場合、設定済みまたは内蔵のサービス（例: Google Firebase、Supabase）が独自の方針のもとでリクエストを処理することがありますが、Cutepad 経由で Cookie を設定することはありません。',
  'legal.c.s4': '4. 保存データの管理',
  'legal.c.m1':
    'サイト: ブラウザ設定 →「閲覧データのクリア」（またはこの origin のサイト設定）でローカルストレージとアプリデータを完全に削除できます。',
  'legal.c.m2Body1': 'デスクトップ: アプリの「すべてリセット」を使い、バックアップも消したい場合は',
  'legal.c.m2Body2': 'も削除してください。',
  'legal.c.s5': '5. 変更と連絡先',
  'legal.c.changes':
    '今後、非必須のストレージや Cookie を導入する場合は、このページを更新し、設定前に同意を求めます。質問: {email}。',

  'legal.r.title': '返金ポリシー',
  'legal.r.shortStrong': '短い答え: Cutepad は現在無料なので、返金すべきものがありません。',
  'legal.r.s1': '1. Cutepad での購入はありません',
  'legal.r.s1Body':
    'アプリは料金を請求せず、決済を処理せず、カード情報を保存せず、現時点でアプリ内課金・サブスクリプション・「プレミアム解放」もありません。したがって、発生する料金がなく、返金も発生しません。',
  'legal.r.s2': '2. 将来有料版が導入された場合',
  'legal.r.s2Body1':
    'Cutepad が有料製品になった場合、(a) 本ポリシーを更新し、新価格を',
  'legal.r.before': 'お支払いの前',
  'legal.r.s2Body2':
    'に明示します。(b) 有料期間の返金は、適用されるプラットフォーム規則（例: Google Play / Microsoft Store の返金期間）に従い、ストア外配布の場合は当方が直接、正当な請求から 14 日以内に処理します（デジタル商品で撤回権が認められる場合は理由を問いません）。',
  'legal.r.s3': '3. サードパーティの費用',
  'legal.r.s3Body':
    '任意の有料サードパーティサービス（例: あなたの Supabase プランや AI プロバイダーの利用料）を選んだ場合、それはあなたとそのプロバイダーとの契約です。料金の返金はそのプロバイダーに連絡してください — 当方がその金額の一部を見ることも保持することもありません。',
  'legal.r.s4': '4. 連絡方法',
  'legal.r.reach': '購入・返金に関する質問:',
};
