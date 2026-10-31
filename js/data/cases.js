// Six real cases in which the materials of an object told the truth about
// its date. Spectra are simulated at true emission energies; heights are
// illustrative. Written for this project from the sources listed per case.

export const CASES = [
  {
    id: 'vinland',
    title: 'The map of Vinland',
    object: 'A world map in ink on parchment showing "Vinlanda Insula" west of Greenland',
    claimedBy: 'An anonymous 15th-century cartographer',
    claimed: 'c. 1440, half a century before Columbus',
    claimYear: 1440,
    claim: 'Yale announced the map in 1965 as the earliest map of the Americas, drawn from Norse knowledge. If genuine, it would rewrite the history of European cartography. The parchment itself is old: radiocarbon dating places the animal skin in the early 15th century.',
    spectrumNote: 'Scan along one of the drawn lines of the coastline.',
    composition: { Ti: 0.85, Ba: 0.18, Ca: 0.45, Fe: 0.12, K: 0.08, S: 0.05 },
    notes: [
      ['Parchment', 'Radiocarbon puts the skin around 1411–1468. The material is genuinely medieval.'],
      ['Ink', 'The black of the lines is mostly carbon, not the iron-gall ink scribes of the period normally used.'],
      ['Elemental map (2021)', 'Titanium follows every drawn line and letter, not stray grains: it is part of the ink.'],
    ],
    questions: [
      {
        prompt: 'Which element in the ink could not have been put there in 1440?',
        options: [
          { sym: 'Ca', label: 'Calcium', feedback: 'Calcium comes from the parchment, which is prepared with lime. It is expected.' },
          { sym: 'Fe', label: 'Iron', feedback: 'A little iron is normal on old parchment, and medieval iron-gall ink is full of it.' },
          { sym: 'Ti', label: 'Titanium', correct: true, feedback: 'Titanium dioxide was not manufactured as a pigment until about 1916–19, and pure anatase only from 1923. Check the second peak at 4.93 keV: barium overlaps the first titanium peak almost completely, the second one much less.' },
          { sym: '–', label: 'Nothing: it all fits 1440', feedback: 'Look again at the tall pair of peaks around 4.5 and 4.9 keV.' },
        ],
      },
      {
        prompt: 'XRF can only say "titanium". What did Raman spectroscopy add?',
        options: [
          { label: 'The titanium is in the crystal form anatase, with tiny, uniform grains like a factory-made pigment', correct: true, feedback: 'Exactly. The grains resemble an anatase white first made commercially in Norway in 1923.' },
          { label: 'The titanium is mineral dust that blew onto the map', feedback: 'Dust would sit randomly on the surface. Here titanium follows the lines of the drawing.' },
          { label: 'The ink is a medieval recipe that happens to contain titanium', feedback: 'No medieval ink recipe produces fine, uniform anatase particles.' },
        ],
      },
    ],
    reveal: {
      title: 'A 20th-century drawing on medieval parchment',
      paragraphs: [
        'Walter McCrone first found anatase in the ink in 1972–73, and Yale warned in 1974 that the map might be forged. Other studies argued back and forth for decades. In 2021 Yale\'s conservators and scientists mapped the whole sheet with XRF and settled it: titanium runs through all the lines.',
        'They also found that an old note on the back, a medieval cataloguer\'s label written in iron-gall ink, had been gone over in titanium ink so the map seemed to belong to a real 15th-century volume. Yale now catalogues the map as a forgery.',
      ],
      lesson: 'Old parchment does not make an old drawing. Date the newest material in an object, not the oldest.',
    },
    sources: [
      ['Yale News, "Analysis unlocks secret of the Vinland Map: it\'s a fake" (2021)', 'https://news.yale.edu/2021/09/01/analysis-unlocks-secret-vinland-map-its-fake'],
      ['WebExhibits, Vinland Map timeline', 'https://webexhibits.org/vinland/timeline.html'],
    ],
  },
  {
    id: 'campendonk',
    title: 'The red horses',
    object: 'Rotes Bild mit Pferden (Red Picture with Horses), oil on canvas',
    claimedBy: 'Heinrich Campendonk, of the Blue Rider circle',
    claimed: '1914',
    claimYear: 1914,
    claim: 'The title matched a real lost Campendonk listed in a 1920 gallery catalogue, and the back carried a label from the Flechtheim collection. In 2006 it sold at auction in Cologne for about €2.9 million, a record for the artist.',
    spectrumNote: 'Reading taken on a white highlight.',
    composition: { Zn: 0.9, Ti: 0.32, Ba: 0.1, Pb: 0.2, Hg: 0.12, Fe: 0.22, Ca: 0.18 },
    notes: [
      ['Provenance', 'The "Werner Jägers collection" that supposedly owned the picture cannot be traced in any record.'],
      ['Paint', 'The white is mainly zinc white, a pigment artists had used since the mid-19th century.'],
    ],
    questions: [
      {
        prompt: 'Which element dates this white after 1914?',
        options: [
          { sym: 'Zn', label: 'Zinc', feedback: 'Zinc white was sold to artists from the 1830s–40s. Expressionists used it all the time.' },
          { sym: 'Hg', label: 'Mercury', feedback: 'Mercury means vermilion, a red used for well over a thousand years.' },
          { sym: 'Ti', label: 'Titanium', correct: true, feedback: 'Titanium white was first produced as a pigment around 1916–1919, after the date on the picture. The barium peak sits almost on top of titanium\'s first peak, so a careful analyst checks titanium\'s second peak at 4.93 keV.' },
          { sym: 'Fe', label: 'Iron', feedback: 'Iron points to earth colours such as ochre, available since prehistory.' },
        ],
      },
    ],
    reveal: {
      title: 'Wolfgang Beltracchi\'s mistake',
      paragraphs: [
        'In 2008 the buyer\'s suspicions brought in the pigment specialist Nicholas Eastaugh, who found titanium white. Wolfgang Beltracchi had painted the picture himself, inventing it to fit a real lost title. He later said he ran short of zinc white and used a ready-made Dutch tube whose label did not mention that it also contained titanium.',
        'The discovery unravelled one of the largest forgery rings in postwar Europe. In 2011 a Cologne court sentenced Beltracchi to six years in prison after he confessed to 14 forgeries. The auction house was later held liable for not having the paint tested before the sale.',
      ],
      lesson: 'Even a careful forger depends on modern suppliers, and modern paint carries modern chemistry.',
    },
    sources: [
      ['The Art Newspaper, "How the detection of titanium white gave away Beltracchi" (2012)', 'https://www.theartnewspaper.com/2012/12/01/how-the-detection-of-titanium-white-gave-away-beltracchi'],
      ['CAMEO (MFA Boston), Titanium dioxide', 'https://cameo.mfa.org/wiki/Titanium_dioxide'],
      ['Staatliche Museen zu Berlin, Rathgen lab and the Beltracchi case', 'https://www.smb.museum/en/whats-new/detail/experts-from-the-rathgen-research-laboratory-involved-with-other-experts-from-the-prussian-cultural-heritage-foundation-in-exposing-forgeries-in-the-beltracchi-case/'],
    ],
  },
  {
    id: 'meegeren',
    title: 'The Vermeer sold to Göring',
    object: 'Christ and the Adulteress, oil on canvas',
    claimedBy: 'Johannes Vermeer (1632–1675)',
    claimed: '17th century',
    claimYear: 1665,
    claim: 'In 1945 Allied officers found this "Vermeer" among the art Hermann Göring had hidden in an Austrian salt mine. It had been sold to him for 1.65 million guilders. The Dutch dealer who supplied it, Han van Meegeren, was arrested for selling a national treasure to the enemy.',
    spectrumNote: 'Reading taken in the blue of a robe.',
    composition: { Pb: 1, Co: 0.24, Fe: 0.2, Hg: 0.08, Ca: 0.22 },
    notes: [
      ['X-radiograph', 'A different, older picture lies underneath. The cracks in the lower layers do not line up with the cracks on the surface.'],
      ['Microscopy of the blue', 'Mostly ultramarine, mixed with fine, even, crystalline blue particles. They are not the glassy splinters of smalt, and the cobalt comes without the potassium and arsenic that smalt usually carries.'],
      ['Solvent test', 'The paint resists alcohol and even strong acids and alkalis. It is harder than any naturally aged oil paint.'],
    ],
    questions: [
      {
        prompt: 'The XRF shows cobalt in the blue. Is that enough to prove the painting is modern?',
        options: [
          { label: 'Yes: cobalt blue was invented in 1802', feedback: 'Careful. Painters in Vermeer\'s century used smalt, a ground blue glass coloured with cobalt. Cobalt alone does not date this paint.' },
          { label: 'No: smalt, a cobalt glass, was in use in the 1600s. The particle shape and the missing potassium and arsenic show it is cobalt blue', correct: true, feedback: 'Right. Microscopy shows crystalline cobalt aluminate, the pigment Thénard introduced in 1802, not smalt.' },
          { label: 'No: cobalt is a natural trace element in lead white', feedback: 'It is not a normal impurity at this level. The cobalt is in the blue particles themselves.' },
        ],
      },
      {
        prompt: 'Why is the paint so hard?',
        options: [
          { label: 'Three centuries of drying have made it extremely hard', feedback: 'Old oil paint is tough, but strong solvents still attack it.' },
          { label: 'It was bound with a synthetic phenol-formaldehyde resin and baked hard in an oven', correct: true, feedback: 'Yes: a Bakelite-type resin, a 20th-century material, cured in an oven to imitate centuries of ageing.' },
          { label: 'It is egg tempera, which never dissolves', feedback: 'Tempera responds to solvents too, and Vermeer painted in oil.' },
        ],
      },
    ],
    reveal: {
      title: 'Van Meegeren painted it himself',
      paragraphs: [
        'To escape a treason charge, van Meegeren confessed that the "Vermeer" was his own forgery, and he painted another under supervision to prove it. A commission led by the Belgian scientist Paul Coremans found the phenolic resin in his paints, a bottle of it in his studio, and cobalt blue in Christ and the Adulteress. Before the war he had bought expensive genuine ultramarine. In wartime he could not, and cobalt blue slipped in.',
        'He was convicted of fraud in 1947 and died before serving his one-year sentence. In 1967 scientists at the Mellon Institute in Pittsburgh measured the natural radioactivity of his lead white. It showed the lead had been smelted within living memory, not three centuries earlier.',
      ],
      lesson: 'Elements are not compounds. Cobalt in a 17th-century blue is normal; the right question is which cobalt pigment it is.',
    },
    sources: [
      ['The Art Newspaper, "The source of van Meegeren\'s secret supplies exposed" (2010)', 'https://www.theartnewspaper.com/2010/10/01/the-source-of-infamous-forger-van-meegerens-secret-supplies-exposed'],
      ['Keisch et al., "Dating and authenticating works of art by measurement of natural alpha emitters", Science (1967)', 'https://pubmed.ncbi.nlm.nih.gov/17847535/'],
      ['Essential Vermeer: works wrongly attributed to Vermeer', 'https://essentialvermeer.com/fakes_thefts_school_of_delft_lost_sp/erroneously_attributed_vermeers_two.html'],
    ],
  },
  {
    id: 'matter',
    title: 'The Pollocks in a storage locker',
    object: 'Small drip paintings on board, one of 32 works in a brown-paper parcel',
    claimedBy: 'Jackson Pollock (1912–1956)',
    claimed: 'c. 1946–49, according to a handwritten label',
    claimYear: 1949,
    claim: 'Alex Matter, son of Pollock\'s friends the photographer Herbert Matter and the painter Mercedes Matter, found the parcel in a Long Island storage unit around 2002. The wrapper called the works Jackson\'s "experimental works". If genuine, they would be a major addition to the artist\'s work.',
    spectrumNote: 'Reading taken on a brownish-red passage.',
    composition: { Ti: 0.55, Zn: 0.35, Ba: 0.3, Ca: 0.3, Fe: 0.3, Cl: 0.07, Cr: 0.1, Pb: 0.15 },
    notes: [
      ['Who analysed it', "Harvard's Straus Center for Conservation, home of the Forbes Pigment Collection, examined three of the works in 2005–06."],
      ['Raman spectroscopy', 'Inside a brown paint, a red organic pigment identified as diketopyrrolopyrrole red, Pigment Red 254.'],
      ['Other paints', 'An orange paint reported as unavailable before 1971, and binders that were patented or marketed in the 1960s and 1970s. Some sit in the lowest layers.'],
    ],
    questions: [
      {
        prompt: 'XRF finds titanium, zinc and barium. Does the titanium prove these are not Pollocks?',
        options: [
          { label: 'Yes: titanium means modern paint', feedback: 'Not here. Titanium white was in wide use in paints by the 1940s.' },
          { label: 'No: titanium white was available in the 1940s. XRF finds nothing that rules out Pollock', correct: true, feedback: 'Right. Every element here was available to a New York painter in the 1940s. The evidence had to come from methods that identify organic compounds.' },
        ],
      },
      {
        prompt: 'Which result makes a Pollock attribution impossible?',
        options: [
          { label: 'Barium in the white', feedback: 'Barium sulfate was a common filler in paints throughout the 20th century.' },
          { label: 'The red pigment PR 254, which was first sold in 1986', correct: true, feedback: 'Yes. Pollock died in 1956, thirty years before this pigment reached the market.' },
          { label: 'The drip technique itself', feedback: 'Style is evidence of a sort, but anyone can drip paint. The chemistry is what sets a hard limit.' },
        ],
      },
    ],
    reveal: {
      title: 'Thirty years too late',
      paragraphs: [
        'Harvard\'s report, released in January 2007 by a team including Narayan Khandekar, found pigments and binders that did not exist in Pollock\'s lifetime, among them PR 254, a red first sold in 1986 and later famous in Ferrari\'s paint. A separate analysis for the Museum of Fine Arts, Boston, found a similar red in another work.',
        'The report stopped short of the word "forgery": science can rule out a date but cannot say whose hand held the brush. The works were shown once, in a scholarly exhibition at Boston College in 2007, and their authorship remains unresolved.',
      ],
      lesson: 'Many modern pigments are organic and invisible to XRF. Proving an anachronism sometimes takes Raman, chromatography and a reference collection, such as the Forbes pigments, to compare against.',
    },
    sources: [
      ['Harvard Crimson, "Potentially Pollock" (2007)', 'https://www.thecrimson.com/article/2007/2/22/potentially-pollock-more-than-10-years/'],
      ['NPR, report on the Harvard findings (2007)', 'https://www.npr.org/transcripts/14130095'],
      ['McMullen Museum, Pollock Matters (2007)', 'https://mcmullenmuseum.bc.edu/exhibitions/pollock/'],
    ],
  },
  {
    id: 'dalheim',
    title: 'The woman with blue teeth',
    object: 'Dental calculus (hardened tartar) from skeleton B78, a woman aged about 45–60',
    claimedBy: 'Buried at a medieval women\'s religious community at Dalheim, Germany',
    claimed: 'radiocarbon dated to 997–1162 CE',
    claimYear: 1100,
    claim: 'This case runs the other way. Nothing here is fake; the question is what the evidence tells us about a person. Researchers studying ancient diet dissolved the tartar from her teeth and saw something nobody expected: bright blue specks, more than a hundred of them, caught in layers of the calculus.',
    spectrumNote: 'Elemental analysis of the blue particles (SEM-EDS in the real study; shown here as an XRF-style spectrum).',
    composition: { Ca: 0.9, P: 0.45, S: 0.2, Si: 0.2, K: 0.1 },
    notes: [
      ['Particles', 'Deep blue grains, about 10 micrometres across, embedded at different depths: repeated exposure over years, not a single event.'],
      ['Elements', 'Sodium, aluminium, silicon and sulfur in the blue grains. No copper, no cobalt, no significant iron.'],
    ],
    questions: [
      {
        prompt: 'With no copper, cobalt or iron, which blue can it be?',
        options: [
          { label: 'Azurite', feedback: 'Azurite is a copper carbonate, so copper would be obvious.' },
          { label: 'Smalt', feedback: 'Smalt is coloured by cobalt, and it was not yet in use in Europe.' },
          { label: 'Lapis lazuli: natural ultramarine', correct: true, feedback: 'Yes. Lazurite is a sulfur-bearing sodium aluminium silicate. Raman spectroscopy confirmed it.' },
          { label: 'Egyptian blue', feedback: 'Egyptian blue is a calcium copper silicate, and it had largely vanished from use by this time.' },
        ],
      },
      {
        prompt: 'How did the most precious pigment in Europe end up in her teeth?',
        options: [
          { label: 'She ate it as medicine', feedback: 'Powdered lapis did appear in medieval remedies, but the researchers judged this unlikely.' },
          { label: 'She painted manuscripts, shaping her brush to a point with her lips', correct: true, feedback: 'This is what the researchers found most likely: small amounts swallowed over years of painting or preparing the pigment.' },
          { label: 'She kissed illuminated books in devotion', feedback: 'Devotional kissing of painted pages is documented later, and would not leave this much pigment.' },
        ],
      },
    ],
    reveal: {
      title: 'A painter history forgot',
      paragraphs: [
        'Around the year 1000, lapis lazuli came only from mines in Badakhshan, in what is now Afghanistan, and was priced like gold. Only highly skilled painters would have been trusted with it. Medieval book painters rarely signed their work, and manuscript production has long been pictured as the work of monks.',
        'The 2019 study by Anita Radini, Monica Tromp, Christina Warinner and colleagues is the earliest direct evidence of a religious woman in Germany working with ultramarine. It shows that the pigment had travelled thousands of kilometres to a small community in rural Germany, and that a woman there was entrusted with it.',
      ],
      lesson: 'Pigment science is not only for catching forgers. It can also recover the people history left out.',
    },
    sources: [
      ['Radini et al., "Medieval women\'s early involvement in manuscript production...", Science Advances (2019)', 'https://research-repository.st-andrews.ac.uk/handle/10023/19412'],
      ['National Geographic on the Dalheim discovery', 'https://www.nationalgeographic.com/culture/article/female-medieval-master-artist-revealed-dental-calculus'],
    ],
  },
  {
    id: 'montmajour',
    title: 'The painting in the attic',
    object: 'Sunset at Montmajour, oil on canvas, 73 × 93 cm',
    claimedBy: 'Vincent van Gogh',
    claimed: '4 July 1888, near Arles',
    claimYear: 1888,
    claim: 'A Norwegian collector bought it in 1908. A guest told him it was not a Van Gogh, so he put it in the attic. Decades later the Van Gogh Museum rejected it too: it is unsigned, and its style seemed off. In 2011 the owners asked again.',
    spectrumNote: 'Illustrative spectrum of a typical Van Gogh palette from Arles. The museum has not published this painting\'s full pigment list.',
    illustrative: true,
    composition: { Pb: 1, Cr: 0.35, Zn: 0.4, Co: 0.12, Fe: 0.25, Hg: 0.1, Cu: 0.18, As: 0.08, Br: 0.05, Ca: 0.12 },
    notes: [
      ['Paint', 'Pigments consistent with his Arles palette of 1888, including the colour changes typical of some of the pigments he used.'],
      ['Canvas', 'Thread counting on X-rays shows the canvas came off the same roll as The Rocks, a Van Gogh in Houston painted the same summer.'],
      ['Documents', 'On the back, the number 180 matches the 1890 inventory of his brother Theo\'s collection.'],
    ],
    questions: [
      {
        prompt: 'Is any element here impossible for a painting made in 1888?',
        options: [
          { sym: 'Cr', label: 'Chromium', feedback: 'Chrome yellow had been sold since the 1810s, and Van Gogh used a lot of it.' },
          { sym: 'Br', label: 'Bromine', feedback: 'Bromine points to eosin, a synthetic red dye of 1874 that Van Gogh used in his "geranium lake". Unstable, but period-correct.' },
          { sym: 'Zn', label: 'Zinc', feedback: 'Zinc white was common by the 1880s.' },
          { sym: '–', label: 'Nothing: every element fits 1888', correct: true, feedback: 'Correct. But no anachronism is not the same as proof. It only means the painting could be from 1888.' },
        ],
      },
      {
        prompt: 'Then what convinced the museum?',
        options: [
          { label: 'The signature', feedback: 'There isn\'t one. That was one reason it was rejected before.' },
          { label: 'Several lines of evidence together: a letter describing the scene, the inventory number, and the canvas roll', correct: true, feedback: 'Yes. Van Gogh described painting this sunset to Theo the next day, and the canvas and the inventory number matched.' },
          { label: 'The XRF result by itself', feedback: 'Materials can rule a date out. They rarely prove who the artist was.' },
        ],
      },
    ],
    reveal: {
      title: 'A Van Gogh after all',
      paragraphs: [
        'In September 2013 the Van Gogh Museum announced that Sunset at Montmajour is genuine, after two years of research. It was the first full-size canvas by the artist newly identified since 1928. In a letter to Theo of about 5 July 1888, Vincent describes painting a stony heath with small twisted oaks at sunset the day before. In another letter he judged the attempt a failure, which may explain the odd style.',
        'Here materials analysis did its quieter, more common job: showing that nothing was out of place, so that the documents and the canvas could make the positive case.',
      ],
      lesson: 'Science is better at disproving than proving. Authentication needs several independent kinds of evidence that agree.',
    },
    sources: [
      ['Cornell Chronicle, "Lost Van Gogh painting validated by canvas weave" (2013)', 'https://www.news.cornell.edu/stories/2013/10/lost-van-gogh-painting-validated-canvas-weave'],
      ['Smithsonian Magazine, how researchers determined the Van Gogh is original (2013)', 'https://www.smithsonianmag.com/smart-news/heres-how-researchers-determined-a-long-lost-van-gogh-painting-is-an-original-4990601/'],
    ],
  },
];
