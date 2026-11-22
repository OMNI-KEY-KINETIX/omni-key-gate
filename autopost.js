// OMNI-KEY autopilot: публичный Telegram-канал, 2 поста в день (проект + новости), бесплатно.
// Запускается из Cloudflare Cron (раз в час). Каждый слот публикуется не чаще 1 раза в сутки.
// Выключатель: переменная AUTOPOST=off (Cloudflare -> Settings -> Variables). Без неё работает.

const CHANNEL = "@OMNIKEYKIIX";
const SITE = "https://omnikeykiix.com";
const SLOTS = [
  { id: "project", hour: 7, until: 18 },   // 07:00 UTC = 09:00/10:00 Киев
  { id: "news", hour: 11, until: 21 },     // 11:00 UTC = 13:00/14:00 Киев
];
const RPCS = ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io"];
const A = {
  KIIX: "0xaF82A50c0aC9CfF8c7F39da9Ff998921DB68bC94",
  STAKING: "0x49c6a95A95453143b0161437aAbc43db2383771C",
  GATEPASS: "0x289E3BD13a0d5919eAb7D063930027287937B7aD",
  PAIR: "0x313E697825fFB6145e8a2733Cf7c53c2C7CD0837",
  PINKLOCK: "0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE",
  VESTING: "0xF68216333a63d34f7323FECeb0A376C1fA1E2d34",
};
const SEL = { totalSupply: "0x18160ddd", balanceOf: "0x70a08231", totalStaked: "0x817b1cd2", minted: "0x7dc0bf3f", maxSupply: "0x869f7594" };
const FEEDS = [
  ["CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"],
  ["Cointelegraph", "https://cointelegraph.com/rss"],
  ["Decrypt", "https://decrypt.co/feed"],
  ["The Block", "https://www.theblock.co/rss.xml"],
  ["Chainalysis", "https://blog.chainalysis.com/feed/"],
];
const GOOD = ["bnb", "binance", "bsc", "pancakeswap", "security", "hack", "exploit", "audit", "regulat", "mica", "sec ", "stablecoin", "tether", "usdt", "circle", "ethereum", "bitcoin", "defi", "etf", "wallet", "upgrade", "chainlink", "custody", "phishing", "scam", "law", "bank"];
const BAD = ["price prediction", "price analysis", "to the moon", "100x", "1000x", "airdrop", "giveaway", "buy now", "presale", "pump", "could hit", "analyst predicts", "sponsored", "press release", "how to get rich", "next bitcoin", "best crypto to buy", "memecoin", "meme coin", "could soar", "set to explode"];
const TAIL = "NFA, DYOR.";

// ---------- банки текстов (EN + RU). Без обещаний дохода. ----------
const LEARN = [
  "🔒 Liquidity lock, in plain words\nLiquidity is the money in the trading pool. If a team can pull it out, buyers can be left with nothing. A lock puts the pool receipt (LP tokens) inside a contract until a set date. KIIX: the LP is locked in PinkLock until 1 Oct 2027. Check: " + SITE + "/#timeline\n\n🔒 Блокировка ликвидности простыми словами\nЛиквидность - это деньги в пуле для торговли. Если команда может их забрать, покупатели остаются ни с чем. Блокировка кладёт «квитанцию» пула (LP-токены) в контракт до заданной даты. KIIX: LP заперт в PinkLock до 01.10.2027. Проверка: " + SITE + "/#timeline",
  "📜 Vesting and cliff\nVesting releases tokens slowly instead of all at once. A cliff is a waiting period before the first release. Team tokens (200,000,000 KIIX) sit in a vesting contract: nothing before 6 Feb 2027, then a steady daily release until 5 Feb 2029. Anyone can read it on-chain.\n\n📜 Вестинг и клифф\nВестинг выдаёт токены постепенно, а не разом. Клифф - период ожидания до первой выдачи. Токены команды (200 000 000 KIIX) лежат в контракте вестинга: до 06.02.2027 ничего, затем ежедневная равномерная выдача до 05.02.2029. Любой может проверить в блокчейне.",
  "🧬 \"No mint, no owner\" - what it means\nMint is the power to create new tokens. Owner is an address that can change the rules. KIIX has a fixed supply of 1,000,000,000 and no mint function. Fewer hidden levers means fewer ways to surprise holders. Verify the contract on BscScan.\n\n🧬 «Нет mint, нет owner» - что это значит\nMint - возможность создавать новые токены. Owner - адрес, который может менять правила. У KIIX фиксированная эмиссия 1 000 000 000 и нет функции mint. Меньше скрытых рычагов - меньше неожиданностей для держателей. Проверьте контракт на BscScan.",
  "🎫 What is a Gate Pass?\nAn NFT pass with 4 levels: Alpha, Beta, Gamma, Omega (limited supply: 10,000 / 2,500 / 500 / 100). It opens private community access and future features. It does not pay staking income. Details and live availability: " + SITE + "/#sectors\n\n🎫 Что такое Gate Pass?\nNFT-пасс с 4 уровнями: Alpha, Beta, Gamma, Omega (ограниченный тираж: 10 000 / 2 500 / 500 / 100). Даёт доступ в закрытое сообщество и будущие функции. Доход от стейкинга пасс не приносит. Детали и наличие: " + SITE + "/#sectors",
  "⚡ Staking tiers: Spark, Impulse, Plasma, Supernova\nThe longer you lock KIIX, the higher the tier and the weight in the pool. Rewards come from a pool funded in advance, not from new buyers. The rules live in the contract, not in a promise. Read them before you decide: " + SITE + "/#core\n\n⚡ Уровни стейкинга: Spark, Impulse, Plasma, Supernova\nЧем дольше блокируете KIIX, тем выше уровень и вес в пуле. Награды идут из заранее наполненного пула, а не от новых покупателей. Правила записаны в контракте, а не в обещании. Прочитайте их до решения: " + SITE + "/#core",
  "✅ What does \"verified contract\" mean?\nOn BscScan you can read the real source code of a contract, not just its bytecode. Verified code lets anyone (and security scanners) check what the contract can and cannot do. All OMNI-KEY contracts are verified. Addresses: " + SITE + "\n\n✅ Что значит «верифицированный контракт»?\nНа BscScan можно прочитать реальный исходный код контракта, а не только байткод. Верификация позволяет любому (и сканерам безопасности) проверить, что контракт умеет и чего не умеет. Все контракты OMNI-KEY верифицированы. Адреса: " + SITE,
  "🪐 Small numbers, shown openly\nThe KIIX pool is young and small. Small pools move a lot on a single trade and can be volatile. We do not hide that. We publish live numbers and lock what we can. Do your own research and never risk money you cannot lose.\n\n🪐 Маленькие цифры - открыто\nПул KIIX молодой и небольшой. В малых пулах одна сделка сильно двигает цену, возможна высокая волатильность. Мы этого не скрываем: публикуем живые цифры и запираем то, что можно запереть. Проводите своё исследование и не рискуйте деньгами, которые не можете потерять.",
  "⛽ What is gas on BNB Chain?\nEvery on-chain action costs a small fee in BNB, called gas. Keep a little BNB in your wallet, otherwise you cannot send tokens or sign transactions. Messages that only prove wallet ownership (like our Alpha access signature) cost no gas.\n\n⛽ Что такое газ в BNB Chain?\nЛюбое действие в блокчейне стоит небольшую комиссию в BNB - газ. Держите немного BNB на кошельке, иначе нельзя отправлять токены и подтверждать транзакции. Сообщения, которые только доказывают владение кошельком (как подпись для доступа в Alpha), газ не требуют.",
  "🧾 What are LP tokens?\nWhen someone adds liquidity to a pool, they receive LP tokens as a receipt for their share. Whoever holds the LP can withdraw that share. That is why where the LP sits matters: in a wallet or locked in a contract. See where KIIX LP sits: " + SITE + "/#pulse\n\n🧾 Что такое LP-токены?\nКто добавляет ликвидность в пул, получает LP-токены как квитанцию на свою долю. Кто держит LP, тот может забрать долю. Поэтому важно, где лежит LP: в кошельке или заперт в контракте. Где лежит LP у KIIX: " + SITE + "/#pulse",
  "🧮 Rewards in epochs, checkable by anyone\nThe OmniRewards program works in periods. Each period's list of shares is published as a cryptographic fingerprint (Merkle root), and each participant proves their own part when claiming. Nobody has to trust a spreadsheet. Details: " + SITE + "/#rewards\n\n🧮 Награды периодами, проверяемые любым\nПрограмма OmniRewards работает периодами. Список долей каждого периода публикуется как криптографический отпечаток (корень Меркла), а участник доказывает свою часть при получении. Верить таблице на слово не нужно. Подробности: " + SITE + "/#rewards",
];
const SECURITY = [
  "🛡 Rule #1\nNobody real will ever ask for your seed phrase or private key: not admins, not support, not us. If someone asks, it is a scam. Always.\n\n🛡 Правило №1\nНикто настоящий никогда не попросит вашу seed-фразу или приватный ключ: ни админы, ни поддержка, ни мы. Если просят - это мошенники. Всегда.",
  "🎣 Fake support in DMs\nIf a stranger DMs you first about \"your problem\", \"verification\" or \"a bonus\", it is a scammer. Real admins never write first. Block and report.\n\n🎣 Фейковая поддержка в личке\nЕсли незнакомец пишет первым про «вашу проблему», «верификацию» или «бонус» - это мошенник. Настоящие админы первыми не пишут. Блокируйте и жалуйтесь.",
  "🔖 Bookmark the official site\nPhishing sites copy real ones. Open OMNI-KEY only from the link in this channel or your own bookmark: " + SITE + "  Do not trust links from ads, DMs or replies.\n\n🔖 Добавьте официальный сайт в закладки\nФишинговые сайты копируют настоящие. Открывайте OMNI-KEY только по ссылке из этого канала или из своей закладки: " + SITE + "  Не доверяйте ссылкам из рекламы, личных сообщений и комментариев.",
  "🔍 Check the contract address\nBefore any swap or approval, compare the token address with the one on the official site. Copycat tokens with the same name exist. KIIX official address is listed at " + SITE + "\n\n🔍 Проверяйте адрес контракта\nПеред обменом или разрешением сравните адрес токена с адресом на официальном сайте. Токены-двойники с тем же именем существуют. Официальный адрес KIIX указан на " + SITE,
  "🧹 Revoke old approvals\nEvery time you approve a token, you give a contract permission to spend it. Review and revoke old approvals on revoke.cash or the BscScan token approval checker. Fewer open permissions, fewer risks.\n\n🧹 Отзывайте старые разрешения\nКаждый approve даёт контракту право тратить ваш токен. Проверяйте и отзывайте старые разрешения на revoke.cash или в инструменте Token Approvals на BscScan. Меньше открытых разрешений - меньше рисков.",
  "🎁 \"Claim your airdrop\" traps\nA site that asks you to connect a wallet and sign something to \"claim\" free tokens is a classic drain trick. We do not run surprise airdrops. If you are unsure, do not sign. Read what MetaMask shows before you confirm.\n\n🎁 Ловушки «заберите аирдроп»\nСайт, который просит подключить кошелёк и что-то подписать, чтобы «получить» бесплатные токены - классическая схема кражи. Мы не проводим внезапных аирдропов. Сомневаетесь - не подписывайте. Читайте, что показывает MetaMask, прежде чем подтверждать.",
  "💸 Test with a small amount\nBefore sending a large sum to a new address or app, send a small test amount first and confirm it arrived. A few cents of fees can save a lot.\n\n💸 Сначала тест на малой сумме\nПрежде чем отправлять большую сумму на новый адрес или в приложение, отправьте маленькую тестовую и убедитесь, что она дошла. Несколько центов комиссии могут сберечь многое.",
  "🔐 2FA: use an app, not SMS\nTurn on two-factor authentication on your email, X, Telegram and exchange accounts. Prefer an authenticator app over SMS (SIM swap attacks exist). Store backup codes offline.\n\n🔐 2FA: приложение, а не SMS\nВключите двухфакторную защиту на почте, X, Telegram и биржах. Лучше приложение-аутентификатор, чем SMS (бывает подмена SIM). Резервные коды храните офлайн.",
  "🧊 Hardware wallets\nFor larger amounts, a hardware wallet keeps keys offline, so malware on your phone or computer cannot sign for you. Buy only from the maker or an official reseller, never from a stranger. Write your recovery phrase on paper, never in a photo or cloud.\n\n🧊 Аппаратные кошельки\nДля крупных сумм аппаратный кошелёк хранит ключи офлайн, и вредоносная программа на телефоне или компьютере не сможет подписать за вас. Покупайте только у производителя или официального реселлера, не у случайных людей. Фразу восстановления записывайте на бумаге, не в фото и не в облако.",
  "👀 Read before you sign\nA transaction you sign can do more than the button says. If a wallet warns about a dangerous site or an unlimited approval, stop and ask in the chat. A minute of doubt beats a lost wallet.\n\n👀 Читайте перед подписью\nПодписываемая транзакция может делать больше, чем написано на кнопке. Если кошелёк предупреждает об опасном сайте или неограниченном разрешении - остановитесь и спросите в чате. Минута сомнений лучше потерянного кошелька.",
];
const LORE = [
  "🌌 Chronicle I - The Silent Artifact\nIn a universe full of noise, one object stayed silent. It was not built; it was gathered from particles: atoms of Web3, quanta of smart contracts, sparks of NFT. Its name: OMNI-KEY.\n\n🌌 Хроника I - Молчаливый Артефакт\nВо вселенной, полной шума, молчал один предмет. Его не создавали - он собирался из частиц: атомов Web3, квантов смарт-контрактов, искр NFT. Имя ему: OMNI-KEY.",
  "⚡ Chronicle II - Particle #1\nOne day the first particle flared: KIIX. The name KINETIX means motion: the speed at which an idea becomes work. The Artifact never asks for blind faith. It shows its work.\n\n⚡ Хроника II - Частица №1\nОднажды вспыхнула первая частица: KIIX. Имя KINETIX значит движение: скорость, с которой идея становится делом. Артефакт не просит веры вслепую. Он показывает работу.",
  "🔒 Chronicle III - The Sealed Orbit\nThe Artifact sealed its orbit until October 2027, so no hand could pull it out of the sky. Not a promise written in dust, but a lock written in code.\n\n🔒 Хроника III - Запечатанная Орбита\nАртефакт запечатал свою орбиту до октября 2027, чтобы ни одна рука не вытянула её с неба. Не обещание на песке, а замок, записанный в коде.",
  "🔥 Chronicle IV - Four Steps of Light\nSpark. Impulse. Plasma. Supernova. Four steps of the signal. The longer a particle holds its line, the brighter it shines.\n\n🔥 Хроника IV - Четыре Ступени Света\nИскра. Импульс. Плазма. Сверхновая. Четыре ступени сигнала. Чем дольше частица держит линию, тем ярче она светит.",
  "🗝 Chronicle V - The Gates\nBeyond the orbit lie gates: Alpha, Beta, Gamma, Omega. Each pass is a key to a deeper hall of the Artifact. Few in number, written on-chain, impossible to forge.\n\n🗝 Хроника V - Врата\nЗа орбитой лежат врата: Alpha, Beta, Gamma, Omega. Каждый пасс - ключ к более глубокому залу Артефакта. Их мало, они записаны в цепи, подделать нельзя.",
  "⏳ Chronicle VI - The Long Hourglass\nThe founders gave their own share to an hourglass. Nothing flows until February 2027; after that, sand falls evenly until February 2029. The Artifact does not hurry. It accelerates.\n\n⏳ Хроника VI - Длинные Песочные Часы\nСоздатели отдали собственную долю песочным часам. До февраля 2027 ничего не течёт; потом песок падает равномерно до февраля 2029. Артефакт не торопится. Он ускоряется.",
  "👁 Chronicle VII - The Open Eye\nThe Artifact keeps one eye open: a live page where every number can be checked on-chain. It does not ask to be trusted. It asks to be verified.\n\n👁 Хроника VII - Открытое Око\nУ Артефакта одно око всегда открыто: живая страница, где каждое число проверяется в цепи. Он не просит доверия. Он просит проверки.",
  "🧬 Chronicle VIII - The Fixed Sky\nNo new stars can be forged. One billion particles, no mint, no master. The sky of KIIX is fixed, and everything that happens in it is visible.\n\n🧬 Хроника VIII - Неподвижное Небо\nНовые звёзды выковать нельзя. Миллиард частиц, нет mint, нет хозяина. Небо KIIX неизменно, и всё, что в нём происходит, видно.",
  "🛰 Chronicle IX - The Archive\nThere is an older fragment, the Genesis: an archive, not for trading, kept as a memory of the first spark. Only the true KIIX moves in the current orbit.\n\n🛰 Хроника IX - Архив\nЕсть более древний фрагмент - Genesis: архив, не для торговли, память о первой искре. В текущей орбите движется только настоящий KIIX.",
  "🌠 Chronicle X - Today a Particle, Tomorrow a Constellation\nThe Artifact grows one particle at a time. We build in public, ship in small steps, and keep our word in code. Join the signal.\n\n🌠 Хроника X - Сегодня частица, завтра созвездие\nАртефакт растёт по одной частице. Мы строим открыто, делаем маленькими шагами и держим слово в коде. Присоединяйтесь к сигналу.",
];
const VERIFY = [
  "🔎 Verify in 60 seconds #1: the token\nOpen the KIIX contract on BscScan (address on " + SITE + "). Check: supply 1,000,000,000, code verified, no mint function. If anything differs from what we say, tell us.\n\n🔎 Проверка за 60 секунд №1: токен\nОткройте контракт KIIX на BscScan (адрес на " + SITE + "). Проверьте: эмиссия 1 000 000 000, код верифицирован, функции mint нет. Если что-то не совпадает с нашими словами - напишите нам.",
  "🔎 Verify in 60 seconds #2: the lock\nOpen the PinkLock record 2096113 (link on the site). It shows the locked LP and the unlock date: 1 Oct 2027.\n\n🔎 Проверка за 60 секунд №2: замок\nОткройте запись PinkLock 2096113 (ссылка на сайте). Там видны запертый LP и дата разблокировки: 01.10.2027.",
  "🔎 Verify in 60 seconds #3: vesting\nOpen the KiixVesting contract (address on the site). Read start, cliff and released(). Released shows how much the team has taken so far. You do not have to trust us, just read it.\n\n🔎 Проверка за 60 секунд №3: вестинг\nОткройте контракт KiixVesting (адрес на сайте). Прочитайте start, cliff и released(). Released показывает, сколько команда уже забрала. Верить на слово не нужно, просто прочитайте.",
  "🔎 Verify in 60 seconds #4: the site\nOur site files have public fingerprints (SHA-256) in the open repository github.com/omni-key-kinetix/OMNI-KEY. Compare them with what you receive. Open source is the point.\n\n🔎 Проверка за 60 секунд №4: сайт\nУ файлов нашего сайта есть публичные отпечатки (SHA-256) в открытом репозитории github.com/omni-key-kinetix/OMNI-KEY. Сравните их с тем, что получаете. Открытый код - суть.",
  "🔎 Verify in 60 seconds #5: the team wallet\nThe team wallet address is public: 0x7438Cd5d156613a9e4F586494893D667C688B01e. Watch it on BscScan any time. Movements are visible to everyone.\n\n🔎 Проверка за 60 секунд №5: кошелёк команды\nАдрес кошелька команды публичный: 0x7438Cd5d156613a9e4F586494893D667C688B01e. Следите за ним на BscScan в любой момент. Движения видны всем.",
  "🔎 Verify in 60 seconds #6: the pass\nOpen the GatePass contract on BscScan (address on the site) and read minted(0..3) and maxSupply(0..3). The supply limits are on-chain, not a marketing line.\n\n🔎 Проверка за 60 секунд №6: пасс\nОткройте контракт GatePass на BscScan (адрес на сайте) и прочитайте minted(0..3) и maxSupply(0..3). Лимиты тиража записаны в цепи, а не в рекламе.",
];

// ---------- утилиты ----------
const pad = (a) => a.toLowerCase().replace("0x", "").padStart(64, "0");
async function rpc(to, data) {
  let last;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
      const j = await r.json();
      if (j.result && j.result !== "0x") return BigInt(j.result.slice(0, 66));
      last = new Error("rpc_empty");
    } catch (e) { last = e; }
  }
  throw last || new Error("rpc_failed");
}
const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const e18 = (b) => Number(b / 10n ** 14n) / 1e4;
const iso = (d) => Math.floor(Date.parse(d + "T00:00:00Z") / 1000);
const daysLeft = (ts, now) => Math.ceil((ts - now) / 86400);

async function pickFromBank(env, name, bank) {
  const raw = await env.GATE_KV.get("ap:idx:" + name);
  const i = (parseInt(raw || "0", 10) || 0) % bank.length;
  return { text: bank[i] + "\n\n#OMNIKEY #KIIX " + TAIL, commit: () => env.GATE_KV.put("ap:idx:" + name, String(i + 1)) };
}

async function pulsePost() {
  const [lpTotal, lpLocked, staked, vested, m0, m1, m2, m3, x0, x1, x2, x3] = await Promise.all([
    rpc(A.PAIR, SEL.totalSupply),
    rpc(A.PAIR, SEL.balanceOf + pad(A.PINKLOCK)),
    rpc(A.STAKING, SEL.totalStaked),
    rpc(A.KIIX, SEL.balanceOf + pad(A.VESTING)),
    ...[0, 1, 2, 3].map((i) => rpc(A.GATEPASS, SEL.minted + i.toString(16).padStart(64, "0"))),
    ...[0, 1, 2, 3].map((i) => rpc(A.GATEPASS, SEL.maxSupply + i.toString(16).padStart(64, "0"))),
  ]);
  const lockedPct = Number((lpLocked * 10000n) / lpTotal) / 100;
  const mint = [m0, m1, m2, m3].map(Number), cap = [x0, x1, x2, x3].map(Number);
  const names = ["Alpha", "Beta", "Gamma", "Omega"];
  const passes = names.map((n, i) => n + " " + mint[i] + "/" + cap[i]).join("  ");
  return "📡 Weekly pulse (live from the chain)\n• LP locked in PinkLock: " + lockedPct.toFixed(2) + "% (until 1 Oct 2027)\n• Team vesting contract holds: " + fmt(e18(vested)) + " KIIX\n• Staked KIIX: " + fmt(e18(staked)) + "\n• Gate Pass minted: " + passes + "\n\nEvery number can be checked: " + SITE + "/#pulse\n\n📡 Пульс недели (из блокчейна)\n• LP заперт в PinkLock: " + lockedPct.toFixed(2) + "% (до 01.10.2027)\n• В контракте вестинга команды: " + fmt(e18(vested)) + " KIIX\n• В стейкинге: " + fmt(e18(staked)) + " KIIX\n• Gate Pass выпущено: " + passes + "\n\nКаждое число можно проверить: " + SITE + "/#pulse\n\n#OMNIKEY #KIIX " + TAIL;
}

function countdownPost(now) {
  const start = 1794181800, cliff = start + 7776000, end = cliff + 63072000;
  const ev = [
    ["First team vesting unlock / Первый разблок вестинга команды", cliff],
    ["Liquidity lock ends / Конец блокировки ликвидности", iso("2027-10-01")],
    ["Team vesting fully released / Вестинг команды выплачен", end],
  ].filter((e) => e[1] > now).map((e) => "• " + e[0] + ": " + daysLeft(e[1], now) + " d / дн.");
  if (!ev.length) return null;
  return "⏱ Calendar of the Artifact\nDates written into the contracts:\n" + ev.join("\n") + "\n\nCalendar: " + SITE + "/#timeline\nWe will announce any decision about the lock at least 30 days before the date.\nРешение по блокировке объявим не позднее чем за 30 дней до даты.\n\n#OMNIKEY #KIIX " + TAIL;
}

async function projectPost(env, now) {
  const dow = new Date(now * 1000).getUTCDay(); // 0=Sun
  const fallback = () => pickFromBank(env, "learn", LEARN);
  try {
    if (dow === 1) return { text: await pulsePost(), commit: async () => {} };
    if (dow === 3) { const t = countdownPost(now); if (t) return { text: t, commit: async () => {} }; }
    if (dow === 5) return { text: await pulsePost(), commit: async () => {} };
  } catch (e) { return fallback(); }
  if (dow === 2) return pickFromBank(env, "learn", LEARN);
  if (dow === 4) return pickFromBank(env, "security", SECURITY);
  if (dow === 6) return pickFromBank(env, "lore", LORE);
  if (dow === 0) return pickFromBank(env, "verify", VERIFY);
  return fallback();
}

// ---------- новости (RSS) ----------
const unesc = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, "'").replace(/&#8211;|&#8212;/g, "-").trim();
function parseItems(xml, source, limit = 12) {
  const out = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml)) && out.length < limit) {
    const b = m[1];
    const t = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
    const l = (b.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1];
    const d = (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1];
    if (!t || !l) continue;
    const title = unesc(t).replace(/\s+/g, " "), link = unesc(l);
    const ts = d ? Math.floor(Date.parse(unesc(d)) / 1000) : 0;
    if (!/^https:\/\/[^\s]+$/.test(link) || link.length > 300) continue;
    try { if (new URL(link).pathname.length < 12) continue; } catch { continue; }  // не главная страница и не рассылка
    out.push({ title, link, ts, source });
  }
  return out;
}
function score(it, now) {
  const t = it.title.toLowerCase();
  if (BAD.some((w) => t.includes(w))) return -1;
  if (it.title.length < 25 || it.title.length > 200) return -1;
  if (!it.ts || now - it.ts > 40 * 3600 || it.ts - now > 3600) return -1;
  let s = 0;
  for (const w of GOOD) if (t.includes(w)) s += 2;
  s += Math.max(0, 6 - (now - it.ts) / 3600 / 6);
  return s;
}
async function newsPost(env, now) {
  const all = [];
  await Promise.all(FEEDS.map(async ([name, url]) => {
    try {
      const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 OMNI-KEY-digest" }, cf: { cacheTtl: 600 } });
      if (!r.ok) return;
      const x = (await r.text()).slice(0, 45000);
      all.push(...parseItems(x, name));
    } catch {}
  }));
  const ranked = all.map((it) => ({ it, s: score(it, now) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s);
  for (const { it } of ranked.slice(0, 15)) {
    const key = "n:" + it.link.slice(0, 200);
    if (await env.GATE_KV.get(key)) continue;
    const text = "📰 Crypto news\n\n" + it.title + "\n" + it.link + "\n\nvia " + it.source + ". Automated digest, not our opinion. " + TAIL;
    return { text, commit: () => env.GATE_KV.put(key, "1", { expirationTtl: 14 * 86400 }) };
  }
  return null;
}

// ---------- главный запуск ----------
export async function runScheduled(env, tg, nowMs = Date.now()) {
  if (env.AUTOPOST === "off" || !env.BOT_TOKEN || !env.GATE_KV) return [];
  const now = Math.floor(nowMs / 1000);
  const d = new Date(nowMs), hour = d.getUTCHours(), day = d.toISOString().slice(0, 10);
  const log = [];
  for (const slot of SLOTS) {
    if (hour < slot.hour || hour > slot.until) continue;
    const doneKey = "ap:done:" + day + ":" + slot.id, tryKey = "ap:try:" + day + ":" + slot.id;
    if (await env.GATE_KV.get(doneKey)) continue;
    const tries = parseInt((await env.GATE_KV.get(tryKey)) || "0", 10);
    if (tries >= 3) continue;
    await env.GATE_KV.put(tryKey, String(tries + 1), { expirationTtl: 3 * 86400 });
    try {
      const post = slot.id === "project" ? await projectPost(env, now) : await newsPost(env, now);
      if (!post || !post.text) { log.push(slot.id + ":nothing"); continue; }
      if (post.text.length > 4000) post.text = post.text.slice(0, 3990);
      const r = await tg(env, "sendMessage", {
        chat_id: CHANNEL, text: post.text,
        link_preview_options: { is_disabled: slot.id === "project" },
      });
      if (!r || !r.ok) { log.push(slot.id + ":tg_fail:" + (r && r.description)); continue; }
      await post.commit();
      await env.GATE_KV.put(doneKey, "1", { expirationTtl: 3 * 86400 });
      log.push(slot.id + ":posted");
    } catch (e) { log.push(slot.id + ":error:" + String(e && e.message).slice(0, 80)); }
  }
  if (log.length) await env.GATE_KV.put("ap:last", JSON.stringify({ t: now, log }), { expirationTtl: 7 * 86400 });
  return log;
}
export const _test = { LEARN, SECURITY, LORE, VERIFY, parseItems, score, countdownPost, pulsePost, projectPost, newsPost };
